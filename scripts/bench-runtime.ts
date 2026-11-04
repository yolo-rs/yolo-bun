// SPDX-License-Identifier: MIT OR Apache-2.0
// Compare explicit Bun executables on the same host. This is a narrow baseline,
// not a claim about sustained HTTP throughput, memory, installation, or all workloads.
import { createHash } from "node:crypto";
import { cpus, platform, arch, release } from "node:os";
import { resolve } from "node:path";

const args = process.argv.slice(2);
function option(name: string): string | undefined {
  const index = args.indexOf(name);
  return index < 0 ? undefined : args[index + 1];
}
const baseline = option("--baseline");
const candidate = option("--candidate");
const runs = Number(option("--runs") ?? 15);
const output = option("--out");
if (!baseline || !candidate || !Number.isInteger(runs) || runs < 3 || runs > 1000) {
  console.error("Usage: bun run bench:runtime --baseline <bun> --candidate <bun> [--runs 3..1000] [--out receipt.json]");
  process.exit(2);
}

const binaries = { baseline: resolve(baseline), candidate: resolve(candidate) };
const workloads = {
  startup: { code: 'process.stdout.write("ready")', expected: "ready" },
  compute: { code: 'let x=0; for(let i=0;i<2000000;i++) x=(x+i)%1000000007; process.stdout.write(String(x))', expected: "998986007" },
  http_loopback: { code: 'const server=Bun.serve({hostname:"127.0.0.1",port:0,fetch(){return new Response("ok")}}); let count=0; try { for(let i=0;i<50;i++){const response=await fetch(`http://127.0.0.1:${server.port}/`); if(response.status===200 && await response.text()==="ok") count++} } finally {server.stop(true)} process.stdout.write(String(count))', expected: "50" },
};

function invoke(binary: string, argv: string[]): { stdout: string; elapsedMs: number } {
  const start = process.hrtime.bigint();
  const result = Bun.spawnSync([binary, ...argv], { stdout: "pipe", stderr: "pipe" });
  const elapsedMs = Number(process.hrtime.bigint() - start) / 1e6;
  if (result.exitCode !== 0) throw new Error(`${binary} exited ${result.exitCode}: ${result.stderr.toString().slice(0, 2000)}`);
  return { stdout: result.stdout.toString(), elapsedMs };
}

async function identity(binary: string) {
  const bytes = await Bun.file(binary).arrayBuffer();
  return { path: binary, sha256: createHash("sha256").update(new Uint8Array(bytes)).digest("hex"), version: invoke(binary, ["--version"]).stdout.trim() };
}
function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle]! : (sorted[middle - 1]! + sorted[middle]!) / 2;
}

const identities = { baseline: await identity(binaries.baseline), candidate: await identity(binaries.candidate) };
const results: Record<string, unknown> = {};
for (const [name, workload] of Object.entries(workloads)) {
  const samples = { baseline: [] as number[], candidate: [] as number[] };
  for (const binary of Object.values(binaries)) {
    const warmup = invoke(binary, ["-e", workload.code]);
    if (warmup.stdout !== workload.expected) throw new Error(`${name}: unexpected output from ${binary}`);
  }
  for (let i = 0; i < runs; i++) {
    const order: (keyof typeof binaries)[] = i % 2 ? ["candidate", "baseline"] : ["baseline", "candidate"];
    for (const key of order) {
      const sample = invoke(binaries[key], ["-e", workload.code]);
      if (sample.stdout !== workload.expected) throw new Error(`${name}: unexpected output from ${key}`);
      samples[key].push(sample.elapsedMs);
    }
  }
  const baselineMedianMs = median(samples.baseline);
  const candidateMedianMs = median(samples.candidate);
  results[name] = { codeSha256: createHash("sha256").update(workload.code).digest("hex"), samples, baselineMedianMs, candidateMedianMs, candidateToBaseline: candidateMedianMs / baselineMedianMs };
}
const runnerBytes = await Bun.file(import.meta.path).arrayBuffer();
const receipt = { schemaVersion: 1, generatedAt: new Date().toISOString(), runnerSha256: createHash("sha256").update(new Uint8Array(runnerBytes)).digest("hex"), host: { platform: platform(), arch: arch(), release: release(), cpu: cpus()[0]?.model ?? "unknown" }, binaries: identities, runs, workloads: results, scope: "Process startup, JS compute and 50 sequential loopback HTTP requests including startup; no sustained throughput or overall runtime parity is implied." };
const json = JSON.stringify(receipt, null, 2) + "\n";
if (output) await Bun.write(output, json);
else process.stdout.write(json);
