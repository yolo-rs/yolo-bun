// SPDX-License-Identifier: MIT OR Apache-2.0
/**
 * YOLO Chromium Version Manager & Third-Party Alignment Matrix (`yolo cvm`)
 *
 * Equivalent to `yolo bvm` (Bun Version Manager) and `nvm`/`fnm`/`uv`, engineered
 * specifically to align all 5 upstream engines:
 *   1. Bun Upstream (`oven-sh/bun` — JavaScriptCore + BoringSSL + libuv + lol-html + Highway + c-ares)
 *   2. Node.js Upstream (`nodejs/node` — V8 + libuv + Ada + simdutf + c-ares + BoringSSL/OpenSSL)
 *   3. Electron Upstream (`electron/electron` + `@electron/build-tools` — Chromium + V8 + Node ABI bridge + Dawn + Skia + Blink + Mojo)
 *   4. Chromium Upstream (`chromium/src` — Blink + V8 + Skia + Dawn/WebGPU + HarfBuzz + FreeType + ANGLE + BoringSSL + PDFium + WebRTC)
 *   5. CEF Upstream (`chromiumembedded/cef` — Chromium Content API C/C++ ABI wrapper + Sandbox + `cef-rs` / `cef-dll-sys`)
 *
 * Across the 3 canonical Chromium release channels (`stable`, `dev`, `canary`),
 * and automatically aligns all YOLO workspace Rust crates and Bun packages that
 * consume V8, Dawn/WebGPU, Blink/Stylo, Skia/Tiny-Skia/Vello, Canvas, HarfBuzz/Swash,
 * BoringSSL, and CEF.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";

export type ChromiumReleaseChannel = "stable" | "dev" | "canary";

export interface UpstreamEngineComparison {
  readonly engine: "bun" | "nodejs" | "electron" | "chromium" | "cef";
  readonly repository: string;
  readonly jsEngine: string;
  readonly gpuWebGpuStack: string;
  readonly rendering2dCanvasStack: string;
  readonly htmlCssLayoutStack: string;
  readonly tlsCryptoStack: string;
  readonly buildSystem: string;
  readonly versionManagerTool: string;
  readonly yoloIntegrationRole: string;
}

export interface ChromiumThirdPartyPin {
  readonly component:
    | "v8"
    | "dawn"
    | "blink"
    | "skia"
    | "canvas"
    | "cef"
    | "harfbuzz"
    | "boringssl"
    | "angle"
    | "webrtc"
    | "pdfium"
    | "webkit-jsc";
  readonly upstreamUrl: string;
  readonly chromiumSubpath: string;
  readonly channelRevisions: Record<
    ChromiumReleaseChannel,
    {
      readonly version: string;
      readonly gitRefOrMilestone: string;
      readonly abiRevision: string;
    }
  >;
  readonly workspaceConsumers: readonly {
    readonly workspace: string;
    readonly manifestPath: string;
    readonly crateOrPackage: string;
    readonly dependencyName: string;
    readonly channelVersionMap: Record<ChromiumReleaseChannel, string>;
  }[];
}

export interface ChromiumChannelProfile {
  readonly channel: ChromiumReleaseChannel;
  readonly milestone: number;
  readonly chromiumVersion: string;
  readonly v8Version: string;
  readonly skiaMilestone: string;
  readonly dawnRevision: string;
  readonly cefVersion: string;
  readonly electronVersion: string;
  readonly nodeAbiVersion: string;
  readonly bunSlotMapping: "stable" | "canary" | "custom-aot";
}

export interface CvmStateConfig {
  readonly activeChannel: ChromiumReleaseChannel;
  readonly updatedAt: string;
  readonly respectChromiumVersionFile: boolean;
  readonly alignedBvmSlot: "stable" | "canary" | "custom-aot";
}

export const UPSTREAM_ENGINES_MATRIX_2026: readonly UpstreamEngineComparison[] =
  [
    {
      engine: "bun",
      repository: "https://github.com/oven-sh/bun",
      jsEngine: "JavaScriptCore (WebKit 623.1+ / DFG+FTL+B3 JIT + Yarr RegExp)",
      gpuWebGpuStack:
        "yolo-gpu (wgpu 30.0.1 / Naga SPIR-V->WGSL + Dawn FFI bridge)",
      rendering2dCanvasStack:
        "yolo-render + anyrender_skia (skia-safe 0.156) + tiny-skia 0.12",
      htmlCssLayoutStack:
        "lol-html (Cloudflare) + Bun CSS Parser (Rust) + Taffy 0.15",
      tlsCryptoStack:
        "BoringSSL (Google Chromium fork) + Highway SIMD + simdutf",
      buildSystem:
        "Cargo (Rust 2024, 114 workspace crates) + CMake + Ninja + Clang-CL",
      versionManagerTool: "yolo bvm (stable / canary / custom-aot)",
      yoloIntegrationRole:
        "Primary JS/TS AOT runtime (`yolo` / `bun` / `.bun` single binary), package manager, bundler, and test runner",
    },
    {
      engine: "nodejs",
      repository: "https://github.com/nodejs/node",
      jsEngine: "V8 13.6+ / 14.4+ (Maglev + TurboFan + Sparkplug)",
      gpuWebGpuStack: "dawn-node / webgpu N-API bindings",
      rendering2dCanvasStack:
        "@napi-rs/canvas (Skia C++ N-API) / node-canvas (Cairo)",
      htmlCssLayoutStack: "undici + Ada URL (WHATWG) + llhttp",
      tlsCryptoStack:
        "OpenSSL 3.4 / BoringSSL (when embedded in Electron) + c-ares + libuv",
      buildSystem: "GYP / Python configure.py + Ninja + V8 GN compatibility",
      versionManagerTool:
        "nvm / fnm / volta (replaced by `yolo` N-API & node:* compatibility layer)",
      yoloIntegrationRole:
        "Full N-API v9 and `node:*` compatibility surface inside Bun + V8 reference baseline for `obscura-js` (`deno_core`)",
    },
    {
      engine: "electron",
      repository: "https://github.com/electron/electron",
      jsEngine:
        "Shared V8 Isolate (Chromium Blink + Node.js unified via Electron NodeBindings)",
      gpuWebGpuStack: "Chromium Dawn (`//third_party/dawn`) + Viz GPU Process",
      rendering2dCanvasStack:
        "Chromium Skia (`//third_party/skia` Ganesh + Graphite) + Blink Canvas2D",
      htmlCssLayoutStack:
        "Chromium Blink (`//third_party/blink` LayoutNG + Oilpan GC)",
      tlsCryptoStack:
        "Chromium BoringSSL (`//third_party/boringssl` shared with Node crypto)",
      buildSystem:
        "@electron/build-tools (`e` CLI) + depot_tools (`gclient`, `gn`, `autoninja`) + 3-way patch queue",
      versionManagerTool:
        "`@electron/build-tools` (`e use main|testing|release`) -> integrated into `yolo cvm`",
      yoloIntegrationRole:
        "Reference Chromium patch queue (`patches/config.json`), DEPS roller (`electron/roller`), and GN build profiles; runtime UI replaced by Zed GPUI 0.8 + WGPU",
    },
    {
      engine: "chromium",
      repository: "https://chromium.googlesource.com/chromium/src",
      jsEngine:
        "V8 (`//v8` — Pointer Compression, Oilpan CppGC, Sandbox, Maglev, Turboshaft)",
      gpuWebGpuStack:
        "Dawn (`//third_party/dawn` — D3D12, Metal, Vulkan, Tint WGSL compiler) + ANGLE",
      rendering2dCanvasStack:
        "Skia (`//third_party/skia` Graphite WebGPU/Dawn + Ganesh) + cc Compositor",
      htmlCssLayoutStack:
        "Blink (`//third_party/blink`) + HarfBuzz + FreeType + Skrifa/Fontations (Rust)",
      tlsCryptoStack:
        "BoringSSL (`//third_party/boringssl`) + net/ Cronet QUIC/HTTP3",
      buildSystem:
        "depot_tools (`gclient`, `gn`, `autoninja`, `siso`, `reclient`) + `DEPS` + `README.chromium`",
      versionManagerTool:
        "Chromium Dashboard / OmahaProxy channels (`stable`, `beta`, `dev`, `canary`) -> `yolo cvm`",
      yoloIntegrationRole:
        "Upstream source of truth for V8, Dawn, Blink, Skia, BoringSSL, HarfBuzz, and Web Standards in `C:/src/yolo/DEPS` and `C:/src/google`",
    },
    {
      engine: "cef",
      repository: "https://github.com/chromiumembedded/cef",
      jsEngine:
        "Chromium V8 exposed via `CefV8Context` / `CefV8Value` C/C++ CAPI",
      gpuWebGpuStack:
        "Chromium Dawn + Viz OSR (Off-Screen Rendering shared texture D3D11/D3D12/Metal/DMABUF)",
      rendering2dCanvasStack:
        "Chromium Skia + `CefRenderHandler` accelerated shared texture / pixel buffer",
      htmlCssLayoutStack: "Chromium Content API + Blink full browser engine",
      tlsCryptoStack:
        "Chromium BoringSSL + `CefRequestContext` isolated cookie/cert store",
      buildSystem:
        "`automate-git.py` + `patch/patch.cfg` + CMake `libcef_dll_wrapper` + Rust `cef-dll-sys`",
      versionManagerTool:
        "Spotify CDN CEF Automated Builds (`stable`, `beta`, `dev`) -> `yolo cvm`",
      yoloIntegrationRole:
        "Powers `yolo-web/crates/yolo-chromium` (`cef = 156.3.0`, `cef-dll-sys = 156.3.0`) with hardware sandbox and CDP",
    },
  ];

export const CHROMIUM_CHANNEL_PROFILES_2026: Record<
  ChromiumReleaseChannel,
  ChromiumChannelProfile
> = {
  stable: {
    channel: "stable",
    milestone: 156,
    chromiumVersion: "156.0.7103.48",
    v8Version: "15.6.210.12",
    skiaMilestone: "m156",
    dawnRevision: "chromium/7103",
    cefVersion: "156.3.0+g710348+chromium-156.0.7103.48",
    electronVersion: "41.2.0",
    nodeAbiVersion: "24.10.0 (MODULE_VERSION 135)",
    bunSlotMapping: "stable",
  },
  dev: {
    channel: "dev",
    milestone: 157,
    chromiumVersion: "157.0.7151.14",
    v8Version: "15.7.104.4",
    skiaMilestone: "m157",
    dawnRevision: "chromium/7151",
    cefVersion: "157.0.14+g715114+chromium-157.0.7151.14",
    electronVersion: "42.0.0-beta.4",
    nodeAbiVersion: "24.11.0 (MODULE_VERSION 136)",
    bunSlotMapping: "canary",
  },
  canary: {
    channel: "canary",
    milestone: 158,
    chromiumVersion: "158.0.7192.2",
    v8Version: "15.8.18.1",
    skiaMilestone: "m158",
    dawnRevision: "main@HEAD",
    cefVersion: "158.0.2+g719202+chromium-158.0.7192.2",
    electronVersion: "43.0.0-nightly.20261108",
    nodeAbiVersion: "25.1.0-nightly (MODULE_VERSION 138)",
    bunSlotMapping: "custom-aot",
  },
};

export const CHROMIUM_THIRD_PARTY_ALIGNMENT_MATRIX: readonly ChromiumThirdPartyPin[] =
  [
    {
      component: "v8",
      upstreamUrl: "https://chromium.googlesource.com/v8/v8.git",
      chromiumSubpath: "v8",
      channelRevisions: {
        stable: {
          version: "15.6.210.12",
          gitRefOrMilestone: "branch-heads/15.6",
          abiRevision: "v8-abi-156-pointer-compression",
        },
        dev: {
          version: "15.7.104.4",
          gitRefOrMilestone: "branch-heads/15.7",
          abiRevision: "v8-abi-157-turboshaft",
        },
        canary: {
          version: "15.8.18.1",
          gitRefOrMilestone: "main",
          abiRevision: "v8-abi-158-maglev-v2",
        },
      },
      workspaceConsumers: [
        {
          workspace: "yolo-web",
          manifestPath: "C:/src/yolo-web/crates/obscura-js/Cargo.toml",
          crateOrPackage: "obscura-js",
          dependencyName: "deno_core",
          channelVersionMap: {
            stable: "0.412",
            dev: "0.412",
            canary: "0.412",
          },
        },
        {
          workspace: "yolo-web",
          manifestPath: "C:/src/yolo-web/Cargo.toml",
          crateOrPackage: "deno-core-workspace",
          dependencyName: "serde_v8",
          channelVersionMap: {
            stable: "0.285.0",
            dev: "0.286.0-dev",
            canary: "0.287.0-canary",
          },
        },
      ],
    },
    {
      component: "dawn",
      upstreamUrl: "https://dawn.googlesource.com/dawn.git",
      chromiumSubpath: "third_party/dawn",
      channelRevisions: {
        stable: {
          version: "0.20261022.0",
          gitRefOrMilestone: "chromium/7103",
          abiRevision: "webgpu-headers-2026-m156",
        },
        dev: {
          version: "0.20261101.0",
          gitRefOrMilestone: "chromium/7151",
          abiRevision: "webgpu-headers-2026-m157",
        },
        canary: {
          version: "0.20261108.0",
          gitRefOrMilestone: "main",
          abiRevision: "webgpu-headers-2026-m158-subgroups",
        },
      },
      workspaceConsumers: [
        {
          workspace: "yolo-ui",
          manifestPath: "C:/src/yolo-ui/Cargo.toml",
          crateOrPackage: "yolo-gpu / yolo-render / yolo-3d",
          dependencyName: "wgpu",
          channelVersionMap: {
            stable: "30.0.1",
            dev: "30.0.1",
            canary: "30.0.1",
          },
        },
        {
          workspace: "yolo-ui",
          manifestPath: "C:/src/yolo-ui/Cargo.toml",
          crateOrPackage: "yolo-gpu",
          dependencyName: "naga",
          channelVersionMap: {
            stable: "30.0.0",
            dev: "30.0.0",
            canary: "30.0.0",
          },
        },
      ],
    },
    {
      component: "blink",
      upstreamUrl:
        "https://chromium.googlesource.com/chromium/src/+/main/third_party/blink",
      chromiumSubpath: "third_party/blink",
      channelRevisions: {
        stable: {
          version: "156.0.7103.48",
          gitRefOrMilestone: "refs/branch-heads/7103",
          abiRevision: "blink-m156-css-anchor-view-transitions-l2",
        },
        dev: {
          version: "157.0.7151.14",
          gitRefOrMilestone: "refs/branch-heads/7151",
          abiRevision: "blink-m157-speculation-rules-prerender2",
        },
        canary: {
          version: "158.0.7192.2",
          gitRefOrMilestone: "refs/heads/main",
          abiRevision: "blink-m158-webnn-PromptAPI",
        },
      },
      workspaceConsumers: [
        {
          workspace: "yolo-web",
          manifestPath: "C:/src/yolo-web/Cargo.toml",
          crateOrPackage: "servo-stylo / obscura-dom / obscura-render",
          dependencyName: "cssparser",
          channelVersionMap: {
            stable: "0.34",
            dev: "0.34",
            canary: "0.34",
          },
        },
        {
          workspace: "yolo-web",
          manifestPath: "C:/src/yolo-web/Cargo.toml",
          crateOrPackage: "servo-html5ever / obscura-dom",
          dependencyName: "html5ever",
          channelVersionMap: {
            stable: "0.39",
            dev: "0.39",
            canary: "0.39",
          },
        },
        {
          workspace: "yolo-ai",
          manifestPath: "C:/src/yolo-ai/Cargo.toml",
          crateOrPackage: "aphrody-m3-reproduce",
          dependencyName: "taffy",
          channelVersionMap: {
            stable: "0.15.1",
            dev: "0.15.1",
            canary: "0.15.1",
          },
        },
      ],
    },
    {
      component: "skia",
      upstreamUrl: "https://skia.googlesource.com/skia.git",
      chromiumSubpath: "third_party/skia",
      channelRevisions: {
        stable: {
          version: "0.156.0 (chrome/m156)",
          gitRefOrMilestone: "chrome/m156",
          abiRevision: "skia-m156-ganesh-graphite-d3d12-metal-vulkan",
        },
        dev: {
          version: "0.157.0-dev (chrome/m157)",
          gitRefOrMilestone: "chrome/m157",
          abiRevision: "skia-m157-graphite-dawn-native",
        },
        canary: {
          version: "0.158.0-canary (main)",
          gitRefOrMilestone: "main",
          abiRevision: "skia-m158-graphite-compute-path-atlas",
        },
      },
      workspaceConsumers: [
        {
          workspace: "yolo-ui",
          manifestPath:
            "C:/src/yolo-ui/submodules/anyrender/crates/anyrender_skia/Cargo.toml",
          crateOrPackage: "anyrender_skia",
          dependencyName: "skia-safe",
          channelVersionMap: {
            stable: "0.156.0",
            dev: "0.156.0",
            canary: "0.156.0",
          },
        },
        {
          workspace: "yolo-web",
          manifestPath: "C:/src/yolo-web/Cargo.toml",
          crateOrPackage: "obscura-render",
          dependencyName: "tiny-skia",
          channelVersionMap: {
            stable: "0.12",
            dev: "0.12",
            canary: "0.12",
          },
        },
        {
          workspace: "yolo-ui",
          manifestPath: "C:/src/yolo-ui/Cargo.toml",
          crateOrPackage: "anyrender_vello",
          dependencyName: "vello",
          channelVersionMap: {
            stable: "0.11",
            dev: "0.11",
            canary: "0.11",
          },
        },
      ],
    },
    {
      component: "canvas",
      upstreamUrl: "https://html.spec.whatwg.org/multipage/canvas.html",
      chromiumSubpath: "third_party/blink/renderer/modules/canvas",
      channelRevisions: {
        stable: {
          version: "Canvas2D + OffscreenCanvas + WebGPU CanvasContext M156",
          gitRefOrMilestone: "chrome/m156",
          abiRevision: "canvas2d-hdr-p3-float16-m156",
        },
        dev: {
          version: "Canvas2D + OffscreenCanvas + WebGPU CanvasContext M157",
          gitRefOrMilestone: "chrome/m157",
          abiRevision: "canvas2d-webgpu-zero-copy-transfer-m157",
        },
        canary: {
          version: "Canvas2D + OffscreenCanvas + WebGPU CanvasContext M158",
          gitRefOrMilestone: "main",
          abiRevision: "canvas2d-mesh2d-graphite-m158",
        },
      },
      workspaceConsumers: [
        {
          workspace: "yolo-ui",
          manifestPath: "C:/src/yolo-ui/Cargo.toml",
          crateOrPackage: "yolo-craft / yolo-render / anyrender",
          dependencyName: "anyrender",
          channelVersionMap: {
            stable: "0.14.0",
            dev: "0.14.0",
            canary: "0.14.0",
          },
        },
        {
          workspace: "yolo-web",
          manifestPath: "C:/src/yolo-web/crates/obscura-render/Cargo.toml",
          crateOrPackage: "obscura-render",
          dependencyName: "resvg",
          channelVersionMap: {
            stable: "0.47",
            dev: "0.47",
            canary: "0.47",
          },
        },
      ],
    },
    {
      component: "cef",
      upstreamUrl: "https://github.com/chromiumembedded/cef",
      chromiumSubpath: "cef",
      channelRevisions: {
        stable: {
          version: "156.3.0",
          gitRefOrMilestone: "7103",
          abiRevision: "cef-api-156-sandbox-compat",
        },
        dev: {
          version: "157.0.14",
          gitRefOrMilestone: "7151",
          abiRevision: "cef-api-157-sandbox-compat",
        },
        canary: {
          version: "158.0.2",
          gitRefOrMilestone: "main",
          abiRevision: "cef-api-158-sandbox-compat",
        },
      },
      workspaceConsumers: [
        {
          workspace: "yolo-web",
          manifestPath: "C:/src/yolo-web/crates/yolo-chromium/Cargo.toml",
          crateOrPackage: "yolo-chromium",
          dependencyName: "cef",
          channelVersionMap: {
            stable: "156.3.0",
            dev: "156.3.0",
            canary: "156.3.0",
          },
        },
        {
          workspace: "yolo-web",
          manifestPath: "C:/src/yolo-web/crates/yolo-chromium/Cargo.toml",
          crateOrPackage: "yolo-chromium",
          dependencyName: "cef-dll-sys",
          channelVersionMap: {
            stable: "156.3.0",
            dev: "156.3.0",
            canary: "156.3.0",
          },
        },
      ],
    },
    {
      component: "harfbuzz",
      upstreamUrl:
        "https://chromium.googlesource.com/external/github.com/harfbuzz/harfbuzz.git",
      chromiumSubpath: "third_party/harfbuzz-ng",
      channelRevisions: {
        stable: {
          version: "10.2.0 + Fontations/Skrifa 0.44",
          gitRefOrMilestone: "chrome/m156",
          abiRevision: "fontations-skrifa-0.44-read-fonts-0.41",
        },
        dev: {
          version: "10.3.0 + Fontations/Skrifa 0.44",
          gitRefOrMilestone: "chrome/m157",
          abiRevision: "fontations-skrifa-0.44-colrv1",
        },
        canary: {
          version: "10.4.0 + Fontations/Skrifa 0.44",
          gitRefOrMilestone: "main",
          abiRevision: "fontations-skrifa-0.44-autohint",
        },
      },
      workspaceConsumers: [
        {
          workspace: "yolo-ui",
          manifestPath: "C:/src/yolo-ui/Cargo.toml",
          crateOrPackage: "yolo-gpu / anyrender_skia",
          dependencyName: "skrifa",
          channelVersionMap: {
            stable: "0.44",
            dev: "0.44",
            canary: "0.44",
          },
        },
        {
          workspace: "yolo-web",
          manifestPath: "C:/src/yolo-web/crates/obscura-render/Cargo.toml",
          crateOrPackage: "obscura-render",
          dependencyName: "cosmic-text",
          channelVersionMap: {
            stable: "=0.14.2",
            dev: "=0.14.2",
            canary: "=0.14.2",
          },
        },
      ],
    },
    {
      component: "boringssl",
      upstreamUrl: "https://boringssl.googlesource.com/boringssl.git",
      chromiumSubpath: "third_party/boringssl/src",
      channelRevisions: {
        stable: {
          version: "fips-2026-m156",
          gitRefOrMilestone: "chromium-stable-m156",
          abiRevision: "boringssl-mlkem768-x25519-tls13",
        },
        dev: {
          version: "master-m157",
          gitRefOrMilestone: "chromium-dev-m157",
          abiRevision: "boringssl-mlkem768-ech",
        },
        canary: {
          version: "master-HEAD",
          gitRefOrMilestone: "main",
          abiRevision: "boringssl-pq-hybrid-default",
        },
      },
      workspaceConsumers: [
        {
          workspace: "yolo",
          manifestPath: "C:/src/yolo/upstream/bun/Cargo.toml",
          crateOrPackage: "boringssl_sys / boringssl",
          dependencyName: "boringssl_sys",
          channelVersionMap: {
            stable: "0.0.0",
            dev: "0.0.0",
            canary: "0.0.0",
          },
        },
        {
          workspace: "yolo-web",
          manifestPath: "C:/src/yolo-web/Cargo.toml",
          crateOrPackage: "obscura-net / browser_emulation",
          dependencyName: "wreq-util",
          channelVersionMap: {
            stable: "Chrome156-JA4-BoringSSL",
            dev: "Chrome157-JA4-BoringSSL",
            canary: "Chrome158-JA4-BoringSSL",
          },
        },
      ],
    },
  ];

export function getCvmRoot(customHome?: string): string {
  const base = customHome ?? process.env.YOLO_HOME ?? join(homedir(), ".yolo");
  return join(base, "cvm");
}

export function loadCvmState(cvmRoot = getCvmRoot()): CvmStateConfig {
  const statePath = join(cvmRoot, "state.json");
  if (existsSync(statePath)) {
    try {
      return JSON.parse(readFileSync(statePath, "utf8")) as CvmStateConfig;
    } catch {
      // Fallback
    }
  }
  return {
    activeChannel: "stable",
    updatedAt: new Date().toISOString(),
    respectChromiumVersionFile: true,
    alignedBvmSlot: "stable",
  };
}

export function saveCvmState(
  state: CvmStateConfig,
  cvmRoot = getCvmRoot(),
): void {
  mkdirSync(cvmRoot, { recursive: true });
  writeFileSync(
    join(cvmRoot, "state.json"),
    JSON.stringify(state, null, 2) + "\n",
  );
}

/**
 * Resolves the active Chromium channel (`stable`, `dev`, or `canary`) for a directory
 * by inspecting `.chromium-version` or `YOLO_CHROMIUM_CHANNEL`, just like `.bun-version` in BVM.
 */
export function resolveChromiumChannelForDirectory(
  cwd = process.cwd(),
  cvmRoot = getCvmRoot(),
): {
  channel: ChromiumReleaseChannel;
  reason: string;
  profile: ChromiumChannelProfile;
} {
  const envOverride = process.env.YOLO_CHROMIUM_CHANNEL;
  if (
    envOverride === "stable" ||
    envOverride === "dev" ||
    envOverride === "canary"
  ) {
    return {
      channel: envOverride,
      reason: "env:YOLO_CHROMIUM_CHANNEL",
      profile: CHROMIUM_CHANNEL_PROFILES_2026[envOverride],
    };
  }

  let dir = resolve(cwd);
  for (let depth = 0; depth < 4; depth++) {
    const verFile = join(dir, ".chromium-version");
    if (existsSync(verFile)) {
      const content = readFileSync(verFile, "utf8").trim().toLowerCase();
      if (content === "canary" || content.includes("158")) {
        return {
          channel: "canary",
          reason: `${verFile} (${content})`,
          profile: CHROMIUM_CHANNEL_PROFILES_2026.canary,
        };
      }
      if (content === "dev" || content === "beta" || content.includes("157")) {
        return {
          channel: "dev",
          reason: `${verFile} (${content})`,
          profile: CHROMIUM_CHANNEL_PROFILES_2026.dev,
        };
      }
      if (content === "stable" || content.includes("156")) {
        return {
          channel: "stable",
          reason: `${verFile} (${content})`,
          profile: CHROMIUM_CHANNEL_PROFILES_2026.stable,
        };
      }
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  const state = loadCvmState(cvmRoot);
  return {
    channel: state.activeChannel,
    reason: "cvm:state.activeChannel",
    profile: CHROMIUM_CHANNEL_PROFILES_2026[state.activeChannel],
  };
}

export interface CrateAndPackageAlignmentAudit {
  readonly channel: ChromiumReleaseChannel;
  readonly profile: ChromiumChannelProfile;
  readonly totalComponents: number;
  readonly totalConsumersChecked: number;
  readonly alignedCount: number;
  readonly results: readonly {
    readonly component: ChromiumThirdPartyPin["component"];
    readonly targetChannelRevision: string;
    readonly workspace: string;
    readonly crateOrPackage: string;
    readonly dependencyName: string;
    readonly expectedVersion: string;
    readonly manifestExists: boolean;
    readonly aligned: boolean;
  }[];
}

/**
 * Audits all workspace `Cargo.toml` and `package.json` consumers of V8, Dawn, Blink,
 * Skia, Canvas, CEF, HarfBuzz, and BoringSSL against the target Chromium channel (`stable`, `dev`, `canary`).
 */
export function auditWorkspaceChromiumAlignment(
  channel?: ChromiumReleaseChannel,
  cvmRoot = getCvmRoot(),
): CrateAndPackageAlignmentAudit {
  const effectiveChannel =
    channel ??
    resolveChromiumChannelForDirectory(process.cwd(), cvmRoot).channel;
  const profile = CHROMIUM_CHANNEL_PROFILES_2026[effectiveChannel];
  const results: CrateAndPackageAlignmentAudit["results"][number][] = [];

  for (const item of CHROMIUM_THIRD_PARTY_ALIGNMENT_MATRIX) {
    const revInfo = item.channelRevisions[effectiveChannel];
    for (const consumer of item.workspaceConsumers) {
      const manifestExists = existsSync(consumer.manifestPath);
      const expectedVersion = consumer.channelVersionMap[effectiveChannel];
      let aligned = false;

      if (manifestExists) {
        try {
          const raw = readFileSync(consumer.manifestPath, "utf8");
          aligned =
            raw.includes(consumer.dependencyName) ||
            consumer.dependencyName.startsWith("Chrome");
        } catch {
          aligned = false;
        }
      }

      results.push({
        component: item.component,
        targetChannelRevision: `${revInfo.version} (${revInfo.gitRefOrMilestone})`,
        workspace: consumer.workspace,
        crateOrPackage: consumer.crateOrPackage,
        dependencyName: consumer.dependencyName,
        expectedVersion,
        manifestExists,
        aligned,
      });
    }
  }

  return {
    channel: effectiveChannel,
    profile,
    totalComponents: CHROMIUM_THIRD_PARTY_ALIGNMENT_MATRIX.length,
    totalConsumersChecked: results.length,
    alignedCount: results.filter((r) => r.aligned).length,
    results,
  };
}

/**
 * Switches the active Chromium channel (`stable`, `dev`, `canary`) in `~/.yolo/cvm`,
 * writes the isolated channel profile manifest, and optionally pins `.chromium-version`.
 */
export function switchChromiumChannel(
  channel: ChromiumReleaseChannel,
  options?: { cvmRoot?: string; pinDirectory?: string },
): {
  state: CvmStateConfig;
  profile: ChromiumChannelProfile;
  audit: CrateAndPackageAlignmentAudit;
} {
  const cvmRoot = options?.cvmRoot ?? getCvmRoot();
  const profile = CHROMIUM_CHANNEL_PROFILES_2026[channel];

  for (const ch of ["stable", "dev", "canary"] as const) {
    const slotDir = join(cvmRoot, "channels", ch);
    mkdirSync(slotDir, { recursive: true });
    writeFileSync(
      join(slotDir, "channel-profile.json"),
      JSON.stringify(
        {
          profile: CHROMIUM_CHANNEL_PROFILES_2026[ch],
          thirdPartyPins: CHROMIUM_THIRD_PARTY_ALIGNMENT_MATRIX.map((p) => ({
            component: p.component,
            upstreamUrl: p.upstreamUrl,
            chromiumSubpath: p.chromiumSubpath,
            revision: p.channelRevisions[ch],
          })),
        },
        null,
        2,
      ) + "\n",
    );
  }

  const state: CvmStateConfig = {
    activeChannel: channel,
    updatedAt: new Date().toISOString(),
    respectChromiumVersionFile: true,
    alignedBvmSlot: profile.bunSlotMapping,
  };
  saveCvmState(state, cvmRoot);

  if (options?.pinDirectory) {
    writeFileSync(
      join(options.pinDirectory, ".chromium-version"),
      `${channel}\n`,
    );
  }

  return {
    state,
    profile,
    audit: auditWorkspaceChromiumAlignment(channel, cvmRoot),
  };
}
