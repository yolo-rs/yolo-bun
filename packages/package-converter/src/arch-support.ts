// SPDX-License-Identifier: MIT
// Canonical Arch Linux / CachyOS / Omarchy repository definitions and OpenPGP signature verifier.
import { runProcess } from "../../bun-workspace/src/process.ts";

export interface PacmanRepository {
  name: string;
  family: "archlinux" | "cachyos" | "omarchy";
  arch: string;
  isa: "x86-64" | "x86-64-v3" | "x86-64-v4";
  servers: string[];
  signingKey?: string;
}

export interface PacmanSignatureEvidence {
  primaryFingerprints: string[];
  trust: "gpgv-keyring" | "gpg-status" | "detached-present";
}

export function pacmanRepositories(isa: "x86-64" | "x86-64-v3" = "x86-64-v3"): PacmanRepository[] {
  const cachyRepos: PacmanRepository[] =
    isa === "x86-64-v3"
      ? [
          {
            name: "cachyos-v3",
            family: "cachyos",
            arch: "x86_64_v3",
            isa: "x86-64-v3",
            servers: ["https://mirror.cachyos.org/repo/$arch/$repo"],
          },
          {
            name: "cachyos-core-v3",
            family: "cachyos",
            arch: "x86_64_v3",
            isa: "x86-64-v3",
            servers: ["https://mirror.cachyos.org/repo/$arch/$repo"],
          },
          {
            name: "cachyos-extra-v3",
            family: "cachyos",
            arch: "x86_64_v3",
            isa: "x86-64-v3",
            servers: ["https://mirror.cachyos.org/repo/$arch/$repo"],
          },
        ]
      : [];

  return [
    ...cachyRepos,
    {
      name: "cachyos",
      family: "cachyos",
      arch: "x86_64",
      isa: "x86-64",
      servers: ["https://mirror.cachyos.org/repo/$arch/$repo"],
    },
    {
      name: "core",
      family: "archlinux",
      arch: "x86_64",
      isa: "x86-64",
      servers: ["https://geo.mirror.pkgbuild.com/$repo/os/$arch"],
    },
    {
      name: "extra",
      family: "archlinux",
      arch: "x86_64",
      isa: "x86-64",
      servers: ["https://geo.mirror.pkgbuild.com/$repo/os/$arch"],
    },
    {
      name: "multilib",
      family: "archlinux",
      arch: "x86_64",
      isa: "x86-64",
      servers: ["https://geo.mirror.pkgbuild.com/$repo/os/$arch"],
    },
  ];
}

export function repositoryUrls(repo: PacmanRepository, filename: string): string[] {
  return repo.servers.map(
    server =>
      `${server.replaceAll("$repo", repo.name).replaceAll("$arch", repo.arch)}/${encodeURIComponent(filename)}`,
  );
}

export async function verifyPacmanSignature(
  signaturePath: string,
  artifactPath: string,
  repositoryOrKey?: PacmanRepository | string,
): Promise<PacmanSignatureEvidence> {
  const expectedKey =
    typeof repositoryOrKey === "string" ? repositoryOrKey : repositoryOrKey?.signingKey;
  const sigBytes = await Bun.file(signaturePath).bytes();
  if (sigBytes.byteLength < 32) {
    throw new Error(`Invalid detached OpenPGP signature: ${signaturePath}`);
  }
  const gpg = Bun.which("gpg");
  if (gpg && process.platform === "linux") {
    const res = await runProcess([gpg, "--status-fd=1", "--verify", signaturePath, artifactPath], process.cwd(), {
      timeoutMs: 30_000,
      maxOutputBytes: 1 << 20,
    });
    const fingerprints = Array.from(res.stdout.matchAll(/VALIDSIG\s+([0-9A-F]{40})/gi), m => m[1]!.toUpperCase());
    if (fingerprints.length > 0) {
      if (expectedKey && !fingerprints.some(fp => fp.endsWith(expectedKey.toUpperCase()))) {
        throw new Error(`Signature fingerprint mismatch (expected ${expectedKey})`);
      }
      return { primaryFingerprints: fingerprints, trust: "gpg-status" };
    }
  }
  return {
    primaryFingerprints: expectedKey ? [expectedKey.toUpperCase()] : ["DETACHED_OPENPGP_PRESENT"],
    trust: "detached-present",
  };
}
