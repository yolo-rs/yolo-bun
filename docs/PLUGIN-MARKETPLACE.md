# Plugins and marketplace boundaries

Bun upstream has two relevant plugin surfaces: runtime plugins and bundler plugins. These are extension APIs. They do not provide a signed, cross-host marketplace by themselves.

The archived BunOS plugin package is MIT-licensed and has many `bunos-*` entrypoints. Its manifest routes commands into BunOS apps, MCP services and tools. Port only leaf adapters that can be detached from the distribution. Preserve the MIT header and source path for every copied file.

Use the existing owners:

- `yolo-bun` defines Bun runtime/bundler adapter manifests and Bun-specific load/permission rules.
- `yolo-plugins` owns the cross-host marketplace, plugin/skill synchronization, provider exports and signing workflow.
- `yolo-standards` owns neutral manifest schemas and compatibility vocabulary.
- `yolo-os` selects and packages explicitly pinned plugins in an OS composition; the OS should not absorb the whole marketplace.

No marketplace endpoint or signed Bun plugin bundle is shipped here yet. The catalog must record upstream URL, pinned commit/tag, license SPDX value, checksum, runtime compatibility, requested capabilities, maintainer and release state before a plugin is installable.
