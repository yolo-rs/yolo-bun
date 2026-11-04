---
name: yolo-bun
description: Work on Bun upstream mirrors, yolo-bun integration packages, plugin/MCP/LSP adapters, and userland boot profiles using pinned GitHub sources.
---

# yolo-bun agent guidance

- Read `docs/UPSTREAM.md`, `docs/ARCHITECTURE.md`, and `docs/OS-BOOT.md` before changing runtime or boot integration.
- Keep `yolo-rs/bun` byte-for-byte aligned with `oven-sh/bun` at its pinned upstream commit. Put integration work in `yolo-bun`.
- Bun is Rust-first and organized as Cargo crates, with JavaScriptCore/C++ integration and JS/TS sources. Do not describe it as Zig or literally Rust-only.
- Do not attribute `bun mcp`, `bun lsp`, or `bun agent-plugin` from archived Aphrody forks to Bun upstream. This repository's MCP server and LSP launcher are separate yolo-bun commands.
- Keep Bun in user space. The Linux target is an initramfs executable at `/init` via `rdinit=/init`; do not embed a JS runtime in ring 0.
- Preserve source path, exact commit, SPDX identifier, and license text for every migrated BunOS file.
- Treat Asterinas support as experimental until a pinned Bun binary boots and required syscalls/library dependencies are recorded.
