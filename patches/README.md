# Patch policy

`yolo-rs/bun` follows upstream exactly and must remain patch-free. Store version-specific runtime patches here, keyed to the upstream SHA and with a reason, license/provenance record, and rebase procedure. `queue.json` is the ordered patch manifest; every entry includes a SHA-256 digest. It currently has no runtime patches: audit the pinned Bun 1.4 APIs and open an upstream contribution before adding a downstream delta.

`bun run source:prepare` prints a plan to clone the exact upstream commit from the `yolo-rs/bun` mirror and apply the checked patch queue. Add `-- --execute` to materialize a disposable tree under ignored `vendor/`. The script refuses to overwrite an existing tree. The source checkout is generated and is never committed into this integration repository.

No patch to Linux kernel ring 0 is currently justified. The Linux integration is a userland `/init` profile. Add an Asterinas kernel compatibility patch only when a reproduced Bun userland failure identifies a missing syscall/ABI behavior and the patch belongs in Asterinas's Rust kernel. Do not commit speculative kernel patches.
