import { fileURLToPath } from "node:url";
import type { BunPlugin } from "bun";

const catalogPath = fileURLToPath(
  new URL("../../../catalog/projects.json", import.meta.url),
);

export const yoloBunCatalogPlugin: BunPlugin = {
  name: "yolo-bun-project-catalog",
  setup(build) {
    build.onResolve({ filter: /^yolo-bun:catalog$/ }, () => ({
      path: "catalog",
      namespace: "yolo-bun",
    }));
    build.onLoad({ filter: /.*/, namespace: "yolo-bun" }, async () => {
      const catalog = await Bun.file(catalogPath).json();
      return {
        contents: `const projects = ${JSON.stringify(catalog.projects)};\nexport default projects;\n`,
        loader: "js",
      };
    });
  },
};
