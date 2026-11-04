// SPDX-License-Identifier: MIT OR Apache-2.0
// Materialize a pinned, disposable Bun source tree and apply the reviewed patch queue.
import { createHash } from "node:crypto";
import { mkdir, stat } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

type SourceLock = {
  sources: Array<{ name: string; url: string; commit: string }>;
};
type PatchQueue = {
  schemaVersion: 1;
  upstreamCommit: string;
  patches: Array<{ file: string; sha256: string }>;
};

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const lock = (await Bun.file(join(root, "source-lock.json")).json()) as SourceLock;
const queue = (await Bun.file(join(root, "patches", "queue.json")).json()) as PatchQueue;
const upstream = lock.sources.find((source) => source.name === "bun-upstream-main");
const mirror = lock.sources.find((source) => source.name === "yolo-rs-bun-mirror");
if (!upstream || !mirror || upstream.commit !== mirror.commit) {
  throw new Error("source-lock.json must pin upstream and yolo-rs/bun to the same commit");
}
if (queue.schemaVersion !== 1 || queue.upstreamCommit !== upstream.commit) {
  throw new Error("patches/queue.json must target the pinned upstream commit");
}

const cliArgs = process.argv.slice(2);
if (cliArgs[0] === "--") cliArgs.shift();
const execute = cliArgs.includes("--execute");
if (cliArgs.some((arg) => arg !== "--execute")) {
  console.error("Usage: bun run source:prepare [--execute]");
  process.exit(2);
}

const destination = join(root, "vendor", `bun-${upstream.commit.slice(0, 12)}`);
const operations: Array<{ args: string[]; cwd?: string }> = [
  {
    args: ["clone", "--filter=blob:none", "--no-checkout", mirror.url, destination],
  },
  { args: ["fetch", "--depth", "1", "origin", upstream.commit], cwd: destination },
  { args: ["checkout", "--detach", upstream.commit], cwd: destination },
];

for (const item of queue.patches) {
  const patchPath = resolve(root, "patches", item.file);
  if (!patchPath.startsWith(resolve(root, "patches") + "/") && !patchPath.startsWith(resolve(root, "patches") + "\\")) {
    throw new Error(`Patch path escapes patches/: ${item.file}`);
  }
  const bytes = new Uint8Array(await Bun.file(patchPath).arrayBuffer());
  const digest = createHash("sha256").update(bytes).digest("hex");
  if (digest !== item.sha256) throw new Error(`Patch checksum mismatch: ${item.file}`);
  operations.push({ args: ["apply", "--check", patchPath], cwd: destination });
  operations.push({ args: ["apply", patchPath], cwd: destination });
}

let destinationExists = false;
try {
  await stat(destination);
  destinationExists = true;
} catch (error) {
  if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
}
if (destinationExists) {
  throw new Error(`Refusing to overwrite existing source tree: ${destination}`);
}

if (!execute) {
  console.log(
    JSON.stringify(
      {
        action: "plan",
        upstreamCommit: upstream.commit,
        sourceTree: destination,
        patchCount: queue.patches.length,
        operations: operations.map(({ args, cwd }) => ({ executable: "git", args, cwd })),
        execute: "bun run source:prepare -- --execute",
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

await mkdir(dirname(destination), { recursive: true });
for (const { args, cwd } of operations) {
  const result = Bun.spawnSync(["git", ...args], {
    cwd,
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  });
  if (result.exitCode !== 0) {
    throw new Error(`git ${basename(args[0]!)} failed with exit code ${result.exitCode}`);
  }
}
console.log(`Prepared ${destination} at ${upstream.commit} with ${queue.patches.length} patches.`);
