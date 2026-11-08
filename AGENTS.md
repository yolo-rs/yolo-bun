# AGENTS.md — yolo-bun (Autonomous AI Operations)

## 1. Role & Identity
This repository is the canonical sovereign pillar **yolo-bun** in the YOLO Fleet.
- Package Manager: `bun@1.4.4-canary.1`
- Upstream Engine: `upstream/bun` (`https://github.com/oven-sh/bun.git`), monitored via `upstream-watch`, compiled with hermetic MSVC / `xwin` headers in `vendor/` to produce AOT binaries in `artifacts/`.
- Retained Core Packages (`packages/`): `bun-loaders`, `package-converter`, `bun-workspace`, `yolo-bun-plugin`.
- Toolchains: Rust 2024 (edition 2024, resolver 2/3), Bun v1.4.4+, Python uv

## 2. Standard Development Workflows
- **Check**: `bun run check`
- **Test**: `bun test ./scripts`
- **Lint & Format**: `bun run lint && bun run fmt`
- **Slice Execution**: `bun run C:/src/yolo/scripts/slice.ts run <slice-name>`

## 3. Anti-Context Saturation Rules
- Never load all workspace crates simultaneously if not required.
- Query symbols via local AST index or run targeted slices.
- Strictly adhere to NHITL protocol: no emojis, concise factual logs.
