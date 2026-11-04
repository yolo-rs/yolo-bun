# YOLO OS package manager architecture

## Goal and boundary

Provide a Bun-hosted CLI for searching the YOLO OS package catalog, resolving a declared OS profile into a reproducible plan, and invoking selected native package backends. Bun is the orchestrator and JS/TS package manager; it is not a new universal repository format and does not replace the transaction, signature, metadata or dependency solver of every ecosystem it connects.

The image build should consume a locked plan and pinned artifacts. The current CLI is an early plan/execute adapter for native tools; it is not yet a package catalog resolver or a locked image-plan generator. `yolo-os` remains responsible for package selection in an image, filesystem layout, image construction, kernel/initramfs choices and boot qualification.

## Backend map

| Ecosystem                               | Intended role                                                                                     | Authority to preserve                                                                                                                           |
| --------------------------------------- | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Bun `install` / npm-compatible registry | YOLO JS/TS source workspaces and Bun-native applications.                                         | Bun lockfile, npm registry metadata, package lifecycle policy and integrity hashes.                                                             |
| Flatpak / Flathub                       | Sandboxed desktop applications available to the OS.                                               | Flatpak remotes, refs, OSTree commits, app metadata and Flatpak permission model. Package/update/install operations use the native Flatpak CLI. |
| F-Droid                                 | Android build/repository workflows if YOLO ships an Android profile or companion app.             | `fdroidserver` metadata, reproducible build model, signing keys and repository indexes. It is not a Linux desktop/general OS package backend.   |
| WinGet                                  | Windows application installation and Windows developer profile integration.                       | WinGet manifests, package source policy, installer hashes, agreements and native client behavior.                                               |
| uv                                      | Python project environments and Python CLI/developer tools used by build or operations workflows. | `pyproject.toml`, `uv.lock`, indexes, hashes and isolated environments.                                                                         |
| Cargo / rustup                          | Rust crates and Rust toolchains used by developers and source builds.                             | `Cargo.lock`, Cargo sources/configuration, rustup toolchain channels and checksums. Cargo is not the system package transaction engine.         |
| vcpkg                                   | C/C++ source dependencies and toolchain integration for native builds.                            | Registry/baseline, port versions, triplets, overlays, binary cache and package hashes.                                                          |
| pacman                                  | Arch-family base/system packages and an Arch-derived YOLO OS profile.                             | Pacman databases, repository signatures, package signatures, dependency resolution and transaction model.                                       |
| Omarchy / CachyOS                       | Distribution-specific profile sources, defaults and compatibility inputs for Arch-derived images. | Upstream distro release/configuration and package repository boundaries; don't silently fork their package sets.                                |

Flatpak CLI and Flathub are related but different: `flatpak` is the native client/runtime manager and Flathub is a repository/service. Similarly, F-Droid's server tooling publishes Android repositories; it is not an interchangeable Linux host package manager.

## Current adapter state

The current `packages:install` script prints native commands and runs them only when `--execute` is explicitly supplied. Its implemented backends are Bun, uv, Cargo, Flatpak, WinGet, pacman and vcpkg. Execution invokes an executable with an argument array, without a shell; it can still change the selected user environment or host. The CLI does not yet make a staging-root image transaction or lock package resolution. F-Droid is discovery-only repository tooling and has no install backend.

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

## Operations

1. `search`: search the local source-linked catalog; optionally query a backend only when the user asks for freshness.
2. `resolve`: delegate ecosystem-specific resolution to the native backend and emit a reviewable locked plan.
3. `fetch`: download through the native manager or cache its verified artifact; record checksums and provenance.
4. `install`: operate inside a selected environment/root and let the backend perform its transaction. Host modifications require explicit CLI targeting; image builds use a staging root.
5. `image`: hand the locked package set to `yolo-os`; never build or boot an OS implicitly from an interactive package command.
6. `verify`: validate hashes, signatures and plan consistency; report the evidence and backend version.

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
- [Omarchy](https://github.com/basecamp/omarchy)
- [CachyOS packages](https://github.com/CachyOS)
