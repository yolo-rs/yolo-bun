# Runtime patch queue

`yolo-bun` keeps the upstream runtime mirror patch-free and accepts only small,
version-pinned downstream changes for Bun-owned APIs, modules, or compatibility
behavior. The current runtime patch queue is empty. First identify a concrete
upstream gap, consider an upstream contribution, and record provenance and
rebase evidence before adding any runtime delta.

Windows/MSVC build generation and cross-compilation patches are owned by
`yolo-cross`, under `patches/bun/`. That queue is separate from this runtime
queue.
