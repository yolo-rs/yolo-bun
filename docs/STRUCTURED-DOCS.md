# Structured documentation and catalogs

The documentation tree is organized by source authority and consumer:

- `UPSTREAM.md`: Bun facts, pinned commits and source links.
- `ARCHITECTURE.md`: repository ownership, patch bar and upstream-first workflow.
- `PERFORMANCE.md`: Bun 1.4 tooling, AOT/LTO separation and parity evidence rules.
- `PACKAGE-MANAGER.md`: native backend boundaries and YOLO OS package-plan roadmap.
- `receipts/`: dated evidence with precise scope; an AOT check is not a binary build or performance qualification.
- `BUNOS-PORT.md`: source-to-destination migration map with provenance/license.
- `AGENT-MCP-LSP.md`: integration boundaries and implementation state.
- `PLUGIN-MARKETPLACE.md`: plugin APIs versus catalog/distribution ownership.
- `OS-BOOT.md`: Linux and Asterinas targets, experiments and evidence gates.
- `catalog/`: project records and human-readable Awesome Bun index.
- `schemas/`: versioned JSON Schemas for project/plugin records when fields stabilize.

Every record uses an explicit status (`upstream`, `mirror`, `archived-fork`, `planned`, `implemented-unverified`, or `qualified`) and source URL. A branch name alone is not a pin; production inputs use a commit SHA plus artifact checksum. A README claim is not a boot receipt.
