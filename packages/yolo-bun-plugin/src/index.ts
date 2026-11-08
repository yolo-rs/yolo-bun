import { fileURLToPath } from "node:url";
import type { BunPlugin } from "bun";
import {
  CORE_WEB_VITALS_BUDGET_2026,
  VERCEL_CACHE_POLICIES,
  generateSpeculationRules,
} from "../../../scripts/web-standards-vitals.ts";

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
    build.onResolve({ filter: /^yolo-bun:web-vitals$/ }, () => ({
      path: "web-vitals",
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
    build.onLoad({ filter: /^web-vitals$/, namespace: "yolo-bun" }, () => {
      const payload = {
        budget: CORE_WEB_VITALS_BUDGET_2026,
        cachePolicies: VERCEL_CACHE_POLICIES,
        speculationRules: generateSpeculationRules(),
      };
      return {
        contents: `const webVitals = ${JSON.stringify(payload)};\nexport default webVitals;\n`,
        loader: "js",
      };
    });
  },
};
