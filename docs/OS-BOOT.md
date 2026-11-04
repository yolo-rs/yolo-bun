# Linux and Asterinas boot profiles

## Linux mainline / Rust-for-Linux

The requested `v7.4.1-rc` reference was not found in `torvalds/linux`. The current mainline Makefile declares `VERSION=7`, `PATCHLEVEL=4`, `SUBLEVEL=0`, `EXTRAVERSION=-rc1`, so the observed development tag is **v7.4-rc1**.

Rust-for-Linux uses `no_std` kernel crates, generated bindings, kernel abstractions and Kbuild integration. Linux launches PID 1 through `kernel_execve`. Bun is a user-space process: compile the first-party init entry to `/init`, package its native-library closure into an initramfs, and launch with `rdinit=/init`. No in-kernel JavaScript engine or Bun kernel patch is proposed.

The copied BunOS init source is still a prototype, not a system init. Before it can boot a full LFS image it needs root-device discovery, filesystem validation, mount propagation, `switch_root`, an exec handoff to the selected service/init, safe failure handling, and receipts for shutdown/reboot. LFS build recipes remain those of the selected LFS book.

## Asterinas (experimental)

Asterinas documents `rdinit=/bin/busybox` as a way to run an initramfs program first, and its ELF loader handles `PT_INTERP`. That makes a compiled Bun init a possible experiment, not a compatibility claim.

The current Asterinas syscall table has partial coverage for some calls/runtime flags used by large applications; its rootfs support is limited and kernel modules are not supported. Asterinas has no Bun-specific test. Keep the Asterinas profile experimental until a pinned initramfs boots, Bun runs, PID 1 reaps/shuts down correctly, and each missing syscall is tied to a measured failure. Patch only Asterinas's Rust kernel compatibility layer when a reproducible syscall gap blocks the userland process.

## Evidence gates

1. Build Bun from the pinned upstream commit using the upstream Rust/C++ build system and record compiler, toolchain, submodules and dynamic library dependencies.
2. Compile the PID 1 entry with Bun's upstream `bun build --compile`; enumerate the executable's runtime library closure.
3. Boot a disposable Linux QEMU initramfs using `rdinit=/init`; record console output, image hash and exit/shutdown state.
4. Add root-switch and LFS service handoff only after the minimal PID 1 path is repeatable.
5. Run the same binary against pinned Asterinas separately. Do not reuse a Linux boot receipt as Asterinas evidence.
