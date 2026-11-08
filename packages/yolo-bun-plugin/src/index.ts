import { fileURLToPath } from "node:url";
import type { BunPlugin } from "bun";

const catalogPath = fileURLToPath(
  new URL("../../../catalog/projects.json", import.meta.url),
);
const docsIndexPath = fileURLToPath(
  new URL("../../../catalog/bun-com-index.json", import.meta.url),
);

export const yoloBunCatalogPlugin: BunPlugin = {
  name: "yolo-bun-project-catalog",
  setup(build) {
    build.onResolve({ filter: /^yolo-bun:catalog$/ }, () => ({
      path: "catalog",
      namespace: "yolo-bun",
    }));
    build.onResolve({ filter: /^yolo-bun:docs$/ }, () => ({
      path: "docs",
      namespace: "yolo-bun",
    }));
    build.onLoad({ filter: /^catalog$/, namespace: "yolo-bun" }, async () => {
      const catalog = await Bun.file(catalogPath).json();
      return {
        contents: `const projects = ${JSON.stringify(catalog.projects)};\nexport default projects;\n`,
        loader: "js",
      };
    });
    build.onLoad({ filter: /^docs$/, namespace: "yolo-bun" }, async () => {
      const docsIndex = await Bun.file(docsIndexPath).json();
      return {
        contents: `const docsIndex = ${JSON.stringify(docsIndex)};\nexport default docsIndex;\n`,
        loader: "js",
      };
    });
  },
};
