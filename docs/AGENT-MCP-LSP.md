# Agent, MCP and LSP adapters

## Agent

Bun upstream contains limited agent-aware developer behavior, such as writing agent instruction files from `bun init` and adapting `bun check` output under agent environments. It is not a general autonomous agent runtime.

The BunOS `bun agent-plugin` command is a fork-specific entrypoint routed through BunOS agent-plugin automation. The initial `yolo-bun-agent` package was only an agent-skill placeholder; its snapshot is preserved outside this workspace and it is no longer an installable package. Agent and model contracts belong to `yolo-ai`; cross-host skill/catalog distribution belongs to `yolo-plugins`. Keep API keys, provider selection, autonomy policy and user approvals caller-owned.

## MCP

The audited upstream Bun source did not establish a first-party MCP server. BunOS `bunos mcp` routes into `aphrody-mcp`; that shim is not the implementation below and has not been represented as a product port. The separate read-only yolo-bun catalog server now lives in `yolo-ai/scripts/bun-catalog-mcp.ts`. It exposes `list_bun_projects` and `get_bun_upstream` for an explicitly supplied local checkout, uses the [official Model Context Protocol TypeScript server SDK v2.4.0](https://github.com/modelcontextprotocol/typescript-sdk/tree/v2.4.0), and does not run commands, modify files, read credentials or contact remote services. MCP initialize/list/tool-call smoke passed with stable Bun 1.4.4.

## LSP

Upstream's formatter migration guide says `bun fmt` has no language server. BunOS's `bunos lsp` wrapper chooses `tsgo --lsp --stdio` or `typescript-language-server --stdio`; another fork-specific `bun lsp` capability is not proof of an upstream Bun LSP.

The temporary yolo-bun LSP package only selected and launched an external TypeScript server. It had no Bun-native LSP implementation or in-workspace caller, so it was removed from the active workspace after snapshotting its source. Install and launch `tsgo` or `typescript-language-server` directly when an editor needs one.

## Bundler plugin and agent skill

`packages/yolo-bun-plugin` implements the upstream Bun bundler plugin contract and resolves `yolo-bun:catalog` to a virtual module. A Bun 1.4.4 smoke bundle resolved the catalog and emitted seven records; no permanent package test is claimed. Marketplace signing/export remains owned by `yolo-plugins`.

## Agent-facing source precedence

1. Pinned `oven-sh/bun` source and docs for upstream runtime behavior.
2. Pinned `yolo-rs/bun` mirror for the same source; it must match upstream.
3. `aphrody-labs/bun` and `bun-os-archive` for historical fork-specific behavior, with explicit attribution and license.
4. `yolo-bun` docs for planned integrations and qualification state.
