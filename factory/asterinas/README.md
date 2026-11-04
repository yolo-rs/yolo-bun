# Asterinas userland boot profile (experimental)

Asterinas documents initramfs startup with `rdinit` and ELF execution, so a Bun PID 1 is a plausible user-space experiment. No Bun-specific compatibility or boot has been verified. Asterinas has partial syscall/flag support and does not support Linux kernel modules.

Pin the Asterinas commit and Bun executable before building a test initramfs. Record the syscall/library closure and boot receipt independently from Linux. If compatibility fails, patch only the measured Asterinas kernel ABI gap; never embed Bun/JSC in the kernel.
