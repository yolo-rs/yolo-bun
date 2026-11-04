# YOLO Bun

`yolo-bun` is the patch and integration monorepo around upstream Bun. It owns narrow runtime deltas, Bun-native adapters and a Bun-hosted package workflow for YOLO OS. The source mirror `yolo-rs/bun` remains identical to upstream at its pinned commit.

The runtime goal is performance at least matching the same upstream revision. Use Bun 1.4 `check`, `lint`, and `fmt`; use AOT for eligible shipped applications; evaluate the upstream Rust/C++ LTO release path for the runtime. AOT and runtime LTO optimize different artifacts and require separate measurements. Compare identical source, toolchains, flags, hosts and workloads before claiming parity. See [performance policy](docs/PERFORMANCE.md).

## Repository roles

| Repository | Role |
|---|---|
| [`oven-sh/bun`](https://github.com/oven-sh/bun) | Canonical Bun source. Rust-first Cargo workspace with JavaScriptCore/C++ integration and JS/TS sources. |
| [`yolo-rs/bun`](https://github.com/yolo-rs/bun) | Exact fast-forward mirror of upstream. No downstream patches. |
| `yolo-bun` | Minimal Bun patches, Bun-specific adapters, package orchestration, docs/catalogs and userland packaging. |
| `yolo-web` | Chromium, CEF, Obscura and browser-specific integrations, including `bun:chromium` work. |
| `yolo-cross` | Cross toolchains, target builds, Windows/MSVC and sysroots. |
| `yolo-ui` / Bun UI | UI frameworks, Tauri, frontend plugins and frontend integrations. |
| `yolo-os` | LFS image composition, kernel configuration and boot qualification. Bun stays in userland. |

## Package manager for YOLO OS

`bun run packages:backends` probes installed native package tools and prints JSON. It does not verify repositories, privileges or installability.

`bun run packages:install <bun|uv|cargo|flatpak|winget|pacman|vcpkg> <package>` prints a native install plan. Add `--execute` to invoke that backend directly. Bun, uv, Cargo, Flatpak, WinGet, pacman and vcpkg retain their own package formats and transaction semantics. F-Droid is an Android repository/build workflow, not a Linux host package installer. This CLI is an adapter, not yet a reproducible image-plan resolver; see [package-manager architecture](docs/PACKAGE-MANAGER.md).

`bun run packages:resolve vcpkg zlib:x64-windows` and `bun run packages:resolve bun cowsay@1.6.0` delegate to the selected backend's native `--dry-run`. Bun's global dry-run can resolve the existing global manifest, access the network and populate its cache, and may print simulated `installed` lines. These dry-runs do not produce a locked YOLO OS image plan; other backend resolvers are not implemented yet.

The package roadmap covers a locked image plan for `yolo-os`, pacman for the selected Arch-family base, Flatpak/Flathub for sandboxed desktop apps, and opt-in Cargo/rustup, uv and vcpkg developer dependencies. WinGet is a Windows profile backend; F-Droid belongs only to a future Android profile. Omarchy and CachyOS are profile inputs, not package sources to silently merge.

## Runtime and product boundaries

- Keep only runtime changes tied to Bun's own APIs/modules, cookie and environment behavior, Linux/Windows core APIs, or Node/V8 compatibility. Verify Bun 1.4 does not already provide the behavior; prefer upstreaming and make downstream patches minimal, pinned and temporary.
- Bun's package manager owns JavaScript/TypeScript dependencies. Other package ecosystems retain their resolvers, locks, signatures and repositories.
- Browser engines and Chromium/CEF/Obscura integrations belong in `yolo-web`; cross-compilation and MSVC belong in `yolo-cross`; Tauri, UI frameworks and frontend work belong in `yolo-ui`.
- Keep kernel and OS image policy in `yolo-os`. Bun may run as `/init` in a qualified userland PID 1 profile; it does not run in kernel ring 0.

## Current evidence

- `yolo-rs/bun` was synchronized to upstream `main` at `e57d89ba63a7504957faa2ccc8f416ce2fb15453` on 2026-11-04.
- `bun run source:prepare` prints the plan to materialize that exact mirror revision in an ignored disposable directory and apply the SHA-256-locked patch queue. The current queue is empty; no runtime divergence is claimed yet.
- `scripts/package-install.ts` creates argument-safe native plans for Bun, uv, Cargo, Flatpak, WinGet, pacman and vcpkg. `--execute` runs the selected executable without a shell; it can alter the selected environment or host.
- The runtime harness compares process startup, a JavaScript compute loop and 50 sequential loopback HTTP requests. Its self-check compares one executable to itself; neither artifact is a performance claim for yolo-bun runtime changes.
- Initial adapters include a read-only MCP server, a TypeScript LSP launcher, a Bun bundler catalog plugin, and a source-cited agent skill. They are separate from upstream Bun CLI features and have not been built or tested here.
- BunOS's Apache-2.0 PID 1 prototype is preserved in `packages/bunos-init`; root discovery, LFS switch-root, complete service handoff and image boot qualification remain open.
- Linux identifies its current mainline release as `7.4-rc1`; `v7.4.1-rc` was not found. Bun belongs in userland via `/init` and `rdinit=/init`.
- Asterinas supports an initramfs first-user process in principle, but syscall coverage is partial and no Bun boot is verified.
- BunOS fork commands `bun mcp`, `bun lsp`, and `bun agent-plugin` are not established upstream Bun features.

## Layout

```text
yolo-bun/
├── catalog/                 # Source-linked Bun project and Awesome Bun indexes
├── docs/                    # Architecture, upstream facts, performance, packages, OS profiles
├── factory/                 # Userland/initramfs integration profiles
├── packages/                # PID 1, MCP/LSP, agent and Bun plugin adapters
├── patches/                 # Minimal, version-pinned runtime patches
└── scripts/                 # Benchmark and native package-manager adapters
```

See [architecture](docs/ARCHITECTURE.md), [performance policy](docs/PERFORMANCE.md), [package-manager plan](docs/PACKAGE-MANAGER.md), [upstream facts](docs/UPSTREAM.md), [BunOS port map](docs/BUNOS-PORT.md), and [Linux/Asterinas boot boundaries](docs/OS-BOOT.md).
