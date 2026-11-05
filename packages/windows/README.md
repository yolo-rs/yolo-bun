# @yolo/windows

Windows core APIs for Bun: Win32 through `bun:ffi`, registry, services, and shell folders. These functions run on Windows and reject unsupported hosts.

```sh
bun add @yolo/windows
```

## Compatibility modules: `bun:windows` and `bun:winrt`

`src/bun-plugin.ts` provides optional aliases for the Windows APIs on upstream Bun. Register it explicitly with `Bun.plugin()`:

- `bun:winrt` (`src/fork/winrt.ts`): the fork projection, metadata read from `System32\WinMetadata` by the ECMA-335
  reader `src/fork/winmd.ts`, activation through `RoGetActivationFactory`, vtable calls through `bun:ffi`, IAsync
  results as Promises. Completion handlers are free-threaded COM delegates (`src/fork/com-delegate.ts`: x86-64
  IUnknown stubs plus a `threadsafe` JSCallback), replacing the fork native `com.rs`.
- `bun:windows` (`src/fork/windows.ts`): version, systemInfo, isElevated, registry, services (read-only), clipboard,
  known folders, processes, memory and the PE/Authenticode parsers, in the fork shapes, over this package.

License: Apache-2.0. Source: https://github.com/yolo-rs/yolo-bun/tree/main/packages/windows

The typed windows-rs Node-API provider is owned separately by yolo-os as
`@yolo-rs/windows-winrt`. WinUI and the BunOS device-driver client are separate
integrations. This package does not claim complete parity with Bun's historical
`bun:windows` runtime module.
