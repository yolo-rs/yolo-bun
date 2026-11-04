// SPDX-License-Identifier: MIT OR Apache-2.0
// Shared streaming hashes for Bun-owned package and source tooling.

export function sha256(value: string | Uint8Array): string {
  return new Bun.CryptoHasher("sha256").update(value).digest("hex");
}

export async function sha256File(path: string): Promise<string> {
  const hasher = new Bun.CryptoHasher("sha256");
  const reader = Bun.file(path).stream().getReader();
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      hasher.update(chunk.value);
    }
  } finally {
    reader.releaseLock();
  }
  return hasher.digest("hex");
}
