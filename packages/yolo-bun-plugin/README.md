# yolo-bun catalog plugin

This package implements a Bun bundler plugin that resolves `yolo-bun:catalog` to a virtual ES module containing the local project catalog. It exercises Bun's upstream bundler plugin API; it does not create or modify an upstream CLI command. A Bun 1.4.4 smoke build resolved the virtual module and ran the bundled output, which reported seven catalog entries. This is a focused smoke check, not a permanent package test or marketplace qualification.

```ts
import { yoloBunCatalogPlugin } from "@yolo-rs/bun-plugin-catalog";

await Bun.build({
  entrypoints: ["./src/index.ts"],
  plugins: [yoloBunCatalogPlugin],
});
```

```ts
import projects from "yolo-bun:catalog";
```
