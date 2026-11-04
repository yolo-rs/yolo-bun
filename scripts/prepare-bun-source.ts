// SPDX-License-Identifier: MIT OR Apache-2.0
// Plan/materialize pinned Bun source and apply the runtime patch queue.
import { mkdir, stat } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { resolvePatchFile } from "./source-guards";
import { sha256 } from "./native-hash";

type SourceLock = {
  sources: Array<{ name: string; url: string; commit: string }>;
};
type PatchQueue = {
  schemaVersion: 1;
  upstreamCommit: string;
  patches: Array<{ file: string; sha256: string }>;
};

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const lock = (await Bun.file(
  join(root, "source-lock.json"),
).json()) as SourceLock;
const queue = (await Bun.file(
  join(root, "patches", "queue.json"),
).json()) as PatchQueue;
const upstream = lock.sources.find(
  (source) => source.name === "bun-upstream-main",
);
const mirror = lock.sources.find(
  (source) => source.name === "yolo-rs-bun-mirror",
);
if (!upstream || !mirror || upstream.commit !== mirror.commit) {
  throw new Error(
    "source-lock.json must pin upstream and yolo-rs/bun to the same commit",
  );
}
if (!/^[0-9a-f]{40}$/.test(upstream.commit)) {
  throw new Error("The upstream commit must be a full lowercase Git SHA-1");
}
if (queue.schemaVersion !== 1 || queue.upstreamCommit !== upstream.commit) {
  throw new Error("patches/queue.json must target the pinned upstream commit");
}

const cliArgs = Bun.argv.slice(2);
if (cliArgs[0] === "--") cliArgs.shift();
let execute = false;
let sourceCache: string | undefined;
for (let i = 0; i < cliArgs.length; i++) {
  const arg = cliArgs[i];
  if (arg === "--execute" && !execute) execute = true;
  else if (arg === "--source-cache" && !sourceCache && cliArgs[i + 1])
    sourceCache = resolve(root, cliArgs[++i]!);
  else {
    console.error(
      "Usage: bun run source:prepare [--source-cache <git-repository>] [--execute]",
    );
    process.exit(2);
  }
}

const destination = join(root, "vendor", `bun-${upstream.commit.slice(0, 12)}`);
if (sourceCache) {
  const probe = Bun.spawnSync(
    ["git", "-C", sourceCache, "cat-file", "-t", upstream.commit],
    { stdout: "pipe", stderr: "pipe" },
  );
  if (probe.exitCode !== 0 || probe.stdout.toString().trim() !== "commit") {
    throw new Error(
      `Source cache does not contain the pinned commit: ${sourceCache}`,
    );
  }
}
const operations: Array<{ args: string[]; cwd?: string }> = sourceCache
  ? [
      { args: ["init", destination] },
      { args: ["remote", "add", "origin", mirror.url], cwd: destination },
      {
        args: ["fetch", "--depth", "1", sourceCache, upstream.commit],
        cwd: destination,
      },
      { args: ["checkout", "--detach", upstream.commit], cwd: destination },
    ]
  : [
      {
        args: [
          "clone",
          "--filter=blob:none",
          "--no-checkout",
          mirror.url,
          destination,
        ],
      },
      {
        args: ["fetch", "--depth", "1", "origin", upstream.commit],
        cwd: destination,
      },
      { args: ["checkout", "--detach", upstream.commit], cwd: destination },
    ];

for (const item of queue.patches) {
  const patchPath = await resolvePatchFile(join(root, "patches"), item.file);
  const bytes = new Uint8Array(await Bun.file(patchPath).arrayBuffer());
  const digest = sha256(bytes);
  if (digest !== item.sha256)
    throw new Error(`Patch checksum mismatch: ${item.file}`);
  operations.push({ args: ["apply", "--check", patchPath], cwd: destination });
  operations.push({ args: ["apply", patchPath], cwd: destination });
}

let destinationExists = false;
try {
  await stat(destination);
  destinationExists = true;
} catch (error) {
  if (!(error instanceof Error && "code" in error && error.code === "ENOENT"))
    throw error;
}
if (!execute) {
  console.log(
    JSON.stringify(
      {
        action: "plan",
        upstreamCommit: upstream.commit,
        sourceTree: destination,
        sourceTreeExists: destinationExists,
        executeGuard: destinationExists ? "blocked-existing-tree" : "available",
        sourceCache: sourceCache ?? null,
        patchCount: queue.patches.length,
        operations: operations.map(({ args, cwd }) => ({
          executable: "git",
          args,
          cwd,
        })),
        execute: sourceCache
          ? "bun run source:prepare -- --source-cache <git-repository> --execute"
          : "bun run source:prepare -- --execute",
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

if (destinationExists) {
  throw new Error(`Refusing to overwrite existing source tree: ${destination}`);
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
    throw new Error(
      `git ${basename(args[0]!)} failed with exit code ${result.exitCode}`,
    );
  }
}
console.log(
  `Prepared ${destination} at ${upstream.commit} with ${queue.patches.length} patches.`,
);
