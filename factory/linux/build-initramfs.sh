#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
entry="${repo_root}/packages/bunos-init/src/init.ts"
output="${1:?usage: build-initramfs.sh OUTPUT.cpio.gz}"
output="$(mkdir -p "$(dirname "$output")" && cd "$(dirname "$output")" && pwd)/$(basename "$output")"

for command in bun cpio gzip install mknod; do
  command -v "$command" >/dev/null || { printf 'missing required command: %s\n' "$command" >&2; exit 127; }
done

tmp="$(mktemp -d)"
trap 'rm -rf -- "$tmp"' EXIT
mkdir -p "$tmp"/{dev,proc,sys,run,tmp}
chmod 0755 "$tmp" "$tmp/dev" "$tmp/proc" "$tmp/sys" "$tmp/run" "$tmp/tmp"
mknod -m 0600 "$tmp/dev/console" c 5 1
bun build --compile "$entry" --outfile "$tmp/init"
chmod 0755 "$tmp/init"
(
  cd "$tmp"
  find . -print0 | sort -z | cpio --null -o --format=newc --owner=0:0
) | gzip -n -9 > "$output"
sha256sum "$output"
printf 'Boot with the pinned Linux kernel and rdinit=/init; this produces only a minimal PID 1 test initramfs.\n'
