// SPDX-License-Identifier: MIT OR Apache-2.0
import { fileURLToPath } from "node:url";
import type { BunPlugin } from "bun";
import {
  CHROMIUM_DASHBOARD_FEATURES_2026,
  CHROMIUM_GITHUB_COLLABORATION_SPEC,
  CHROMIUM_OS_SOVEREIGN_PROFILE,
  chromiumToolkitPlugin,
  HELIUM_BRAVE_CHROMIUM_PATCHES,
  inspectDepotTools,
  MODERN_WEB_GUIDANCE_RULES_2026,
  orchestrateSrcTree,
  type ChromiumDashboardFeature,
  type ChromiumGitHubCollaborationSpec,
  type ChromiumOsProfile,
  type DepotToolsInspection,
  type HeliumBravePatchRule,
  type ModernWebGuidanceRule,
  type SrcPillarInventoryEntry,
  type SrcRecursiveOrchestrationReport,
} from "./chromium-toolkit.ts";
import {
  auditNodeBunV8BoringSslCoAbi,
  buildGitImportPatchesPlan,
  CEF_AUTOMATE_WORKFLOW_SPEC,
  compareChromiumVersions,
  computeWorktreeUpstreamHeadRef,
  createEvmConfigProfile,
  ELECTRON_GN_ARGS_HIERARCHY,
  ELECTRON_GN_CHECK_TARGETS,
  ELECTRON_PATCH_CONFIG_TARGETS,
  electronWorkflowPlugin,
  executeElectronBuildToolsCommand,
  injectPatchLocationMetadata,
  mergeEvmConfigs,
  normalizeExportedPatchContent,
  planChromiumRollerUpdate,
  writeElectronPatchesConfig,
  type CefAutomateWorkflowSpec,
  type ChromiumDepsRollReport,
  type ChromiumReleaseChannelMap,
  type CoAbiAuditSpec,
  type ElectronPatchTarget,
  type EvmConfigProfile,
  type EvmProfileType,
  type GitImportPatchesOptions,
  type GitImportPatchesResult,
  type PatchMetadataEntry,
} from "./electron-workflow.ts";
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
    chromiumToolkitPlugin.setup(build);
    electronWorkflowPlugin.setup(build);
  },
};

export function registerYoloBunChromiumPlugins(): void {
  Bun.plugin(yoloBunCatalogPlugin);
}

export {
  auditLighthouse,
  auditNodeBunV8BoringSslCoAbi,
  auditTypeScriptSourceForGts,
  BoqServerEngine,
  buildGitImportPatchesPlan,
  buildModernWebSecurityHeaders,
  CEF_AUTOMATE_WORKFLOW_SPEC,
  CHROMIUM_DASHBOARD_FEATURES_2026,
  CHROMIUM_GITHUB_COLLABORATION_SPEC,
  CHROMIUM_OS_SOVEREIGN_PROFILE,
  chromiumToolkitPlugin,
  compareChromiumVersions,
  computeWorktreeUpstreamHeadRef,
  createChromiumFriendlyFetchHandler,
  createEvmConfigProfile,
  createSignal,
  ELECTRON_GN_ARGS_HIERARCHY,
  ELECTRON_GN_CHECK_TARGETS,
  ELECTRON_PATCH_CONFIG_TARGETS,
  electronWorkflowPlugin,
  executeElectronBuildToolsCommand,
  generateM3CssVariables,
  generateWebVitalsObserverScript,
  GOOGLE_APIS_CATALOG_2026,
  GOOGLE_M3_DARK_TOKENS,
  GOOGLE_XSSI_PREFIX,
  GoogleApisClient,
  googleApisPlugin,
  googleStyleguidePlugin,
  HELIUM_BRAVE_CHROMIUM_PATCHES,
  injectPatchLocationMetadata,
  inspectDepotTools,
  lighthousePlugin,
  loadGoogleStyleguide2026,
  loadMergedStandardsSchemas,
  mergeEvmConfigs,
  MODERN_WEB_GUIDANCE_RULES_2026,
  MODERN_WEB_GUIDELINES_2026,
  modernWebGuidelinesPlugin,
  normalizeExportedPatchContent,
  orchestrateSrcTree,
  parseReadmeChromium,
  planChromiumRollerUpdate,
  renderChromiumFriendlyHtmlDocument,
  thirdPartyPlugin,
  verifyThirdPartyDeps,
  WEB_GUIDELINES_CATALOG_2026,
  webVitalsPlugin,
  writeElectronPatchesConfig,
  type BatchExecuteRpcCall,
  type CefAutomateWorkflowSpec,
  type ChromiumDashboardFeature,
  type ChromiumDepsRollReport,
  type ChromiumFriendlyAppOptions,
  type ChromiumGitHubCollaborationSpec,
  type ChromiumOsProfile,
  type ChromiumReleaseChannelMap,
  type CoAbiAuditSpec,
  type DepotToolsInspection,
  type ElectronPatchTarget,
  type EvmConfigProfile,
  type EvmProfileType,
  type GitImportPatchesOptions,
  type GitImportPatchesResult,
  type GoogleApisClientConfig,
  type GoogleM3ColorTokens,
  type GoogleServiceDescriptor,
  type GoogleStyleguide2026Schema,
  type GtsAuditResult,
  type HeliumBravePatchRule,
  type LighthouseAuditInput,
  type LighthouseAuditReport,
  type ModernWebGuidanceRule,
  type PatchMetadataEntry,
  type ReadmeChromiumMetadata,
  type SrcPillarInventoryEntry,
  type SrcRecursiveOrchestrationReport,
  type ThirdPartyVerificationReport,
  type WebGuidelineEntry,
  type WizGlobalDataConfig,
  type WizSignal,
};
