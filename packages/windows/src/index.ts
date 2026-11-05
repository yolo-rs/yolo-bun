// SPDX-License-Identifier: Apache-2.0
// @yolo/windows: Windows core APIs on unmodified upstream Bun.
//
//   win32, registry, services, shell   bun:ffi (no build)
//   bun:windows and bun:winrt          opt-in compatibility aliases (bun-plugin.ts)
//
// The historical winreg alias maps to ./registry; @yolo/winclean keeps its public API.
export * as win32 from "./win32";
export * as registry from "./registry";
export * as services from "./services";
export * as shell from "./shell";
export { WindowsError, type WindowsErrorCode } from "./errors";
