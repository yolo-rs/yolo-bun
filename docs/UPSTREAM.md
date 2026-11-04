# Bun upstream facts

Snapshot date: 2026-11-04. Sources are official GitHub repositories and commit-pinned files; no Context7 data is used for this Bun port.

| Fact | Evidence |
|---|---|
| Bun is a JavaScript runtime and toolkit with a Rust-first implementation. | [Upstream README at `e57d89ba`](https://github.com/oven-sh/bun/blob/e57d89ba63a7504957faa2ccc8f416ce2fb15453/README.md); current GitHub metadata marks Rust as the primary language. |
| Upstream uses a large Cargo workspace (134 members under `src/` at this snapshot), with JavaScriptCore integration and C/C++ sources. | [Pinned Cargo.toml](https://github.com/oven-sh/bun/blob/e57d89ba63a7504957faa2ccc8f416ce2fb15453/Cargo.toml), [runtime](https://github.com/oven-sh/bun/tree/e57d89ba63a7504957faa2ccc8f416ce2fb15453/src/runtime), [bundler](https://github.com/oven-sh/bun/tree/e57d89ba63a7504957faa2ccc8f416ce2fb15453/src/bundler), [transpiler](https://github.com/oven-sh/bun/tree/e57d89ba63a7504957faa2ccc8f416ce2fb15453/src/transpiler). |
| Latest stable release observed was v1.4.4 (published 2026-10-22). | [Official release](https://github.com/oven-sh/bun/releases/tag/bun-v1.4.4). `main` is the canary/development source input, not a claim that v1.4.4 is a canary. |
| Bun 1.4 adds native APIs/modules and developer tools, including `bun check`, `bun lint`, `bun fmt`, and AOT compilation; v1.4 release notes also document `Bun.Image`, `Bun.WebView`, `Bun.markdown`, `Bun.cron()`, `Bun.Terminal`, and expanded Node compatibility. | [Bun 1.4 overview](https://bun.com/blog/bun-v1.4), [AOT/trim docs](https://bun.com/docs/compiler/size), [Bun APIs](https://bun.com/docs/runtime/bun-apis). Check the pinned upstream source before proposing a downstream implementation. |
| Bun's own runtime release build uses a project-specific Rust/C++ LTO pipeline; generic Cargo `lto=true` is not an equivalent substitute. | [Pinned upstream Cargo profile](https://github.com/oven-sh/bun/blob/e57d89ba63a7504957faa2ccc8f416ce2fb15453/Cargo.toml), [Rust build integration](https://github.com/oven-sh/bun/blob/e57d89ba63a7504957faa2ccc8f416ce2fb15453/scripts/build/rust.ts), [Windows build notes](https://github.com/oven-sh/bun/blob/e57d89ba63a7504957faa2ccc8f416ce2fb15453/docs/project/building-windows.mdx). |
| Bun provides runtime and bundler plugin APIs. | [Runtime plugin docs](https://github.com/oven-sh/bun/blob/e57d89ba63a7504957faa2ccc8f416ce2fb15453/docs/runtime/plugins.mdx) and [bundler plugin docs](https://github.com/oven-sh/bun/blob/e57d89ba63a7504957faa2ccc8f416ce2fb15453/docs/bundler/plugins.mdx). |
| Upstream has agent-friendly init/check behavior, not a general agent runtime. | [Template init docs](https://github.com/oven-sh/bun/blob/e57d89ba63a7504957faa2ccc8f416ce2fb15453/docs/runtime/templating/init.mdx) and [check docs](https://github.com/oven-sh/bun/blob/e57d89ba63a7504957faa2ccc8f416ce2fb15453/docs/runtime/check.mdx). |
| Upstream has no first-party MCP server established by this audit. | Search of official `oven-sh/bun` source/docs did not find an MCP implementation. The BunOS fork command routed to `aphrody-mcp`; see [BunOS port map](BUNOS-PORT.md). |
| The built-in `bun fmt` has no LSP. | [Official formatter migration guide](https://github.com/oven-sh/bun/blob/e57d89ba63a7504957faa2ccc8f416ce2fb15453/docs/guides/format/migrate-from-oxfmt.mdx). This does not rule out third-party editor integrations. |

## Mirror and fork state

- `yolo-rs/bun` is a direct fork of `oven-sh/bun`. It had been 5 commits behind and 0 ahead, then was fast-forward synchronized on 2026-11-04 to `e57d89ba63a7504957faa2ccc8f416ce2fb15453`. Keep it at upstream `main`.
- `aphrody-labs/bun` is an archived fork of the same upstream, with a divergent history. Its latest commit observed was `7c57ac563e12c35be817697c4b5488b0fd64cc09` (2026-10-28). GitHub compare reports a large shared-history divergence; that count is not a count of Aphrody-authored commits.
- The archived fork README describes BunOS-specific commands (`bun mcp`, `bun lsp`, `bun agent-plugin`) and integration APIs. These must be ported as `yolo-bun` adapters, not copied into the exact upstream mirror or described as upstream features.

The word **canary** in this repository means the current `oven-sh/bun` development branch, pinned by commit. Use a versioned stable release for reproducible image builds unless the image profile explicitly opts into a canary lane.
