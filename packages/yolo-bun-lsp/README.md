# yolo-bun LSP adapter

Planned launcher and workspace configuration for a selected TypeScript language server with Bun type definitions. BunOS's `bunos lsp` wrapper selected `tsgo` or `typescript-language-server`; upstream `bun fmt` has no LSP.

This package launches `tsgo --lsp --stdio` when available, otherwise `typescript-language-server --stdio`, and forwards stdio directly. It is a TypeScript LSP launcher, not a Bun-native language server. Implementation is present but has not been tested in this workspace.
