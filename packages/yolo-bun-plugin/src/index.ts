// SPDX-License-Identifier: MIT OR Apache-2.0
import { fileURLToPath } from "node:url";
import type { BunPlugin } from "bun";
import {
  BoqServerEngine,
  createSignal,
  generateM3CssVariables,
  GOOGLE_APIS_CATALOG_2026,
  GOOGLE_M3_DARK_TOKENS,
  GOOGLE_XSSI_PREFIX,
  GoogleApisClient,
  googleApisPlugin,
  type BatchExecuteRpcCall,
  type GoogleApisClientConfig,
  type GoogleM3ColorTokens,
  type GoogleServiceDescriptor,
  type WizGlobalDataConfig,
  type WizSignal,
} from "./google-apis.ts";
import {
  auditTypeScriptSourceForGts,
  googleStyleguidePlugin,
  loadGoogleStyleguide2026,
  type GoogleStyleguide2026Schema,
  type GtsAuditResult,
} from "./google-styleguide.ts";
import {
  auditLighthouse,
  lighthousePlugin,
  type LighthouseAuditInput,
  type LighthouseAuditReport,
} from "./lighthouse.ts";
import {
  buildModernWebSecurityHeaders,
  loadMergedStandardsSchemas,
  MODERN_WEB_GUIDELINES_2026,
  modernWebGuidelinesPlugin,
  WEB_GUIDELINES_CATALOG_2026,
  type WebGuidelineEntry,
} from "./modern-web-guidelines.ts";
import {
  parseReadmeChromium,
  thirdPartyPlugin,
  verifyThirdPartyDeps,
  type ReadmeChromiumMetadata,
  type ThirdPartyVerificationReport,
} from "./third-party-manager.ts";
import {
  createChromiumFriendlyFetchHandler,
  generateWebVitalsObserverScript,
  renderChromiumFriendlyHtmlDocument,
  webVitalsPlugin,
  type ChromiumFriendlyAppOptions,
} from "./web-vitals.ts";

const catalogPath = fileURLToPath(
  new URL("../../../catalog/projects.json", import.meta.url),
);
const docsIndexPath = fileURLToPath(
  new URL("../../../catalog/bun-com-index.json", import.meta.url),
);

export const yoloBunCatalogPlugin: BunPlugin = {
  name: "yolo-bun-unified-chromium-suite",
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

    lighthousePlugin.setup(build);
    modernWebGuidelinesPlugin.setup(build);
    webVitalsPlugin.setup(build);
    googleStyleguidePlugin.setup(build);
    googleApisPlugin.setup(build);
    thirdPartyPlugin.setup(build);
  },
};

export function registerYoloBunChromiumPlugins(): void {
  Bun.plugin(yoloBunCatalogPlugin);
}

export {
  auditLighthouse,
  auditTypeScriptSourceForGts,
  BoqServerEngine,
  buildModernWebSecurityHeaders,
  createChromiumFriendlyFetchHandler,
  createSignal,
  generateM3CssVariables,
  generateWebVitalsObserverScript,
  GOOGLE_APIS_CATALOG_2026,
  GOOGLE_M3_DARK_TOKENS,
  GOOGLE_XSSI_PREFIX,
  GoogleApisClient,
  googleApisPlugin,
  googleStyleguidePlugin,
  lighthousePlugin,
  loadGoogleStyleguide2026,
  loadMergedStandardsSchemas,
  MODERN_WEB_GUIDELINES_2026,
  modernWebGuidelinesPlugin,
  parseReadmeChromium,
  renderChromiumFriendlyHtmlDocument,
  thirdPartyPlugin,
  verifyThirdPartyDeps,
  WEB_GUIDELINES_CATALOG_2026,
  webVitalsPlugin,
  type BatchExecuteRpcCall,
  type ChromiumFriendlyAppOptions,
  type GoogleApisClientConfig,
  type GoogleM3ColorTokens,
  type GoogleServiceDescriptor,
  type GoogleStyleguide2026Schema,
  type GtsAuditResult,
  type LighthouseAuditInput,
  type LighthouseAuditReport,
  type ReadmeChromiumMetadata,
  type ThirdPartyVerificationReport,
  type WebGuidelineEntry,
  type WizGlobalDataConfig,
  type WizSignal,
};
