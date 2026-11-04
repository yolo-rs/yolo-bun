# yolo-bun MCP adapter

Read-only Bun-hosted MCP server for the pinned Bun source and project catalog. Domain operations remain with their owning Rust services. BunOS's `bunos mcp` shim routed to Aphrody MCP and is not being represented as the implementation here.

The package uses the official Model Context Protocol TypeScript server SDK, which documents Bun as a supported runtime. It exposes `list_bun_projects` and `get_bun_upstream`; it does not run shell commands, modify repositories, or access secrets. Implementation is present but has not been tested in this workspace.
