# YOLO Bun

`yolo-bun` is the integration monorepo around upstream Bun. It owns Bun-native adapters and a Bun-hosted package workflow for YOLO OS. Its runtime patch queue is empty; the source mirror `yolo-rs/bun` remains identical to upstream at its pinned commit.

The runtime goal is performance at least matching the same upstream revision. Use Bun 1.4 `check`, `lint`, and `fmt`; use AOT for eligible shipped applications; evaluate the upstream Rust/C++ LTO release path for the runtime. AOT and runtime LTO optimize different artifacts and require separate measurements. Compare identical source, toolchains, flags, hosts and workloads before claiming parity. See [performance policy](docs/PERFORMANCE.md).

## Repository roles

| Repository                                      | Role                                                                                                     |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| [`oven-sh/bun`](https://github.com/oven-sh/bun) | Canonical Bun source. Rust-first Cargo workspace with JavaScriptCore/C++ integration and JS/TS sources.  |
| [`yolo-rs/bun`](https://github.com/yolo-rs/bun) | Exact fast-forward mirror of upstream. No downstream patches.                                            |
| `yolo-bun`                                      | Bun-specific adapters, package orchestration, docs/catalogs and userland packaging; runtime queue empty. |
| `yolo-web`                                      | Chromium, CEF, Obscura and browser-specific integrations, including `bun:chromium` work.                 |
| `yolo-cross`                                    | Cross toolchains, target builds, Windows/MSVC, sysroots and platform build patches.                      |
| `yolo-ui` / Bun UI                              | UI frameworks, Tauri, frontend plugins and frontend integrations.                                        |
| `yolo-os`                                       | LFS image composition, kernel configuration and boot qualification. Bun stays in userland.               |

## Package manager for YOLO OS

`bun run yolo pkg backends` probes installed native package tools and prints JSON. On Linux it also reads `/etc/os-release` to identify an Arch, CachyOS or Omarchy pacman profile. It does not verify repositories, privileges or installability.

`bun run yolo pkg install <bun|uv|cargo|flatpak|winget|pacman|nix|vcpkg|fdroid|play-store> <package>` prints a native install plan. Add `--execute` to invoke that backend directly. Bun, uv, Cargo, Flatpak, WinGet, pacman, Nix, vcpkg, F-Droid and Google Play / Android 17 x64 (`play-store` via `sdkmanager`) retain their native package formats and transaction behavior. F-Droid operations use an already installed `fdroidcl` plus ADB to manage apps on a connected Android device; `yolo pkg fdroid <search|show|update|install|upgrade|remove|devices|repos> ... [--execute]` maps to native commands. The `play-store` adapter targets Android 17 x64 Google Play and GoogleBook 2026 (`system-images;android-37.1;android-desktop;x86_64`, `system-images;android-37.0;google_apis_playstore;x86_64`, ChromiumOS and Aluminium OS profiles). `yolo pkg resolve` supports Bun, vcpkg, Nix and `play-store` dry-runs/resolutions. `yolo pkg image-plan` uses schema v2 source and target declarations; these record ownership but do not configure or verify repositories. See [package-manager architecture](docs/PACKAGE-MANAGER.md).

`yolo pkg manage <backend> <search|list|installed|upgrade|remove> [query-or-package] [--execute]` maps native search for Flatpak, WinGet, Cargo, pacman, Nix and vcpkg, and installed listings for Bun, uv, Cargo, Flatpak, WinGet, pacman, Nix, vcpkg and `play-store`. Bun, uv and `play-store` do not have native package-search commands, so their search operation is rejected. Upgrade and remove print a plan until `--execute` is added. See the architecture doc for system-wide pacman upgrades, vcpkg Classic-mode upgrade limits, and each backend's scope.

`bun run packages:resolve vcpkg zlib:x64-windows` and `bun run packages:resolve bun cowsay@1.6.0` delegate to the selected backend's native `--dry-run`. Bun's global dry-run can resolve the existing global manifest, access the network and populate its cache, and may print simulated `installed` lines. These dry-runs do not produce a locked YOLO OS image plan; other backend resolvers are not implemented yet.

The package roadmap covers locked `yolo-os` image plans, pacman for the selected Arch-family base, Flatpak/Flathub for desktop apps, and opt-in Cargo/rustup, uv and vcpkg developer dependencies. WinGet install mapping is for Windows workflows. The `fdroidcl` adapter manages connected Android devices; adding F-Droid packages to a built YOLO OS image still depends on an Android profile. Omarchy and CachyOS are distribution profile inputs whose pacman sources must be declared explicitly, not package sources to silently merge.

## Runtime and product boundaries

- Keep only runtime changes tied to Bun's own APIs/modules, cookie and environment behavior, Linux/Windows core APIs, or Node/V8 compatibility. The pinned upstream already contains cookie-map, dotenv, Windows system and V8 compatibility implementations, so first identify a concrete gap; prefer upstreaming and make any downstream patch minimal, pinned and temporary.
- Bun's package manager owns JavaScript/TypeScript dependencies. Other package ecosystems retain their resolvers, locks, signatures and repositories.
- Browser engines and Chromium/CEF/Obscura integrations belong in `yolo-web`; cross-compilation, MSVC and FFI shims belong in `yolo-cross`; a focused native `bun:windows` runtime API may be contributed here; Tauri, UI frameworks and frontend work belong in `yolo-ui`.
- Keep kernel, OS image policy, PID 1 and initramfs build code in `yolo-os`. Bun may run as `/init` in a qualified userland profile; it does not run in kernel ring 0.

## Current evidence

- `upstream/bun` is a local ignored, shallow checkout of the earlier upstream snapshot `05a0ec93`; it does not match the current source-lock revision `e57d89ba`. It is clean and detached, with no declared Git submodules, and is not yet a built or modified YOLO runtime. See [the source receipt](docs/receipts/bun-upstream-checkout.json).
- The current locked revision `e57d89ba` was independently materialized from that local object store at `vendor/bun-e57d89ba63a7`; it has no Git object alternates and the patch queue was empty. See [the preparation receipt](docs/receipts/bun-prepared-source.json). No runtime build or parity claim follows from source preparation.

- `yolo-rs/bun` was synchronized to upstream `main` at `e57d89ba63a7504957faa2ccc8f416ce2fb15453` on 2026-11-04.
- Bun 1.4.4-canary.1 `fmt`, `check`, and `lint` completed; `check` reported no type errors in 10 files and `lint` no problems. `bun check --aot` reported no type errors across 113 files, with dependency regexes marked for interpreter execution; it did not build a binary. See the [AOT analysis receipt](docs/receipts/aot-check.json).
- `bun run source:prepare` prints the plan to materialize that exact mirror revision in an ignored disposable directory. `--source-cache upstream/bun` can fetch the pinned commit from an existing local Git object store while keeping a separate checkout. Add `--execute` to materialize it. The runtime patch queue is empty; the Windows build-system patch belongs to `yolo-cross`. A Windows release/ThinLTO build with MSVC 14.51 stalled on an AOT fixture and showed an ABI mismatch with prebuilt WebKit. A separate build using the matching 14.44 CRT/SDK completed and compiled and ran the fixture; see the [build receipt](docs/receipts/windows-bun-msvc1444-build.json), [AOT smoke receipt](docs/receipts/windows-aot-msvc1444-smoke.json), and [investigation](docs/receipts/windows-aot-investigation.json). Broader AOT and performance qualification remain open.
- `scripts/package-install.ts` creates argument-safe native plans for Bun, uv, Cargo, Flatpak, WinGet, pacman, vcpkg and `fdroidcl`. `--execute` runs the selected executable without a shell; it can alter the selected environment, host or connected Android device.
- The runtime harness compares process startup, a JavaScript compute loop and 50 sequential loopback HTTP requests. A [cross-revision smoke comparison](docs/receipts/windows-runtime-cross-revision-smoke.json) recorded slower candidate medians for these narrow workloads. Different revisions and potentially different toolchains prevent attributing the difference or claiming upstream parity.
- The Bun-native catalog bundler plugin passed a Bun 1.4.4 smoke bundle. The read-only Bun catalog MCP adapter moved to `yolo-ai` and passed initialize/list/tool-call smoke. The generic TypeScript LSP launcher and agent-skill package placeholder were removed from the active workspace after snapshotting.
- BunOS fork commands `bun mcp`, `bun lsp`, and `bun agent-plugin` are not established upstream Bun features.

## Layout

```text
yolo-bun/
├── catalog/                 # Source-linked Bun project and Awesome Bun indexes
├── docs/                    # Architecture, upstream facts, performance, packages, OS profiles
├── packages/                # Bun-native bundler plugin integration
├── patches/                 # Minimal, version-pinned runtime patches
└── scripts/                 # Benchmark and native package-manager adapters
```

See [architecture](docs/ARCHITECTURE.md), [performance policy](docs/PERFORMANCE.md), [package-manager plan](docs/PACKAGE-MANAGER.md), [upstream facts](docs/UPSTREAM.md), and [BunOS port map](docs/BUNOS-PORT.md). Linux/Asterinas boot policy is maintained by the separate `yolo-os` repository.
