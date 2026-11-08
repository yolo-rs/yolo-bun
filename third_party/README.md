# third_party — Google & Chromium Dependency Governance

This directory follows the official [Chromium `third_party/`](https://chromium.googlesource.com/chromium/src/+/main/docs/adding_to_third_party.md) and Google Open Source Third-Party Policy.

## Mandatory Requirements for Every Directory

Every subdirectory in `third_party/` (including nested packages under `third_party/google/`) **must** contain a `README.chromium` metadata file with the following required fields:

- `Name`: Canonical upstream project name
- `Short Name`: Short identifier matching the directory or package
- `URL`: Canonical upstream repository URL
- `License`: SPDX license identifier (`Apache-2.0`, `MIT`, `BSD-3-Clause`, etc. — `AGPL-3.0` is strictly banned from linked code)
- `License File`: Path to license (`LICENSE`)
- `Version`: Semantic version or `HEAD`
- `Revision`: Pinned commit SHA or `HEAD`
- `Security Critical`: `yes` or `no`
- `Shipped`: `yes` or `no`
- `Description`: Summary of the package role in `yolo-bun`
- `Local Modifications`: Summary of Upstream Bun v1.4.4+ / Rust 2024 adaptations

## Verification Command

```bash
bun run scripts/yolo.ts google third-party
```
