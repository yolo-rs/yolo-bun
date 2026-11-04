# YOLO OS package manager architecture

## Goal and boundary

Provide a Bun-hosted CLI for searching the YOLO OS package catalog, resolving a declared OS profile into a reproducible plan, and invoking selected native package backends. Bun is the orchestrator and JS/TS package manager; it is not a new universal repository format and does not replace the transaction, signature, metadata or dependency solver of every ecosystem it connects.

The image build should consume a locked plan and pinned artifacts. The current CLI provides early native-tool adapters and assembles plans from already resolved artifacts; backend resolution and image integration remain incomplete. `yolo-os` remains responsible for package selection in an image, filesystem layout, image construction, kernel/initramfs choices and boot qualification.

`bun run yolo pkg image-plan <profile.json>` validates a schema-version-2 target profile and assembles a deterministic plan from artifacts that have already been resolved. Each entry carries a stable artifact ID, native package ID, backend, source ID, fixed version, HTTPS artifact URL and SHA-256. The profile declares a structured OS/architecture/distribution target and source records (`id`, owning `backend`, source `kind`, and native `ref`). Each artifact must reference a declared source owned by its own backend. The plan sorts sources and artifacts and includes a digest of its canonical JSON. It does not download artifacts, verify their bytes or signatures, resolve dependencies, or establish backend compatibility.

`bun run yolo pkg verify-image-plan <plan.json> <files.json>` checks the plan digest, rejects unknown plan/artifact fields and non-canonical artifact order, then hashes local files using Bun's streaming `Bun.CryptoHasher` API. The files JSON must map exactly the plan's artifact IDs to local paths, for example `{ "bun": "/cache/bun.tar.gz" }`. The command emits a receipt and exits nonzero on a mismatch. It verifies bytes against the plan, not repository signatures or the authenticity of the plan itself.

## Backend map

| Ecosystem                               | Intended role                                                                                     | Authority to preserve                                                                                                                           |
| --------------------------------------- | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Bun `install` / npm-compatible registry | YOLO JS/TS source workspaces and Bun-native applications.                                         | Bun lockfile, npm registry metadata, package lifecycle policy and integrity hashes.                                                             |
| Flatpak / Flathub                       | Sandboxed desktop applications available to the OS.                                               | Flatpak remotes, refs, OSTree commits, app metadata and Flatpak permission model. Package/update/install operations use the native Flatpak CLI. |
| F-Droid                                 | Android app search and lifecycle on a connected Android device.                                   | `fdroidcl` owns configured repositories, its local index, downloads and ADB operations. It is not a Linux desktop/general OS package backend.   |
| WinGet                                  | Windows application installation and Windows developer profile integration.                       | WinGet manifests, package source policy, installer hashes, agreements and native client behavior.                                               |
| uv                                      | Python project environments and Python CLI/developer tools used by build or operations workflows. | `pyproject.toml`, `uv.lock`, indexes, hashes and isolated environments.                                                                         |
| Cargo / rustup                          | Rust crates and Rust toolchains used by developers and source builds.                             | `Cargo.lock`, Cargo sources/configuration, rustup toolchain channels and checksums. Cargo is not the system package transaction engine.         |
| vcpkg                                   | C/C++ source dependencies and toolchain integration for native builds.                            | Registry/baseline, port versions, triplets, overlays, binary cache and package hashes.                                                          |
| pacman                                  | Arch-family base/system packages and an Arch-derived YOLO OS profile.                             | Pacman databases, repository signatures, package signatures, dependency resolution and transaction model.                                       |
| Omarchy / CachyOS                       | Distribution-specific profile sources, defaults and compatibility inputs for Arch-derived images. | Upstream distro release/configuration and package repository boundaries; don't silently fork their package sets.                                |

Flatpak CLI and Flathub are related but different: `flatpak` is the native client/runtime manager and Flathub is a repository/service. Similarly, F-Droid's server tooling publishes Android repositories; it is not an interchangeable Linux host package manager.

## Current adapter state

The unified `yolo pkg` CLI provides `manage` for native search, installed-list,
upgrade and remove operations where supported:

| Backend | Search                                                 | Installed list                   | Upgrade                                   | Remove                           | Scope and limits                                                 |
| ------- | ------------------------------------------------------ | -------------------------------- | ----------------------------------------- | -------------------------------- | ---------------------------------------------------------------- |
| Bun     | Unsupported: no native package registry search command | Global tools                     | One or all global tools                   | One global tool                  | Does not change a project manifest or lockfile.                  |
| Flatpak | Configured remotes                                     | User-installed apps and runtimes | One or all user apps/runtimes             | One user app/runtime             | Uses `--user`; remote must already exist.                        |
| WinGet  | `winget` source                                        | Installed Windows apps           | One or all upgradeable apps from `winget` | One exact ID from `winget`       | Installer can request machine scope/elevation.                   |
| uv      | Unsupported: no native tool search command             | Installed uv tools               | One or all uv tools                       | One uv tool                      | Does not update a project's `uv.lock`.                           |
| Cargo   | Crates.io                                              | Cargo-installed binary crates    | Reinstall one binary crate with `--force` | One Cargo-installed binary crate | No bulk upgrade mapping.                                         |
| pacman  | Configured sync databases                              | Installed system packages        | System-wide `-Syu` only                   | One package with `-R`            | Upgrade affects the whole system; requires system privileges.    |
| vcpkg   | Configured registries                                  | Classic-mode installed tree      | All outdated Classic packages             | One Classic-mode port            | Upgrade has no rollback; remove is unsupported in Manifest mode. |

Syntax is `yolo pkg manage <backend> <search|list|installed|upgrade|remove>
[query-or-package] [--execute]`. Search/list run their read-only native command
directly. Upgrade/remove print a native plan and require `--execute`. All
execution uses an argument array without a shell. Package validation rejects
option-looking IDs and unsafe values. Bun and uv do not gain a synthetic search
API; use their native package metadata workflows instead. For F-Droid, use the
separate `yolo pkg fdroid` commands; they remain plan-only unless `--execute`
is supplied.

Install-plan mappings exist for Bun, uv, Cargo, Flatpak, WinGet, pacman, vcpkg
and F-Droid through `fdroidcl`. Only Bun and vcpkg expose dependency dry-run
resolution. The F-Droid adapter targets a connected ADB device, not the host;
it does not implement an APK downloader, signature verifier, repository
manager, or rollback layer. `fdroidcl` documents that its index verification
relies on HTTPS rather than JAR signatures, so the adapter does not claim the
official F-Droid Android client's signature guarantees.

`yolo pkg backends` is discovery-only: it probes executable names/versions and
reads `/etc/os-release` on Linux to report the host distribution family. Arch
and CachyOS map to the pacman profile. Omarchy is detected from its
`omarchy-pkg-add` or `omarchy-pkg-drop` helper because its current `/etc/os-release`
identifies as Arch. The profile label does not choose repositories or ISA
tiers. It does not inspect configured sources, repository metadata, permissions,
signatures, connected devices or installability.

The pacman adapter is not a complete Omarchy host integration. Omarchy provides
its own package helpers and update lifecycle; a raw `pacman -Syu` bypasses the
Omarchy update flow. Use `omarchy update` for an Omarchy host update and its
package add/drop helpers for host package changes. The current `yolo pkg manage
pacman` adapter is intended for Arch-family package operations where direct
pacman use is appropriate, including controlled image/build contexts. It does
not claim to preserve Omarchy snapshots, migrations, channel configuration or
other update hooks.

The schema records source ownership; it does not configure native repositories. A CachyOS or Omarchy profile names its distribution/channel and references repository IDs owned by `pacman`. CachyOS ISA-tier repository selection must be tied to a qualified target CPU; `cpuTier` is descriptive and is not hardware detection. Flathub, F-Droid repositories, WinGet sources, Cargo/uv registries and vcpkg registries remain configured by their native tools. A profile source reference does not prove that a source is configured or trusted.

The F-Droid CLI is optional and is never installed by YOLO. Install and configure `fdroidcl` and ADB using the platform's normal trusted process. `yolo pkg backends` only probes whether `fdroidcl` is on `PATH`; it does not check connected devices, repositories, signatures or installability.

## Catalog and plan format

The YOLO catalog records only the adapter-level information needed to choose a backend:

- stable package ID and ecosystem/backend;
- upstream project and manifest/repository reference;
- pinned version/ref/commit and artifact or source checksum;
- target OS, architecture, libc/ABI and profile constraints;
- native manager invocation or manifest input;
- license, upstream signing/provenance evidence and trust policy;
- dependency edges expressed by the owning backend where possible;
- package state (catalogued, resolved, downloaded, installed, image-included, qualified).

Do not flatten different lockfiles or signing systems into invented universal fields. Keep source records and backend-native lock files alongside a generated plan; the plan links to their hashes. A plan must be deterministic for pinned inputs and reject floating refs in release/image mode.

Image profile schema v2 requires:

| Field         | Contents                                                                                                                                        |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `target`      | `os`, `arch`, and optional `distribution`, `release`, `channel`, and descriptive `cpuTier`. Supported OS values are Linux, Windows and Android. |
| `sources[]`   | Stable `id`, owning `backend`, source `kind`, and a native `ref` such as a configured repository or registry identity.                          |
| `artifacts[]` | Stable artifact `id`, exact native `package` ID, `backend`, source ID, pinned `version`, HTTPS artifact URL, and SHA-256.                       |

Each artifact's backend must match its source record's backend. For example, a
CachyOS profile lists pacman repositories as pacman sources, and a Flatpak app
references a Flatpak remote. The schema preserves these declarations in the
plan digest; it does not query or configure the repository.

## Operations

The current CLI implements install planning/execution, selected native dry runs,
F-Droid lifecycle forwarding, image-plan assembly, and local file hash checks.
It does not yet implement a local package catalog, general search, multi-backend
dependency solving, artifact fetching, image-root installation, or signature
verification. Those are planned integration work; the schema declarations are
not runtime source configuration.

The adapter contract must make dry-run/plan output available, propagate failures, and never reinterpret a failed backend call as success. Add rollback only where the backend provides a meaningful transaction/snapshot model; do not promise cross-backend atomicity.

## Delivery phases

1. **Catalog and locked plan**: define schemas, source pins and deterministic image-plan output. Add read-only fixtures for one Bun package, one Arch package and one Flatpak app.
2. **YOLO OS Linux profile**: adapt pacman for the selected Arch-family profile and resolve/download into an explicit staging root. Document Omarchy/CachyOS profile inputs separately from package source trust.
3. **Desktop apps**: support Flatpak/Flathub as a separate sandboxed-app backend with remote/ref pins and permissions recorded.
4. **Developer ecosystems**: keep Cargo/rustup, uv and vcpkg as opt-in tool/dependency backends. Preserve each ecosystem's lock and cache.
5. **Other targets**: WinGet on Windows profiles; F-Droid only if an Android profile is chosen. Neither is required for a minimal Linux image.
6. **Image qualification**: connect locked package plans to `yolo-os`, publish image provenance and boot receipts only after the OS pipeline qualifies them.

## Upstream references

- [Flatpak source and project](https://github.com/flatpak/flatpak)
- [Flathub](https://github.com/flathub)
- [F-Droid server tools](https://github.com/f-droid/fdroidserver)
- [WinGet CLI](https://github.com/microsoft/winget-cli)
- [uv](https://github.com/astral-sh/uv)
- [Cargo](https://doc.rust-lang.org/cargo/)
- [vcpkg](https://github.com/microsoft/vcpkg)
- [pacman](https://gitlab.archlinux.org/pacman/pacman)
- [Omarchy](https://github.com/omacom/omarchy)
- [CachyOS packages](https://github.com/CachyOS)
- Native lifecycle command references: [Bun update](https://bun.sh/docs/pm/cli/update), [Bun remove](https://bun.sh/docs/pm/cli/remove), [Bun global package listing](https://bun.sh/docs/pm/cli/pm), [Flatpak CLI](https://docs.flatpak.org/en/latest/using-flatpak.html), [WinGet](https://learn.microsoft.com/en-us/windows/package-manager/winget/), [uv tools](https://docs.astral.sh/uv/guides/tools/), [Cargo install](https://doc.rust-lang.org/cargo/commands/cargo-install.html), [pacman](https://man.archlinux.org/man/pacman.8.en), [Omarchy package helpers and updates](https://github.com/omacom/omarchy/blob/quattro/AGENTS.md), and [vcpkg commands](https://learn.microsoft.com/en-us/vcpkg/commands/help).
