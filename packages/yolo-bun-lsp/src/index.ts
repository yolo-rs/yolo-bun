#!/usr/bin/env bun
export {};

const candidates: Array<[string, string[]]> = [
  ["tsgo", ["--lsp", "--stdio"]],
  ["typescript-language-server", ["--stdio"]],
];

for (const [name, args] of candidates) {
  const executable = Bun.which(name);
  if (!executable) continue;
  const child = Bun.spawn([executable, ...args], {
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  });
  process.exit(await child.exited);
}

console.error(
  "yolo-bun-lsp: install tsgo or typescript-language-server to provide the TypeScript LSP",
);
process.exit(127);
