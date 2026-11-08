// SPDX-License-Identifier: MIT OR Apache-2.0
declare module "yolo-bun:catalog" {
  const projects: unknown[];
  export default projects;
}

declare module "yolo-bun:docs" {
  const docsIndex: Record<string, unknown>;
  export default docsIndex;
}

declare module "yolo-bun:lighthouse" {
  const config: {
    readonly lighthouseVersion: string;
    readonly requiredCategories: {
      readonly performance: number;
      readonly accessibility: number;
      readonly bestPractices: number;
      readonly seo: number;
    };
    readonly audits: readonly string[];
  };
  export default config;
}

declare module "yolo-bun:web-guidelines" {
  const webGuidelines: {
    readonly guidelines: Record<string, unknown>;
    readonly catalog: readonly Record<string, unknown>[];
    readonly schemas: Record<string, unknown>;
  };
  export default webGuidelines;
}

declare module "yolo-bun:web-vitals" {
  const webVitals: {
    readonly budget: {
      readonly lcpMaxMs: number;
      readonly inpGoodMaxMs: number;
      readonly inpEliteMaxMs: number;
      readonly clsMax: number;
      readonly ttfbMaxMs: number;
      readonly fcpMaxMs: number;
    };
    readonly cachePolicies: Record<string, unknown>;
    readonly speculationRules: Record<string, unknown>;
    readonly observerSnippet: string;
  };
  export default webVitals;
}

declare module "yolo-bun:google-styleguide" {
  const googleStyleguide: {
    readonly version: string;
    readonly upstreams: Record<string, string>;
    readonly rust: Record<string, unknown>;
    readonly typescript: Record<string, unknown>;
    readonly cppChromium: Record<string, unknown>;
    readonly aospAndroid17: Record<string, unknown>;
  };
  export default googleStyleguide;
}

declare module "yolo-bun:googleapis" {
  const googleApis: {
    readonly projectId: string;
    readonly projectNumber: string;
    readonly region: string;
    readonly services: readonly Record<string, unknown>[];
  };
  export default googleApis;
}

declare module "yolo-bun:google-stack" {
  const googleStack: {
    readonly architecture: string;
    readonly xssiPrefix: string;
    readonly m3DarkTokens: Record<string, string>;
    readonly m3CssVariables: string;
  };
  export default googleStack;
}

declare module "yolo-bun:third-party" {
  const thirdPartyReport: {
    readonly depsFileExists: boolean;
    readonly depsCount: number;
    readonly packages: readonly Record<string, unknown>[];
    readonly agplViolations: readonly string[];
    readonly missingFields: readonly Record<string, unknown>[];
    readonly valid: boolean;
  };
  export default thirdPartyReport;
}

declare module "yolo-bun:chromium-toolkit" {
  const chromiumToolkit: {
    readonly collaboration: Record<string, unknown>;
    readonly patches: readonly Record<string, unknown>[];
    readonly dashboardFeatures: readonly Record<string, unknown>[];
    readonly guidanceRules: readonly Record<string, unknown>[];
    readonly chromiumOs: Record<string, unknown>;
  };
  export default chromiumToolkit;
}

declare module "yolo-bun:depot-tools" {
  const depotTools: {
    readonly depotToolsDir: string;
    readonly chromiumSrcDir: string;
    readonly isDepotToolsPresent: boolean;
    readonly isChromiumSrcPresent: boolean;
    readonly binaries: Record<
      string,
      { readonly path: string; readonly exists: boolean }
    >;
  };
  export default depotTools;
}

declare module "yolo-bun:chromium-dashboard" {
  const chromiumDashboard: {
    readonly dashboardUrl: string;
    readonly repoUrl: string;
    readonly features: readonly Record<string, unknown>[];
  };
  export default chromiumDashboard;
}

declare module "yolo-bun:modern-web-guidance" {
  const modernWebGuidance: {
    readonly repoUrl: string;
    readonly rules: readonly Record<string, unknown>[];
  };
  export default modernWebGuidance;
}

declare module "yolo-bun:chromiumos" {
  const chromiumOs: {
    readonly milestone: string;
    readonly board: string;
    readonly kernel: string;
    readonly sandbox: readonly string[];
    readonly androidContainer: string;
    readonly buildCommands: readonly string[];
  };
  export default chromiumOs;
}

declare module "yolo-bun:src-orchestrator" {
  const srcOrchestration: {
    readonly rootDir: string;
    readonly scannedAt: string;
    readonly totalPillars: number;
    readonly gitReposCount: number;
    readonly bunWorkspacesCount: number;
    readonly cargoWorkspacesCount: number;
    readonly bazelWorkspacesCount: number;
    readonly depotToolsReady: boolean;
    readonly chromiumSrcReady: boolean;
    readonly pillars: readonly Record<string, unknown>[];
  };
  export default srcOrchestration;
}
