import { fileURLToPath } from "node:url";

const catalogPath = fileURLToPath(new URL("../../../catalog/projects.json", import.meta.url));

export const yoloBunCatalogPlugin = {
  name: "yolo-bun-project-catalog",
  setup(build: any) {
    build.onResolve({ filter: /^yolo-bun:catalog$/ }, () => ({ path: "catalog", namespace: "yolo-bun" }));
    build.onLoad({ filter: /.*/, namespace: "yolo-bun" }, async () => {
      const catalog = await Bun.file(catalogPath).json();
      return {
        contents: `const projects = ${JSON.stringify(catalog.projects)};\nexport default projects;\n`,
        loader: "js",
      };
    });
  },
};
