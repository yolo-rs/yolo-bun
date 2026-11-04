# Architecture and ownership

## Repository roles

```text
oven-sh/bun (canonical upstream)
        │ exact source mirror; fast-forward only
        ▼
yolo-rs/bun (no downstream commits)
        │ pinned source + minimal patch queue
        ▼
yolo-bun (Bun runtime integration and package orchestration)
   ├── yolo-web     browser engines, Chromium, CEF, Obscura, browser integrations
   ├── yolo-cross   cross toolchains, targets, Windows/MSVC, sysroots
   ├── yolo-ui      UI frameworks, Tauri, frontend and UI plugins
   ├── yolo-plugins cross-host plugin/skill catalog, distribution and signing
   ├── yolo-ai      provider-neutral agent/model/tool contracts
   ├── yolo-standards neutral schemas and compatibility vocabulary
   └── yolo-os      LFS image, package selection and boot qualification
```

`yolo-rs/bun` follows upstream source byte-for-byte at its pinned revision. Never put a downstream patch, feature branch, release change or generated integration file in that mirror. `yolo-bun` owns a patch queue and integration code kept separate from the imported source. Every patch names the upstream base SHA, rationale, owner, compatibility surface, benchmark impact, and the upstream issue/PR or reason it cannot be upstreamed yet.

## Runtime scope

Keep changes tied to Bun's runtime/toolkit structure: runtime APIs and modules, JSCore/Node/V8 compatibility, environment and cookie behavior, and the core Linux/Windows interfaces needed by Bun itself. The current pinned source already has cookie-map, dotenv/environment, Windows system and V8/Node compatibility implementations. Treat requested work on those areas as a parity-gap audit first; do not port the same surface from Aphrody's older fork. Prefer an upstream contribution. A downstream patch is a temporary, minimal delta with upstream fixtures preserved and an explicit removal condition.

Do not absorb Chromium, `bun:chromium`, CEF, Obscura or Google/browser-specific integrations (`yolo-web`); cross compilation, sysroots, toolchain packaging, Windows/MSVC implementation (`yolo-cross`); Tauri, frontend frameworks, UI plugin ecosystems or Bun UI (`yolo-ui`). A Bun-native `bun:windows` API may be a runtime contribution; cross-target compilation and the independent FFI adapter belong to `yolo-cross`. Keep OS image assembly and boot policy in `yolo-os`.

## Bun 1.4 development and release policy

- Run Bun's `bun check`, `bun lint`, and `bun fmt` as the canonical JS/TS source quality commands. Preserve and use upstream Rust/C++ checks and formatting for those languages; do not replace them with a parallel toolchain.
- Use `bun build --compile --aot` / `Bun.build({ compile: { aot: true } })` for eligible, pinned JS/TS applications and OS tools. AOT is an application packaging/startup optimization, not a substitute for optimizing Bun's own runtime binary.
- Build the runtime using upstream's release pipeline and LTO settings first. Evaluate changes to ThinLTO, cross-language Rust/C++ LTO, codegen units, PGO/orderfiles or target flags only as separate, reproducible experiments. Do not assume generic Cargo `lto=true` is equivalent to Bun's current build pipeline.
- Keep the full upstream feature set. Any component trimming or feature removal is an explicit artifact profile with capability metadata; it cannot silently change the general `bun` CLI distributed to developers.
- Gate performance claims against the exact upstream base with identical toolchains, compiler versions, build flags, target features, hardware, workload and measurement procedure. Compare startup, steady-state JS, HTTP, streams, file I/O, package install, bundling, test/check/lint/fmt and memory where the change touches those paths. Preserve raw samples and binary/source hashes.
- Upstream releases and canary snapshots are separate channels. Pin source SHA and artifact checksums; never describe canary as a stable release.

## YOLO OS package-manager role

`yolo-bun` supplies a Bun-hosted CLI/planner and typed adapters. Bun's own package manager remains the owner for JavaScript and TypeScript dependencies. System and language package ecosystems remain authoritative in their domains; adapters invoke their native tools and retain their metadata, signatures, lockfiles, trust roots and transaction behavior. See [package-manager architecture](PACKAGE-MANAGER.md).

The OS consumes pinned package plans from `yolo-bun`; `yolo-os` decides which packages enter an image, builds the image, and owns boot receipts. Bun remains a userland process and may be PID 1 only in a separately qualified profile.

## Plugin and agent ownership

Bun's runtime/bundler plugins are Bun-local extension points. `yolo-bun` defines Bun-specific discovery and compatibility metadata; `yolo-plugins` owns cross-host catalog publication, sync and signing. `yolo-ai` owns provider-neutral agent/tool contracts. Keep credentials, autonomy policy and interactive approvals with the caller.

## Change review checklist

1. Is the requested behavior already in the pinned Bun upstream?
2. Is it needed by Bun runtime, CLI, or package-manager operation? If not, route it to the owning sibling repository.
3. Can it be upstreamed? Record the PR/issue and keep only the temporary compatibility patch downstream.
4. Is its feature, licensing, platform and binary impact explicit?
5. Does the same-revision performance receipt show no material regression across affected workloads?
6. Is the package/adaptor metadata source-pinned and delegated to the actual ecosystem authority?
