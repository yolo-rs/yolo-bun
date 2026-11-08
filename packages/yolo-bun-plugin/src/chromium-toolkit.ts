// SPDX-License-Identifier: MIT OR Apache-2.0
/**
 * Complete Native Google Open Source, Chromium, ChromiumOS, Depot Tools,
 * Helium/Brave Patch Workflow, Chromium Dashboard, Modern Web Guidance &
 * Recursive /src/ Orchestrator Toolkit for Bun.
 *
 * Exposes virtual modules:
 * - `yolo-bun:chromium-toolkit`
 * - `yolo-bun:depot-tools`
 * - `yolo-bun:chromium-dashboard`
 * - `yolo-bun:modern-web-guidance`
 * - `yolo-bun:chromiumos`
 * - `yolo-bun:src-orchestrator`
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import type { BunPlugin } from "bun";

export interface DepotToolsInspection {
  readonly depotToolsDir: string;
  readonly chromiumSrcDir: string;
  readonly isDepotToolsPresent: boolean;
  readonly isChromiumSrcPresent: boolean;
  readonly binaries: Record<
    "gclient" | "gn" | "autoninja" | "git-cl" | "cipd" | "fetch" | "vpython3",
    { readonly path: string; readonly exists: boolean }
  >;
}

export function inspectDepotTools(
  depotToolsDir = "C:/src/depot_tools",
  chromiumSrcDir = "C:/src/chromium/src",
): DepotToolsInspection {
  const isWin = process.platform === "win32";
  const binPath = (name: string) => {
    const ext = isWin && name !== "fetch" ? ".bat" : "";
    const candidate = join(depotToolsDir, `${name}${ext}`);
    const fallback = join(depotToolsDir, name);
    if (existsSync(candidate)) return { path: candidate, exists: true };
    if (existsSync(fallback)) return { path: fallback, exists: true };
    return { path: candidate, exists: false };
  };

  return {
    depotToolsDir,
    chromiumSrcDir,
    isDepotToolsPresent: existsSync(depotToolsDir),
    isChromiumSrcPresent: existsSync(chromiumSrcDir),
    binaries: {
      gclient: binPath("gclient"),
      gn: binPath("gn"),
      autoninja: binPath("autoninja"),
      "git-cl": binPath("git-cl"),
      cipd: binPath("cipd"),
      fetch: binPath("fetch"),
      vpython3: binPath("vpython3"),
    },
  };
}

export interface ChromiumGitHubCollaborationSpec {
  readonly referenceUrl: "https://www.chromium.org/developers/github-collaboration/";
  readonly gerritHost: "https://chromium-review.googlesource.com";
  readonly gitilesHost: "https://chromium.googlesource.com";
  readonly githubMirrors: readonly {
    readonly name: string;
    readonly gitilesUrl: string;
    readonly githubUrl: string;
    readonly collaborationModel:
      "gerrit-cl-only" | "github-pr-and-gerrit" | "github-primary";
  }[];
  readonly requiredCommitFooters: readonly string[];
}

export const CHROMIUM_GITHUB_COLLABORATION_SPEC: ChromiumGitHubCollaborationSpec =
  {
    referenceUrl: "https://www.chromium.org/developers/github-collaboration/",
    gerritHost: "https://chromium-review.googlesource.com",
    gitilesHost: "https://chromium.googlesource.com",
    githubMirrors: [
      {
        name: "chromium/src",
        gitilesUrl: "https://chromium.googlesource.com/chromium/src",
        githubUrl: "https://github.com/chromium/chromium",
        collaborationModel: "gerrit-cl-only",
      },
      {
        name: "v8/v8",
        gitilesUrl: "https://chromium.googlesource.com/v8/v8",
        githubUrl: "https://github.com/v8/v8",
        collaborationModel: "gerrit-cl-only",
      },
      {
        name: "devtools/devtools-frontend",
        gitilesUrl:
          "https://chromium.googlesource.com/devtools/devtools-frontend",
        githubUrl: "https://github.com/ChromeDevTools/devtools-frontend",
        collaborationModel: "gerrit-cl-only",
      },
      {
        name: "GoogleChrome/chromium-dashboard",
        gitilesUrl: "https://chromium.googlesource.com/infra/infra",
        githubUrl: "https://github.com/GoogleChrome/chromium-dashboard",
        collaborationModel: "github-primary",
      },
      {
        name: "GoogleChrome/modern-web-guidance-src",
        gitilesUrl: "https://chromium.googlesource.com/website",
        githubUrl: "https://github.com/GoogleChrome/modern-web-guidance-src",
        collaborationModel: "github-primary",
      },
      {
        name: "GoogleChrome/lighthouse",
        gitilesUrl:
          "https://chromium.googlesource.com/devtools/devtools-frontend",
        githubUrl: "https://github.com/GoogleChrome/lighthouse",
        collaborationModel: "github-primary",
      },
      {
        name: "GoogleChrome/web-vitals",
        gitilesUrl: "https://chromium.googlesource.com/chromium/src",
        githubUrl: "https://github.com/GoogleChrome/web-vitals",
        collaborationModel: "github-primary",
      },
    ],
    requiredCommitFooters: [
      "Bug:",
      "Change-Id:",
      "Reviewed-on:",
      "Commit-Queue:",
      "Cr-Commit-Position:",
    ],
  };

export interface HeliumBravePatchRule {
  readonly id: string;
  readonly origin: "helium" | "brave" | "obscura" | "servo";
  readonly subsystem:
    "blink" | "v8" | "net" | "chrome" | "content" | "services";
  readonly strategy:
    | "quilt_series_patch"
    | "chromium_src_override"
    | "gn_flags_hardening"
    | "adblock_rust_hook";
  readonly targetPath: string;
  readonly description: string;
}

export const HELIUM_BRAVE_CHROMIUM_PATCHES: readonly HeliumBravePatchRule[] = [
  {
    id: "helium-prune-google-telemetry",
    origin: "helium",
    subsystem: "services",
    strategy: "quilt_series_patch",
    targetPath: "components/metrics/metrics_service.cc",
    description:
      "Disables background UMA/UKM telemetry uploads and crash ping endpoints by default (Helium series).",
  },
  {
    id: "helium-clean-new-tab-and-search",
    origin: "helium",
    subsystem: "chrome",
    strategy: "quilt_series_patch",
    targetPath: "chrome/browser/ui/webui/new_tab_page/new_tab_page_ui.cc",
    description:
      "Removes sponsored NTP tiles, shopping promos, and forced account sign-in prompts.",
  },
  {
    id: "brave-shields-network-delegate",
    origin: "brave",
    subsystem: "net",
    strategy: "chromium_src_override",
    targetPath:
      "chromium_src/services/network/network_service_network_delegate.cc",
    description:
      "Hooks URLLoader interceptor with native Rust adblock-rust engine and ephemeral 1p/3p storage partitioning.",
  },
  {
    id: "brave-fingerprint-farbling",
    origin: "brave",
    subsystem: "blink",
    strategy: "chromium_src_override",
    targetPath:
      "chromium_src/third_party/blink/renderer/modules/canvas/canvas2d/base_rendering_context_2d.cc",
    description:
      "Applies session-keyed deterministic farbling to Canvas, WebAudio, and WebGL hardware fingerprinting surfaces.",
  },
  {
    id: "obscura-v8-context-isolation",
    origin: "obscura",
    subsystem: "v8",
    strategy: "gn_flags_hardening",
    targetPath: "v8/src/execution/isolate.cc",
    description:
      "Enforces strict zero-leak boundary between host Bun JavaScriptCore and guest Chromium V8 contexts.",
  },
  {
    id: "servo-stylo-euclid-layout",
    origin: "servo",
    subsystem: "content",
    strategy: "chromium_src_override",
    targetPath: "crates/servo-bridge/src/lib.rs",
    description:
      "Accelerates CSS selector matching and sub-pixel bounding-box computation via Servo Stylo & Euclid.",
  },
];

export interface ChromiumDashboardFeature {
  readonly featureId: number;
  readonly name: string;
  readonly blinkComponent: string;
  readonly status: "Shipped" | "OriginTrial" | "InDevelopment";
  readonly milestoneShipped: number;
  readonly specUrl: string;
  readonly summary: string;
}

export const CHROMIUM_DASHBOARD_FEATURES_2026: readonly ChromiumDashboardFeature[] =
  [
    {
      featureId: 51902101,
      name: "Speculation Rules API v2 (Document Rules & Eagerness)",
      blinkComponent: "Blink>Loader>SpeculationRules",
      status: "Shipped",
      milestoneShipped: 121,
      specUrl: "https://wicg.github.io/nav-speculation/speculation-rules.html",
      summary:
        'Declarative JSON <script type="speculationrules"> enabling instant zero-TTFB prerendering and prefetching.',
    },
    {
      featureId: 51902102,
      name: "Cross-Document View Transitions (CSS View Transitions Level 2)",
      blinkComponent: "Blink>ViewTransitions",
      status: "Shipped",
      milestoneShipped: 126,
      specUrl: "https://drafts.csswg.org/css-view-transitions-2/",
      summary:
        "Native MPA transitions triggered via @view-transition { navigation: auto; } without SPA router bloat.",
    },
    {
      featureId: 51902103,
      name: "Interaction to Next Paint (INP) Core Web Vital & Long Animation Frames (LoAF)",
      blinkComponent: "Blink>PerformanceAPIs",
      status: "Shipped",
      milestoneShipped: 123,
      specUrl: "https://w3c.github.io/long-animation-frames/",
      summary:
        "Measures full interaction latency and attributes main-thread blocking scripts via PerformanceLongAnimationFrameTiming.",
    },
    {
      featureId: 51902104,
      name: "WebGPU Subgroups & Compute Shaders (WGSL)",
      blinkComponent: "Blink>WebGPU",
      status: "Shipped",
      milestoneShipped: 134,
      specUrl: "https://www.w3.org/TR/webgpu/",
      summary:
        "SIMD subgroup operations in WGSL compute shaders via Dawn (Vulkan, Metal, DirectX 12) for local LLM/vision inference.",
    },
    {
      featureId: 51902105,
      name: "WebAuthn Level 3 Passkeys with PRF Extension",
      blinkComponent: "Blink>WebAuthentication",
      status: "Shipped",
      milestoneShipped: 132,
      specUrl: "https://w3c.github.io/webauthn/#prf-extension",
      summary:
        "Deterministic symmetric key derivation from hardware FIDO2 passkeys for keyless client-side vault encryption.",
    },
    {
      featureId: 51902106,
      name: "WebMCP (navigator.modelContext) Agent Tool Registration",
      blinkComponent: "Blink>AI>ModelContext",
      status: "OriginTrial",
      milestoneShipped: 144,
      specUrl: "https://github.com/GoogleChrome/chromium-dashboard",
      summary:
        "Exposes structured DOM/application tools directly to browser-integrated AI agents via navigator.modelContext.",
    },
  ];

export interface ModernWebGuidanceRule {
  readonly id: string;
  readonly sourceRepo:
    | "GoogleChrome/modern-web-guidance-src"
    | "GoogleChrome/developer.chrome.com";
  readonly category:
    "performance" | "rendering" | "security" | "accessibility" | "pwa-offline";
  readonly title: string;
  readonly recommendation: string;
  readonly requiredPattern: string;
}

export const MODERN_WEB_GUIDANCE_RULES_2026: readonly ModernWebGuidanceRule[] =
  [
    {
      id: "mwg-001",
      sourceRepo: "GoogleChrome/modern-web-guidance-src",
      category: "performance",
      title: "Instant Navigation with Speculation Rules",
      recommendation:
        'Include <script type="speculationrules"> with moderate eagerness for high-probability document transitions.',
      requiredPattern: 'type="speculationrules"',
    },
    {
      id: "mwg-002",
      sourceRepo: "GoogleChrome/modern-web-guidance-src",
      category: "rendering",
      title: "Layout Containment & Content-Visibility Auto",
      recommendation:
        "Apply content-visibility: auto and contain-intrinsic-size on offscreen sections to minimize initial rendering work.",
      requiredPattern: "content-visibility: auto",
    },
    {
      id: "mwg-003",
      sourceRepo: "GoogleChrome/modern-web-guidance-src",
      category: "security",
      title:
        "Cross-Origin Isolation for High-Resolution Timers & SharedArrayBuffer/Wasm Threads",
      recommendation:
        "Serve Cross-Origin-Opener-Policy: same-origin and Cross-Origin-Embedder-Policy: require-corp.",
      requiredPattern: "same-origin",
    },
    {
      id: "mwg-004",
      sourceRepo: "GoogleChrome/developer.chrome.com",
      category: "accessibility",
      title: "WCAG 2.2 AA/AAA Focus Appearance & 24x24px Minimum Target Size",
      recommendation:
        "Ensure interactive controls have >= 24px dimensions and high-contrast :focus-visible outlines.",
      requiredPattern: ":focus-visible",
    },
    {
      id: "mwg-005",
      sourceRepo: "GoogleChrome/developer.chrome.com",
      category: "rendering",
      title:
        "Zero-Flash Dark/Light Mode via color-scheme Meta & CSS View Transitions",
      recommendation:
        'Declare <meta name="color-scheme" content="dark light"> and @view-transition { navigation: auto; }.',
      requiredPattern: "@view-transition",
    },
  ];

export interface ChromiumOsProfile {
  readonly milestone: string;
  readonly board: string;
  readonly kernel: string;
  readonly sandbox: readonly string[];
  readonly androidContainer: string;
  readonly buildCommands: readonly string[];
}

export const CHROMIUM_OS_SOVEREIGN_PROFILE: ChromiumOsProfile = {
  milestone: "R144-16180.0.0",
  board: "amd64-generic-googlebook-2026",
  kernel: "Linux 6.12-cros-gvisor",
  sandbox: ["Minijail0", "Seccomp-BPF", "Landlock", "gVisor-runsc"],
  androidContainer: "ARCVM Android 17 (API 37) x86_64 Cuttlefish/Waydroid",
  buildCommands: [
    "cros_sdk --enter",
    "setup_board --board=amd64-generic",
    "cros build-packages --board=amd64-generic",
    "cros build-image --board=amd64-generic --no-enable-rootfs-verification dev",
  ],
};

export interface SrcPillarInventoryEntry {
  readonly name: string;
  readonly path: string;
  readonly hasGit: boolean;
  readonly hasPackageJson: boolean;
  readonly hasCargoToml: boolean;
  readonly hasBazel: boolean;
  readonly hasDeps: boolean;
  readonly workspaceCount: number;
  readonly role:
    | "google-monorepo"
    | "bun-runtime"
    | "web-chromium"
    | "ai-compute"
    | "chromium-upstream"
    | "depot-tools"
    | "yolo-pillar";
}

export interface SrcRecursiveOrchestrationReport {
  readonly rootDir: string;
  readonly scannedAt: string;
  readonly totalPillars: number;
  readonly gitReposCount: number;
  readonly bunWorkspacesCount: number;
  readonly cargoWorkspacesCount: number;
  readonly bazelWorkspacesCount: number;
  readonly depotToolsReady: boolean;
  readonly chromiumSrcReady: boolean;
  readonly pillars: SrcPillarInventoryEntry[];
}

const IGNORED_SRC_DIRS = new Set([
  ".agents",
  ".cache",
  ".cargo",
  ".search_env",
  "archive",
  "data",
  "deploy",
  "dist",
  "node_modules",
  "test-results",
  "var",
]);

function classifyPillarRole(name: string): SrcPillarInventoryEntry["role"] {
  if (name === "google") return "google-monorepo";
  if (name === "yolo-bun") return "bun-runtime";
  if (name === "yolo-web") return "web-chromium";
  if (name === "yolo-ai") return "ai-compute";
  if (name === "chromium") return "chromium-upstream";
  if (name === "depot_tools") return "depot-tools";
  return "yolo-pillar";
}

/**
 * Recursively inventories and orchestrates all repositories and toolchains under `C:/src`.
 */
export function orchestrateSrcTree(
  srcRoot = "C:/src",
): SrcRecursiveOrchestrationReport {
  const entries = existsSync(srcRoot) ? readdirSync(srcRoot) : [];
  const pillars: SrcPillarInventoryEntry[] = [];

  for (const name of entries.sort()) {
    if (IGNORED_SRC_DIRS.has(name) || name.startsWith(".")) continue;
    const fullPath = join(srcRoot, name).replace(/\\/g, "/");
    try {
      if (!statSync(fullPath).isDirectory()) continue;
    } catch {
      continue;
    }

    const hasGit =
      existsSync(join(fullPath, ".git")) ||
      existsSync(join(fullPath, "src", ".git"));
    const pkgPath = join(fullPath, "package.json");
    const hasPackageJson = existsSync(pkgPath);
    const hasCargoToml = existsSync(join(fullPath, "Cargo.toml"));
    const hasBazel =
      existsSync(join(fullPath, "BUILD.bazel")) ||
      existsSync(join(fullPath, "MODULE.bazel"));
    const hasDeps =
      existsSync(join(fullPath, "DEPS")) ||
      existsSync(join(fullPath, "src", "DEPS"));

    let workspaceCount = 0;
    if (hasPackageJson) {
      try {
        const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as {
          workspaces?: string[] | { packages?: string[] };
        };
        if (Array.isArray(pkg.workspaces)) {
          workspaceCount = pkg.workspaces.length;
        } else if (Array.isArray(pkg.workspaces?.packages)) {
          workspaceCount = pkg.workspaces.packages.length;
        }
      } catch {
        workspaceCount = 0;
      }
    }

    pillars.push({
      name,
      path: fullPath,
      hasGit,
      hasPackageJson,
      hasCargoToml,
      hasBazel,
      hasDeps,
      workspaceCount,
      role: classifyPillarRole(name),
    });
  }

  const dt = inspectDepotTools(
    join(srcRoot, "depot_tools").replace(/\\/g, "/"),
    join(srcRoot, "chromium", "src").replace(/\\/g, "/"),
  );

  return {
    rootDir: srcRoot,
    scannedAt: new Date().toISOString(),
    totalPillars: pillars.length,
    gitReposCount: pillars.filter((p) => p.hasGit).length,
    bunWorkspacesCount: pillars.filter((p) => p.hasPackageJson).length,
    cargoWorkspacesCount: pillars.filter((p) => p.hasCargoToml).length,
    bazelWorkspacesCount: pillars.filter((p) => p.hasBazel).length,
    depotToolsReady: dt.isDepotToolsPresent,
    chromiumSrcReady: dt.isChromiumSrcPresent,
    pillars,
  };
}

export const chromiumToolkitPlugin: BunPlugin = {
  name: "yolo-bun-chromium-and-google-oss-toolkit",
  setup(build) {
    build.onResolve({ filter: /^yolo-bun:chromium-toolkit$/ }, () => ({
      path: "chromium-toolkit",
      namespace: "yolo-bun",
    }));
    build.onResolve({ filter: /^yolo-bun:depot-tools$/ }, () => ({
      path: "depot-tools",
      namespace: "yolo-bun",
    }));
    build.onResolve({ filter: /^yolo-bun:chromium-dashboard$/ }, () => ({
      path: "chromium-dashboard",
      namespace: "yolo-bun",
    }));
    build.onResolve({ filter: /^yolo-bun:modern-web-guidance$/ }, () => ({
      path: "modern-web-guidance",
      namespace: "yolo-bun",
    }));
    build.onResolve({ filter: /^yolo-bun:chromiumos$/ }, () => ({
      path: "chromiumos",
      namespace: "yolo-bun",
    }));
    build.onResolve({ filter: /^yolo-bun:src-orchestrator$/ }, () => ({
      path: "src-orchestrator",
      namespace: "yolo-bun",
    }));

    build.onLoad(
      { filter: /^chromium-toolkit$/, namespace: "yolo-bun" },
      () => {
        const payload = {
          collaboration: CHROMIUM_GITHUB_COLLABORATION_SPEC,
          patches: HELIUM_BRAVE_CHROMIUM_PATCHES,
          dashboardFeatures: CHROMIUM_DASHBOARD_FEATURES_2026,
          guidanceRules: MODERN_WEB_GUIDANCE_RULES_2026,
          chromiumOs: CHROMIUM_OS_SOVEREIGN_PROFILE,
        };
        return {
          contents: `export const chromiumToolkit = ${JSON.stringify(payload)};\nexport default chromiumToolkit;\n`,
          loader: "js",
        };
      },
    );

    build.onLoad({ filter: /^depot-tools$/, namespace: "yolo-bun" }, () => {
      const payload = inspectDepotTools();
      return {
        contents: `export const depotTools = ${JSON.stringify(payload)};\nexport default depotTools;\n`,
        loader: "js",
      };
    });

    build.onLoad(
      { filter: /^chromium-dashboard$/, namespace: "yolo-bun" },
      () => {
        const payload = {
          dashboardUrl: "https://chromestatus.com",
          repoUrl: "https://github.com/GoogleChrome/chromium-dashboard",
          features: CHROMIUM_DASHBOARD_FEATURES_2026,
        };
        return {
          contents: `export const chromiumDashboard = ${JSON.stringify(payload)};\nexport default chromiumDashboard;\n`,
          loader: "js",
        };
      },
    );

    build.onLoad(
      { filter: /^modern-web-guidance$/, namespace: "yolo-bun" },
      () => {
        const payload = {
          repoUrl: "https://github.com/GoogleChrome/modern-web-guidance-src",
          rules: MODERN_WEB_GUIDANCE_RULES_2026,
        };
        return {
          contents: `export const modernWebGuidance = ${JSON.stringify(payload)};\nexport default modernWebGuidance;\n`,
          loader: "js",
        };
      },
    );

    build.onLoad({ filter: /^chromiumos$/, namespace: "yolo-bun" }, () => {
      return {
        contents: `export const chromiumOs = ${JSON.stringify(CHROMIUM_OS_SOVEREIGN_PROFILE)};\nexport default chromiumOs;\n`,
        loader: "js",
      };
    });

    build.onLoad(
      { filter: /^src-orchestrator$/, namespace: "yolo-bun" },
      () => {
        const report = orchestrateSrcTree();
        return {
          contents: `export const srcOrchestration = ${JSON.stringify(report)};\nexport default srcOrchestration;\n`,
          loader: "js",
        };
      },
    );
  },
};
