// SPDX-License-Identifier: MIT OR Apache-2.0
// Run Bun's AOT compatibility analysis over every first-party TS entrypoint.
const roots = [
  "scripts",
  "packages/yolo-bun-plugin/src",
  "packages/bun-loaders/src",
  "packages/package-converter/src",
];
const entrypoints = roots.flatMap((root) =>
  Array.from(
    new Bun.Glob("**/*.ts").scanSync({ cwd: root }),
    (file) => `${root}/${file}`,
  ),
);

if (entrypoints.length === 0) {
  throw new Error(
    "No TypeScript entrypoints found under scripts/ or packages/",
  );
}

const result = Bun.spawnSync(
  ["bun", "check", "--no-script", "--aot", ...entrypoints],
  { stdin: "inherit", stdout: "inherit", stderr: "inherit" },
);
process.exitCode = result.exitCode ?? 1;
