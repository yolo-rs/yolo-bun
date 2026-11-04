# Bun 1.4 feature and performance policy

This policy is for maintaining upstream-level Bun runtime performance while using Bun 1.4 features fully in development and OS tooling. It separates source quality, application compilation, and runtime compilation because they optimize different artifacts.

## Use the upstream toolchain

| Capability                  | Use in yolo-bun                                                                                                                            | Scope                                      |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------ |
| `bun check`                 | Type-check JS/TS source and declarations, including AOT eligibility where applicable.                                                      | Source validation / compiler analysis.     |
| `bun lint`                  | Lint JS/TS using Bun's native linter.                                                                                                      | Source quality.                            |
| `bun fmt`                   | Format JS/TS using Bun's native formatter.                                                                                                 | Source formatting.                         |
| Bun native APIs/modules     | Prefer Bun's built-in APIs for supported runtime operations; avoid vendored duplicate packages when the native surface is sufficient.      | Shipped Bun applications and runtime work. |
| `bun build --compile --aot` | Produce standalone AOT executables for eligible fixed-entrypoint tools and services; inspect AOT diagnostics and dynamic-code limitations. | Application binaries, not Bun itself.      |
| Bun release LTO             | Use the exact upstream release configuration as baseline, including its cross-language Rust/C++ LTO pipeline.                              | Bun runtime binary.                        |

The published Bun 1.4 documentation describes AOT trimming and `bun check --aot`; it also lists `bun lint`, `bun fmt`, `bun check`, package management and AOT as separately trimmable executable capabilities. AOT may be blocked by dynamic `eval`, `Function`, imports, native addons, `bun:ffi`, Bun plugins, externals or other runtime-code paths. Retain required features and record why trimming is blocked.

## Runtime patch bar

- First confirm Bun 1.4 upstream lacks the API or behavior. Keep Node.js/V8-facing compatibility changes within Bun's actual compatibility contracts; don't create a private fork of Node or V8.
- For cookies, environment loading, Linux syscalls/OS APIs and Windows core APIs, isolate the change to the runtime boundary that needs it. Prefer a small adapter behind existing Bun abstractions.
- Include upstream fixtures and test expectations in the patch. Keep the patch rebased to a single recorded upstream SHA and identify an upstream PR or a concrete reason to carry it downstream.
- No unrelated UI, browser engine, cross-toolchain or OS distribution behavior belongs in a runtime patch.

## Performance evidence

Compare upstream and candidate from the same source SHA, same submodule/dependency revisions, Rust/C++ compiler versions, linker, build profile, LTO/PGO/orderfile settings, target CPU baseline, operating system and hardware. Alternate run order, warm consistently, report distributions and retain raw samples. Separate startup from warm steady-state; benchmark only affected paths plus a stable smoke corpus.

Required claim labels:

- **No measured regression**: evidence covers listed workloads and a stated tolerance; this is not proof of universal parity.
- **Parity on measured corpus**: candidate is within the stated tolerance across all named workload distributions.
- **Faster on measured corpus**: candidate wins on a defined set of distributions without exceeding regressions on guardrails.

Do not combine AOT application improvements with Bun runtime LTO results. Record hashes for upstream source, patch set, binaries, workloads and runner. See the harness entrypoint in the root `package.json`; receipts are only as broad as their workload set.

## Upstream references

- [Bun 1.4 release overview](https://bun.com/blog/bun-v1.4)
- [Bun 1.4.4 release notes](https://bun.com/blog/bun-v1.4.4)
- [Bun APIs](https://bun.com/docs/runtime/bun-apis)
- [Bun AOT and executable size/trim docs](https://bun.com/docs/compiler/size)
- [Bun type checking](https://bun.com/docs/runtime/check)
- [Bun lint](https://bun.com/docs/lint)
- [Bun upstream Cargo release profile](https://github.com/oven-sh/bun/blob/main/Cargo.toml)
- [Bun upstream Rust/C++ build integration](https://github.com/oven-sh/bun/blob/main/scripts/build/rust.ts)
- [Bun Windows build and LTO notes](https://github.com/oven-sh/bun/blob/main/docs/project/building-windows.mdx)
