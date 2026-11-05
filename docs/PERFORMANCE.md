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

The published Bun 1.4 documentation describes AOT trimming and `bun check --aot`; it also lists `bun lint`, `bun fmt`, `bun check`, package management and AOT as separately trimmable executable capabilities. AOT may be blocked by dynamic `eval`, `Function`, imports, native addons, `bun:ffi`, Bun plugins, externals or other runtime-code paths. Retain required features and record why trimming is blocked. The CLI build task requests AOT without `--trim` because the checked-in aligned builder reported `NoTrimTable`; add trimming only when the release artifact is built with a trim table and the trimmed executable passes its qualified workload.

The repository pins `bun@1.4.4-canary.1` for its native lint and AOT-analysis tasks: the exact stable `1.4.4+38afee6c8` binary supports `check` and `fmt` but does not expose `lint` or AOT flags. Native tool scripts pass `--no-script` so a same-named package script cannot shadow the built-in command. Runtime packages continue to target stable Bun 1.4.4; the canary pin is a development-tooling requirement, not a published runtime compatibility requirement.

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

## Current qualification status (2026-11-04)

- The pinned `oven-sh/bun` source and `yolo-rs/bun` source mirror both identify commit `e57d89ba63a7504957faa2ccc8f416ce2fb15453`. The only recorded downstream patch is the Windows code-generation relative-path patch in `yolo-cross`; generated AOT/bindgen outputs were compared byte-for-byte for that build configuration. It changes build argument paths, not Bun runtime code.
- A Windows x64 release binary was built from `e57d89ba...` with the upstream ThinLTO pipeline and MSVC 14.51. A separate build from the same source revision used CRT 14.44/SDK 10.0.26100 and also used ThinLTO. Both pass narrow startup/smoke checks; the aligned build compiled and ran one AOT fixture and the yolo package-manager CLI. This is not a broad runtime or AOT workload qualification.
- On 2026-11-04, the aligned Bun `1.4.4-canary.1+e57d89ba6` compiler built the updated package manager CLI to `artifacts/yolo-pkg-manage-aot-20261104.exe` with `--compile --aot`; its read-only `pkg manage pacman upgrade` path returned the expected plan. The builder lacks a trim table (`NoTrimTable`), so `--trim` was rejected and the successful artifact is not size-trimmed. Receipt: [windows-yolo-package-manage-aot-2026-11-04.json](receipts/windows-yolo-package-manage-aot-2026-11-04.json). This validates the current app CLI AOT path only, not Bun runtime performance.
- The fixed `packages:cli:build:aot` task produced the current CLI at `dist/bin/yolo.exe` on 2026-11-04 with build ID `cf3acfda17e754ac79826bd0c5dbb971`; its pacman-upgrade smoke emitted a plan and executed no mutation. Receipt: [windows-yolo-package-cli-aot-2026-11-04.json](receipts/windows-yolo-package-cli-aot-2026-11-04.json). This artifact is also untrimmed and does not qualify package installation or Bun runtime performance.
- No matched upstream/candidate runtime benchmark is currently available. `windows-runtime-crt-comparison.json` uses the same reported source revision but different CRT/SDK versions, checkout paths and build state; its ratios cannot be attributed to the fork or toolchain. `windows-runtime-cross-revision-smoke.json` compares different Bun commits with only five samples. Neither supports a parity or regression claim.
- The harness currently measures process startup, one JavaScript compute loop, and 50 sequential loopback HTTP requests including process startup. It does not measure sustained HTTP throughput, warm steady-state, file I/O, streams, package install, memory, or the wider CLI/runtime surface. A future result from this harness must be labeled as a narrow smoke comparison.

When clean matched artifacts exist, run the harness from the repository root with at least 30 alternating samples:

```sh
bun run bench:runtime -- --baseline <matched-upstream.exe> --candidate <yolo-bun-candidate.exe> --runs 30 --out docs/receipts/windows-runtime-parity-e57d89ba.json
```

Before running it, build both binaries from clean checkouts of the same source commit using identical submodules, Rust and C++ compilers, linker, MSVC CRT/SDK, release profile, ThinLTO/PGO/orderfile settings, CPU baseline and environment. The source-path patch must be applied identically to both builds. Record those build identities alongside the harness receipt; do not use the existing CRT-mismatched pair as the baseline.

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
