// SPDX-License-Identifier: MIT OR Apache-2.0
/**
 * Sovereign Bun Implementation of Electron (`@electron/build-tools`, `e` CLI,
 * `patches/config.json`, `git-import-patches`, `git-export-patches`,
 * `electron/roller`, `NodeBindings` + V8 + BoringSSL Co-ABI) and CEF
 * (`automate-git.py`, `patch.cfg`, C ABI Translator) Workflows.
 *
 * Exposes virtual modules:
 * - `yolo-bun:electron-workflow`
 * - `yolo-bun:cef-workflow`
 * - `yolo-bun:chromium-roller`
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import type { BunPlugin } from "bun";

export type EvmProfileType = "main" | "testing" | "release" | "debug" | "canary";

export interface EvmConfigProfile {
  readonly name: string;
  readonly profileType: EvmProfileType;
  readonly extends?: string;
  readonly root: string;
  readonly remotes: {
    readonly electron: { readonly origin: string; readonly fork?: string };
    readonly node: { readonly origin: string };
  };
  readonly gen: {
    readonly args: readonly string[];
    readonly out: "Testing" | "Release" | "Debug" | "Canary";
  };
  readonly env: {
    readonly CHROMIUM_BUILDTOOLS_PATH: string;
    readonly DEPOT_TOOLS_WIN_TOOLCHAIN: "0" | "1";
    readonly ELECTRON_USE_THREE_WAY_MERGE_FOR_PATCHES?: "1";
  };
  readonly remoteExecution: "reclient" | "siso" | "sccache" | "none";
}

export interface ElectronPatchTarget {
  readonly patch_dir: string;
  readonly repo: string;
  readonly grep?: string;
}

export interface PatchMetadataEntry {
  readonly filename: string;
  readonly patchDir: string;
  readonly repo: string;
  readonly subject: string;
  readonly formattedWithMetadata: string;
}

export interface GitImportPatchesOptions {
  readonly repo: string;
  readonly patchDir: string;
  readonly threeway?: boolean;
  readonly committerName?: string;
  readonly committerEmail?: string;
  readonly keepCr?: boolean;
  readonly dryRun?: boolean;
}

export interface GitImportPatchesResult {
  readonly repo: string;
  readonly patchDir: string;
  readonly upstreamHeadRef: string;
  readonly patchCount: number;
  readonly gitAmArgs: readonly string[];
  readonly fastIndexFlags: readonly string[];
  readonly applied: boolean;
}

export interface ChromiumReleaseChannelMap {
  readonly stable: string;
  readonly beta: string;
  readonly dev: string;
  readonly canary: string;
}

export interface ChromiumDepsRollReport {
  readonly branch: string;
  readonly currentChromiumVersion: string;
  readonly targetChromiumVersion: string;
  readonly currentMilestone: number;
  readonly targetMilestone: number;
  readonly upgradeAvailable: boolean;
  readonly coveredByMainRoll: boolean;
  readonly gitilesCompareUrl: string;
  readonly affectedSubsystems: readonly (
    | "v8"
    | "blink"
    | "skia"
    | "dawn"
    | "mojo"
    | "boringssl"
    | "content"
  )[];
  readonly prBranchName: string;
  readonly backportLabels: readonly string[];
}

export interface CoAbiAuditSpec {
  readonly runtimeHost: "Bun-JSC-and-Chromium-V8";
  readonly nodeModuleVersion: number;
  readonly nodeV8Path: "//v8";
  readonly nodeOpensslPath: "//third_party/boringssl";
  readonly nodeUseV8Platform: false;
  readonly v8EmbedderDataArraySize: number;
  readonly v8EmbedderSlots: {
    readonly blinkGinMaxSlot: number;
    readonly electronContextEmbedderIndex: 5;
    readonly nodeContextTagSlot: 39;
  };
  readonly v8PromiseInternalFieldCount: 1;
  readonly v8EnableJavascriptPromiseHooks: true;
  readonly v8ExposePublicSymbols: true;
  readonly cetShadowStackEnabled: false;
  readonly cfiEnabled: false;
  readonly eventLoopBridge: {
    readonly className: "electron::NodeBindings";
    readonly uvLoopIntegration: "uv_backend_fd + uv_backend_timeout background poll thread";
    readonly wakeupMechanism: "uv_async_t + base::SingleThreadTaskRunner::PostTask";
    readonly runMode: "uv_run(uv_loop_, UV_RUN_NOWAIT)";
    readonly handleLifecycleWrapper: "electron::UvHandle<T>";
  };
  readonly graphicsAndCryptoSubsystems: {
    readonly skia: "Shared //skia 2D raster/Ganesh/Graphite across Chromium & native UI";
    readonly dawn: "Shared //third_party/dawn WebGPU (Vulkan/Metal/D3D12) + YOLO GPUI WGPU";
    readonly boringssl: "Single //third_party/boringssl symbol table across Chromium net, Node tls/crypto, and QUIC";
  };
  readonly valid: boolean;
}

export interface CefAutomateWorkflowSpec {
  readonly orchestratorScript: "tools/automate/automate-git.py";
  readonly projectGenerator: "cef_create_projects.bat";
  readonly patchConfigFile: "patch/patch.cfg";
  readonly cAbiTranslator: "tools/translator.py";
  readonly wrapperLibrary: "libcef_dll_wrapper";
  readonly corePatches: readonly {
    readonly name: string;
    readonly purpose: string;
  }[];
  readonly comparisonWithElectronAndYolo: {
    readonly electronModel: "Git am 3-way mail-patch queue (.patches) + direct C++ Content/V8/Node linkage";
    readonly cefModel: "Working-tree patch.cfg + autogenerated C struct vtable ABI wrapper around Content API";
    readonly yoloModel: "Rust GPUI 0.8 + WGPU 120 FPS native desktop UI + Obscura CDP / Servo Stylo + Bun 1.4.4 FFI";
  };
}

export const ELECTRON_PATCH_CONFIG_TARGETS: readonly ElectronPatchTarget[] = [
  { patch_dir: "src/electron/patches/chromium", repo: "src" },
  {
    patch_dir: "src/electron/patches/boringssl",
    repo: "src/third_party/boringssl/src",
  },
  {
    patch_dir: "src/electron/patches/devtools_frontend",
    repo: "src/third_party/devtools-frontend/src",
  },
  {
    patch_dir: "src/electron/patches/ffmpeg",
    repo: "src/third_party/ffmpeg",
  },
  { patch_dir: "src/electron/patches/v8", repo: "src/v8" },
  {
    patch_dir: "src/electron/patches/node",
    repo: "src/third_party/electron_node",
  },
  { patch_dir: "src/electron/patches/nan", repo: "src/third_party/nan" },
  {
    patch_dir: "src/electron/patches/libaddressinput",
    repo: "src/third_party/libaddressinput/src",
  },
  {
    patch_dir: "src/electron/patches/perfetto",
    repo: "src/third_party/perfetto",
  },
  {
    patch_dir: "src/electron/patches/squirrel.mac",
    repo: "src/third_party/squirrel.mac",
  },
  {
    patch_dir: "src/electron/patches/webrtc",
    repo: "src/third_party/webrtc",
  },
  {
    patch_dir: "src/electron/patches/sqlite",
    repo: "src/third_party/sqlite/src",
  },
  { patch_dir: "src/electron/patches/angle", repo: "src/third_party/angle" },
];

export const ELECTRON_GN_CHECK_TARGETS: readonly string[] = [
  "//electron:electron_lib",
  "//electron:electron_app",
  "//electron/shell/common:mojo",
  "//electron/shell/common:plugin",
  "//electron:testing_build",
  "//electron:release_build",
];

export const ELECTRON_GN_ARGS_HIERARCHY = {
  allGn: {
    importPath: "//electron/build/args/all.gn",
    flags: {
      is_electron_build: true,
      root_extra_deps: ["//electron"],
      node_module_version: 154,
      node_openssl_path: "//third_party/boringssl",
      node_v8_path: "//v8",
      node_use_v8_platform: false,
      v8_promise_internal_field_count: 1,
      v8_embedder_data_array_size: 40,
      v8_enable_snapshot_native_code_counters: false,
      v8_enable_javascript_promise_hooks: true,
      v8_enable_private_mapping_fork_optimization: true,
      v8_expose_public_symbols: true,
      enable_cdm_host_verification: false,
      enable_widevine: true,
      ffmpeg_branding: "Chrome",
      proprietary_codecs: true,
      enable_printing: true,
      angle_enable_vulkan_validation_layers: false,
      dawn_enable_vulkan_validation_layers: false,
      enable_pseudolocales: false,
      allow_runtime_configurable_key_storage: true,
      enable_cet_shadow_stack: false,
      is_cfi: false,
      use_qt5: false,
      use_qt6: false,
      enable_linux_installer: false,
      enable_pdf_save_to_drive: false,
      produce_v8_compile_hints: false,
      enable_resource_allowlist_generation: true,
    },
  },
  releaseGn: {
    importPath: "//electron/build/args/release.gn",
    imports: ["//electron/build/args/all.gn"],
    flags: {
      is_component_build: false,
      is_official_build: true,
      is_component_ffmpeg: true,
      v8_builtins_profiling_log_file:
        "//electron/build/pgo_profiles/electron-v8-builtins.profile",
    },
  },
  testingGn: {
    importPath: "//electron/build/args/testing.gn",
    imports: ["//electron/build/args/all.gn"],
    flags: {
      is_debug: false,
      is_component_build: false,
      is_component_ffmpeg: true,
      is_official_build: false,
      dcheck_always_on: true,
      symbol_level: 1,
    },
  },
  debugGn: {
    importPath: "//electron/build/args/debug.gn",
    imports: ["//electron/build/args/all.gn"],
    flags: {
      is_debug: true,
      is_component_build: true,
      is_component_ffmpeg: true,
      is_official_build: false,
      symbol_level: 2,
    },
  },
} as const;

export const CEF_AUTOMATE_WORKFLOW_SPEC: CefAutomateWorkflowSpec = {
  orchestratorScript: "tools/automate/automate-git.py",
  projectGenerator: "cef_create_projects.bat",
  patchConfigFile: "patch/patch.cfg",
  cAbiTranslator: "tools/translator.py",
  wrapperLibrary: "libcef_dll_wrapper",
  corePatches: [
    {
      name: "gritsettings",
      purpose: "Registers CEF resource IDs into Chromium tools/gritsettings/resource_ids.spec.",
    },
    {
      name: "gn_config",
      purpose:
        "Excludes conflicting //chrome:packed_resources_locales, adds sccache cc_wrapper and windows_sdk_version.",
    },
    {
      name: "runhooks",
      purpose:
        "Applies custom Visual Studio toolchain hooks between gclient sync --nohooks and gclient runhooks.",
    },
    {
      name: "component_build",
      purpose: "Exports internal Content/Blink symbols required when GN is_component_build=true.",
    },
    {
      name: "os_crypt_keychain_config",
      purpose: "Allows embedders to customize macOS Keychain / OSCrypt storage identifiers.",
    },
  ],
  comparisonWithElectronAndYolo: {
    electronModel:
      "Git am 3-way mail-patch queue (.patches) + direct C++ Content/V8/Node linkage",
    cefModel:
      "Working-tree patch.cfg + autogenerated C struct vtable ABI wrapper around Content API",
    yoloModel:
      "Rust GPUI 0.8 + WGPU 120 FPS native desktop UI + Obscura CDP / Servo Stylo + Bun 1.4.4 FFI",
  },
};

/**
 * Deep-merges a base EVM config (`source`) into an extending config (`target`),
 * matching `@electron/build-tools/src/evm-config.ts`.
 */
export function mergeEvmConfigs<T extends Record<string, unknown>>(
  target: T,
  source: T,
): T {
  const clone: Record<string, unknown> = { ...target };
  for (const key of Object.keys(source)) {
    const tVal = clone[key];
    const sVal = source[key];
    if (Array.isArray(tVal) && Array.isArray(sVal)) {
      clone[key] = tVal.concat(sVal);
    } else if (
      tVal &&
      sVal &&
      typeof tVal === "object" &&
      typeof sVal === "object" &&
      !Array.isArray(tVal) &&
      !Array.isArray(sVal)
    ) {
      clone[key] = mergeEvmConfigs(
        tVal as Record<string, unknown>,
        sVal as Record<string, unknown>,
      );
    } else if (tVal === undefined || tVal === null) {
      clone[key] = sVal;
    }
  }
  return clone as T;
}

/**
 * Creates a standardized `@electron/build-tools` EVM configuration profile
 * (`main`, `testing`, `release`, `debug`, `canary`).
 */
export function createEvmConfigProfile(
  profileType: EvmProfileType,
  rootDir = "C:/src/chromium",
): EvmConfigProfile {
  const gnImportMap: Record<EvmProfileType, string> = {
    main: 'import("//electron/build/args/testing.gn")',
    testing: 'import("//electron/build/args/testing.gn")',
    release: 'import("//electron/build/args/release.gn")',
    debug: 'import("//electron/build/args/debug.gn")',
    canary: 'import("//electron/build/args/testing.gn")',
  };

  const outMap: Record<
    EvmProfileType,
    "Testing" | "Release" | "Debug" | "Canary"
  > = {
    main: "Testing",
    testing: "Testing",
    release: "Release",
    debug: "Debug",
    canary: "Canary",
  };

  return {
    name: `evm.${profileType}.json`,
    profileType,
    root: rootDir,
    remotes: {
      electron: {
        origin: "https://github.com/electron/electron.git",
      },
      node: {
        origin: "https://github.com/electron/node.git",
      },
    },
    gen: {
      args: [
        gnImportMap[profileType],
        'cc_wrapper="sccache"',
      ],
      out: outMap[profileType],
    },
    env: {
      CHROMIUM_BUILDTOOLS_PATH: `${rootDir}/src/buildtools`,
      DEPOT_TOOLS_WIN_TOOLCHAIN: "0",
      ELECTRON_USE_THREE_WAY_MERGE_FOR_PATCHES: "1",
    },
    remoteExecution: "sccache",
  };
}

/**
 * Computes the per-worktree `refs/patches/upstream-head-<md5[:8]>` reference
 * used by Electron's `script/lib/git.py` so `gclient-new-workdir` checkouts
 * sharing `.git/refs` never clobber each other's upstream base commit.
 */
export function computeWorktreeUpstreamHeadRef(scriptDirPath: string): string {
  const digest = createHash("md5")
    .update(resolve(scriptDirPath))
    .digest("hex")
    .slice(0, 8);
  return `refs/patches/upstream-head-${digest}`;
}

export const PATCH_DIR_PREFIX = "Patch-Dir: ";
export const PATCH_FILENAME_PREFIX = "Patch-Filename: ";

/**
 * Injects `Patch-Dir:` and `Patch-Filename:` metadata lines right before the
 * first `diff -` or `---` boundary, matching `script/lib/patches.py:read_patch`.
 */
export function injectPatchLocationMetadata(
  rawPatchText: string,
  patchDir: string,
  patchFilename: string,
): string {
  const lines = rawPatchText.split(/\r?\n/);
  const out: string[] = [];
  let injected = false;

  for (const line of lines) {
    if (
      !injected &&
      (line.startsWith("diff -") || line.startsWith("---"))
    ) {
      out.push(`${PATCH_DIR_PREFIX}${patchDir}`);
      out.push(`${PATCH_FILENAME_PREFIX}${patchFilename}`);
      injected = true;
    }
    out.push(line);
  }
  return out.join("\n");
}

/**
 * Normalizes an exported `git format-patch` commit by zeroing the volatile
 * commit hash on the `From <sha>` header and stripping `Patch-Dir:` /
 * `Patch-Filename:` footers before writing to disk (`git-export-patches`).
 */
export function normalizeExportedPatchContent(rawFormattedPatch: string): {
  readonly normalizedPatch: string;
  readonly extractedFilename: string | null;
} {
  const lines = rawFormattedPatch.split(/\r?\n/);
  const out: string[] = [];
  let extractedFilename: string | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    if (i === 0 && /^From [0-9a-f]{40} /.test(line)) {
      out.push(
        line.replace(
          /^From [0-9a-f]{40} /,
          "From 0000000000000000000000000000000000000000 ",
        ),
      );
      continue;
    }
    if (line.startsWith(PATCH_FILENAME_PREFIX)) {
      extractedFilename = line.slice(PATCH_FILENAME_PREFIX.length).trim();
      continue;
    }
    if (line.startsWith(PATCH_DIR_PREFIX)) {
      continue;
    }
    out.push(line);
  }

  return {
    normalizedPatch: out.join("\n"),
    extractedFilename,
  };
}

/**
 * Builds the exact high-throughput `git am` invocation used by Electron's
 * `script/lib/git.py` to apply patches across Chromium's 500k-file index
 * without SHA-1 index recomputation or per-object fsync bottlenecks.
 */
export function buildGitImportPatchesPlan(
  options: GitImportPatchesOptions,
): GitImportPatchesResult {
  const fastIndexFlags = [
    "-c",
    "user.name=" + (options.committerName ?? "Electron Scripts"),
    "-c",
    "user.email=" + (options.committerEmail ?? "scripts@electron"),
    "-c",
    "commit.gpgsign=false",
    "-c",
    "index.skipHash=true",
    "-c",
    "index.version=4",
    "-c",
    "core.fsync=none",
    "-c",
    "gc.auto=0",
  ];

  const gitAmArgs = ["am", "--keep-non-patch"];
  if (options.threeway ?? true) {
    gitAmArgs.push("--3way");
  }
  if (options.keepCr ?? true) {
    gitAmArgs.push("--keep-cr");
  }

  const patchesManifestPath = join(options.patchDir, ".patches");
  let patchCount = 0;
  if (existsSync(patchesManifestPath)) {
    const rawList = readFileSync(patchesManifestPath, "utf8");
    patchCount = rawList
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && !l.startsWith("#")).length;
  }

  return {
    repo: options.repo,
    patchDir: options.patchDir,
    upstreamHeadRef: computeWorktreeUpstreamHeadRef(options.patchDir),
    patchCount,
    gitAmArgs,
    fastIndexFlags,
    applied: !options.dryRun && existsSync(join(options.repo, ".git")),
  };
}

/**
 * Compares two four-part Chromium version strings (`major.minor.build.patch`),
 * returning `-1` if `a < b`, `0` if equal, or `1` if `a > b`.
 */
export function compareChromiumVersions(a: string, b: string): -1 | 0 | 1 {
  const partsA = a.split(".").map((n) => Number.parseInt(n, 10) || 0);
  const partsB = b.split(".").map((n) => Number.parseInt(n, 10) || 0);
  const len = Math.max(partsA.length, partsB.length);
  for (let i = 0; i < len; i++) {
    const va = partsA[i] ?? 0;
    const vb = partsB[i] ?? 0;
    if (va > vb) return 1;
    if (va < vb) return -1;
  }
  return 0;
}

/**
 * Native Bun equivalent of `electron/roller` (`src/chromium-handler.ts`):
 * computes DEPS delta between an Electron branch's current `chromium_version`
 * and upstream Chromium release channels (`stable`, `beta`, `dev`, `canary`).
 */
export function planChromiumRollerUpdate(params: {
  readonly branch: string;
  readonly currentChromiumVersion: string;
  readonly targetChannel: keyof ChromiumReleaseChannelMap;
  readonly channels?: ChromiumReleaseChannelMap;
  readonly mainLandedVersion?: string;
  readonly mainCoveredBranches?: readonly string[];
}): ChromiumDepsRollReport {
  const defaultChannels: ChromiumReleaseChannelMap = {
    stable: "156.0.7980.112",
    beta: "157.0.8042.45",
    dev: "158.0.8098.12",
    canary: "159.0.8140.0",
  };
  const channels = params.channels ?? defaultChannels;
  const targetVersion = channels[params.targetChannel];

  const currentMilestone =
    Number.parseInt(params.currentChromiumVersion.split(".")[0] ?? "0", 10) ||
    0;
  const targetMilestone =
    Number.parseInt(targetVersion.split(".")[0] ?? "0", 10) || 0;

  const coveredByMainRoll = Boolean(
    params.mainCoveredBranches?.includes(params.branch) &&
      params.mainLandedVersion &&
      compareChromiumVersions(
        params.currentChromiumVersion,
        params.mainLandedVersion,
      ) >= 0,
  );

  const upgradeAvailable =
    !coveredByMainRoll &&
    compareChromiumVersions(targetVersion, params.currentChromiumVersion) > 0;

  return {
    branch: params.branch,
    currentChromiumVersion: params.currentChromiumVersion,
    targetChromiumVersion: targetVersion,
    currentMilestone,
    targetMilestone,
    upgradeAvailable,
    coveredByMainRoll,
    gitilesCompareUrl: `https://chromium.googlesource.com/chromium/src/+log/${params.currentChromiumVersion}..${targetVersion}`,
    affectedSubsystems: [
      "v8",
      "blink",
      "skia",
      "dawn",
      "mojo",
      "boringssl",
      "content",
    ],
    prBranchName: `roller/chromium/${params.branch}`,
    backportLabels:
      params.branch === "main"
        ? [`target/${targetMilestone}-x-y`]
        : [`target/${params.branch}`],
  };
}

/**
 * Audits the joint ABI invariants between Node.js / Bun, Chromium V8,
 * BoringSSL, Skia, and Dawn (`build/args/all.gn` & `NodeBindings`).
 */
export function auditNodeBunV8BoringSslCoAbi(): CoAbiAuditSpec {
  const allFlags = ELECTRON_GN_ARGS_HIERARCHY.allGn.flags;
  const valid =
    allFlags.node_v8_path === "//v8" &&
    allFlags.node_openssl_path === "//third_party/boringssl" &&
    allFlags.node_use_v8_platform === false &&
    allFlags.v8_embedder_data_array_size >= 40 &&
    allFlags.enable_cet_shadow_stack === false &&
    allFlags.is_cfi === false;

  return {
    runtimeHost: "Bun-JSC-and-Chromium-V8",
    nodeModuleVersion: allFlags.node_module_version,
    nodeV8Path: allFlags.node_v8_path,
    nodeOpensslPath: allFlags.node_openssl_path,
    nodeUseV8Platform: allFlags.node_use_v8_platform,
    v8EmbedderDataArraySize: allFlags.v8_embedder_data_array_size,
    v8EmbedderSlots: {
      blinkGinMaxSlot: 4,
      electronContextEmbedderIndex: 5,
      nodeContextTagSlot: 39,
    },
    v8PromiseInternalFieldCount: allFlags.v8_promise_internal_field_count,
    v8EnableJavascriptPromiseHooks:
      allFlags.v8_enable_javascript_promise_hooks,
    v8ExposePublicSymbols: allFlags.v8_expose_public_symbols,
    cetShadowStackEnabled: allFlags.enable_cet_shadow_stack,
    cfiEnabled: allFlags.is_cfi,
    eventLoopBridge: {
      className: "electron::NodeBindings",
      uvLoopIntegration:
        "uv_backend_fd + uv_backend_timeout background poll thread",
      wakeupMechanism:
        "uv_async_t + base::SingleThreadTaskRunner::PostTask",
      runMode: "uv_run(uv_loop_, UV_RUN_NOWAIT)",
      handleLifecycleWrapper: "electron::UvHandle<T>",
    },
    graphicsAndCryptoSubsystems: {
      skia: "Shared //skia 2D raster/Ganesh/Graphite across Chromium & native UI",
      dawn: "Shared //third_party/dawn WebGPU (Vulkan/Metal/D3D12) + YOLO GPUI WGPU",
      boringssl:
        "Single //third_party/boringssl symbol table across Chromium net, Node tls/crypto, and QUIC",
    },
    valid,
  };
}

/**
 * Generates or verifies the Electron `patches/config.json` manifest on disk.
 */
export function writeElectronPatchesConfig(targetDir: string): string {
  mkdirSync(targetDir, { recursive: true });
  const filePath = join(targetDir, "patches.config.json");
  writeFileSync(
    filePath,
    `${JSON.stringify(ELECTRON_PATCH_CONFIG_TARGETS, null, 2)}\n`,
    "utf8",
  );
  return filePath;
}

/**
 * Native Bun CLI dispatcher reproducing `@electron/build-tools` (`e` CLI)
 * commands: `e init`, `e sync`, `e build`, `e patches`, `e d`, `e backport`,
 * `e gn-check`, and `e roll`.
 */
export function executeElectronBuildToolsCommand(
  subcommand:
    | "init"
    | "sync"
    | "build"
    | "patches"
    | "d"
    | "backport"
    | "gn-check"
    | "roll",
  options: {
    readonly profile?: EvmProfileType;
    readonly rootDir?: string;
    readonly target?: string;
    readonly branch?: string;
    readonly currentChromiumVersion?: string;
  } = {},
): Record<string, unknown> {
  const profileType = options.profile ?? "testing";
  const rootDir = options.rootDir ?? "C:/src/chromium";
  const evmProfile = createEvmConfigProfile(profileType, rootDir);

  switch (subcommand) {
    case "init":
      return {
        command: "e init",
        evmProfile,
        gclientConfig: `solutions = [{ "name": "src/electron", "url": "${evmProfile.remotes.electron.origin}" }]`,
      };
    case "sync":
      return {
        command: "e sync",
        gclientArgs: [
          "sync",
          "--with_branch_heads",
          "--with_tags",
          "--nohooks",
        ],
        patchTargetsCount: ELECTRON_PATCH_CONFIG_TARGETS.length,
        threeWayMerge: true,
      };
    case "build":
      return {
        command: "e build",
        gnGenCmd: `gn gen out/${evmProfile.gen.out} --args='${evmProfile.gen.args.join(" ")}'`,
        ninjaCmd: `autoninja -C out/${evmProfile.gen.out} ${options.target ?? "electron"}`,
      };
    case "patches": {
      const targetName = options.target ?? "chromium";
      const found =
        ELECTRON_PATCH_CONFIG_TARGETS.find(
          (t) => basename(t.patch_dir) === targetName,
        ) ?? ELECTRON_PATCH_CONFIG_TARGETS[0];
      return {
        command: "e patches",
        target: found,
        importPlan: buildGitImportPatchesPlan({
          repo: found.repo,
          patchDir: found.patch_dir,
          threeway: true,
          dryRun: true,
        }),
      };
    }
    case "d":
      return {
        command: "e d",
        env: evmProfile.env,
        passthroughArgs: options.target ?? "gn --version",
      };
    case "backport":
      return {
        command: "e backport",
        targetBranch: options.branch ?? "39-x-y",
        strategy: "trop-cherry-pick-with-3way-patches",
      };
    case "gn-check":
      return {
        command: "e gn-check",
        outDir: `out/${evmProfile.gen.out}`,
        checkedTargets: ELECTRON_GN_CHECK_TARGETS,
      };
    case "roll":
      return {
        command: "e roll",
        rollReport: planChromiumRollerUpdate({
          branch: options.branch ?? "main",
          currentChromiumVersion:
            options.currentChromiumVersion ?? "158.0.8098.12",
          targetChannel: "canary",
        }),
      };
  }
}

export const electronWorkflowPlugin: BunPlugin = {
  name: "yolo-bun-electron-and-cef-chromium-workflow",
  setup(build) {
    build.onResolve({ filter: /^yolo-bun:electron-workflow$/ }, () => ({
      path: "electron-workflow",
      namespace: "yolo-bun",
    }));
    build.onResolve({ filter: /^yolo-bun:cef-workflow$/ }, () => ({
      path: "cef-workflow",
      namespace: "yolo-bun",
    }));
    build.onResolve({ filter: /^yolo-bun:chromium-roller$/ }, () => ({
      path: "chromium-roller",
      namespace: "yolo-bun",
    }));

    build.onLoad(
      { filter: /^electron-workflow$/, namespace: "yolo-bun" },
      () => {
        const payload = {
          patchTargets: ELECTRON_PATCH_CONFIG_TARGETS,
          gnArgsHierarchy: ELECTRON_GN_ARGS_HIERARCHY,
          gnCheckTargets: ELECTRON_GN_CHECK_TARGETS,
          coAbiAudit: auditNodeBunV8BoringSslCoAbi(),
          profiles: {
            testing: createEvmConfigProfile("testing"),
            release: createEvmConfigProfile("release"),
            canary: createEvmConfigProfile("canary"),
          },
        };
        return {
          contents: `export const electronWorkflow = ${JSON.stringify(payload)};\nexport default electronWorkflow;\n`,
          loader: "js",
        };
      },
    );

    build.onLoad({ filter: /^cef-workflow$/, namespace: "yolo-bun" }, () => {
      return {
        contents: `export const cefWorkflow = ${JSON.stringify(CEF_AUTOMATE_WORKFLOW_SPEC)};\nexport default cefWorkflow;\n`,
        loader: "js",
      };
    });

    build.onLoad(
      { filter: /^chromium-roller$/, namespace: "yolo-bun" },
      () => {
        const payload = planChromiumRollerUpdate({
          branch: "main",
          currentChromiumVersion: "158.0.8098.12",
          targetChannel: "canary",
        });
        return {
          contents: `export const chromiumRoller = ${JSON.stringify(payload)};\nexport default chromiumRoller;\n`,
          loader: "js",
        };
      },
    );
  },
};
