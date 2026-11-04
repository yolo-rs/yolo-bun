# Agent, MCP and LSP adapters

## Agent

Bun upstream contains limited agent-aware developer behavior, such as writing agent instruction files from `bun init` and adapting `bun check` output under agent environments. It is not a general autonomous agent runtime.

The BunOS `bun agent-plugin` command is a fork-specific entrypoint routed through BunOS agent-plugin automation. The initial `yolo-bun-agent` package contributes an agent skill that points to pinned sources and ownership boundaries. It is not an autonomous agent runtime. Future adapters should consume neutral `yolo-ai` model/tool/agent contracts and `yolo-plugins` provider/catalog interfaces. Keep API keys, provider selection, autonomy policy and user approvals caller-owned.

## MCP

The audited upstream Bun source did not establish a first-party MCP server. BunOS `bunos mcp` routes into `aphrody-mcp`; the wrapper is not an independent MCP implementation. The first yolo-bun MCP package is a read-only stdio server with two tools: `list_bun_projects` and `get_bun_upstream`. It uses the [official Model Context Protocol TypeScript server SDK v2.4.0](https://github.com/modelcontextprotocol/typescript-sdk/tree/v2.4.0), whose upstream README documents Bun support. It reads only the local project catalog and source lock. Domain operations remain with their owning services. The implementation is present but has not been tested in this workspace.

## LSP

Upstream's formatter migration guide says `bun fmt` has no language server. BunOS's `bunos lsp` wrapper chooses `tsgo --lsp --stdio` or `typescript-language-server --stdio`; another fork-specific `bun lsp` capability is not proof of an upstream Bun LSP.

The yolo-bun LSP package launches `tsgo --lsp --stdio` when available, otherwise `typescript-language-server --stdio`, and forwards stdin/stdout/stderr. It is a wrapper around an external TypeScript language server, not a Bun-native server. The implementation is present but has not been tested in this workspace.

## Bundler plugin and agent skill

`packages/yolo-bun-plugin` implements the upstream Bun bundler plugin contract and resolves `yolo-bun:catalog` to a virtual module. `packages/yolo-bun-agent/skills/yolo-bun/SKILL.md` provides agent guidance. Marketplace signing/export remains owned by `yolo-plugins`; these assets are not published there yet.

## Agent-facing source precedence

1. Pinned `oven-sh/bun` source and docs for upstream runtime behavior.
2. Pinned `yolo-rs/bun` mirror for the same source; it must match upstream.
3. `aphrody-labs/bun` and `bun-os-archive` for historical fork-specific behavior, with explicit attribution and license.
4. `yolo-bun` docs for planned integrations and qualification state.
