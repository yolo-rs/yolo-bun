# Linux userland boot profile

Target source: `torvalds/linux` tag `v7.4-rc1` as observed 2026-11-04. The attempted version string `v7.4.1-rc` was not a Git ref in the checked mainline repository.

Use Bun's upstream `bun build --compile` to build the first-party PID 1 entry to `/init`, include its runtime library closure in the generated initramfs, and boot with `rdinit=/init`. This profile is a plan; it does not currently generate an image or claim a boot receipt. The production LFS image remains owned by `yolo-os`.
