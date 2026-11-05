// SPDX-License-Identifier: Apache-2.0
// Optional aliases for Bun's Windows APIs, registered explicitly with Bun.plugin().
import type { BunPlugin } from "bun";
import { fileURLToPath } from "node:url";

function builtinAvailable(specifier: string): boolean {
  try {
    Bun.resolveSync(specifier, import.meta.dir);
    return true;
  } catch {
    return false;
  }
}

const aliases = {
  "bun:windows": fileURLToPath(new URL("./fork/windows.ts", import.meta.url)),
  "bun:winrt": fileURLToPath(new URL("./fork/winrt.ts", import.meta.url)),
} as const;

const forward = (path: string) => {
  const modulePath = JSON.stringify(path.replaceAll("\\", "/"));
  return `export * from ${modulePath};\nexport { default } from ${modulePath};\n`;
};

const plugin: BunPlugin = {
  name: "@yolo/windows",
  target: "bun",
  setup(build) {
    for (const [specifier, path] of Object.entries(aliases)) {
      if (builtinAvailable(specifier)) continue;
      build.module(specifier, () => ({
        contents: forward(path),
        loader: "js",
      }));
    }
  },
};

export default plugin;
