// SPDX-License-Identifier: MIT OR Apache-2.0
// Read-only discovery of native package tools. Finding an executable does not
// imply that its repositories, authentication, or installation are working.
type Backend = {
  id: string;
  executable: string;
  versionArgs: string[];
  domain: string;
};

const backends: Backend[] = [
  {
    id: "bun",
    executable: "bun",
    versionArgs: ["--version"],
    domain: "JavaScript packages",
  },
  {
    id: "flatpak",
    executable: "flatpak",
    versionArgs: ["--version"],
    domain: "Flatpak applications and runtimes",
  },
  {
    id: "fdroid",
    executable: "fdroidcl",
    versionArgs: ["version"],
    domain: "F-Droid apps on Android devices via ADB",
  },
  {
    id: "winget",
    executable: "winget",
    versionArgs: ["--version"],
    domain: "Windows applications",
  },
  {
    id: "uv",
    executable: "uv",
    versionArgs: ["--version"],
    domain: "Python projects and tools",
  },
  {
    id: "cargo",
    executable: "cargo",
    versionArgs: ["--version"],
    domain: "Rust packages and tools",
  },
  {
    id: "vcpkg",
    executable: "vcpkg",
    versionArgs: ["version"],
    domain: "Native dependencies",
  },
  {
    id: "pacman",
    executable: "pacman",
    versionArgs: ["--version"],
    domain: "Arch system packages",
  },
];

type HostProfile = {
  id: string | null;
  idLike: string[];
  packageManager: "pacman" | null;
  pacmanProfile: "arch" | "cachyos" | "omarchy" | null;
};

async function inspectHostProfile(): Promise<HostProfile> {
  const empty: HostProfile = {
    id: null,
    idLike: [],
    packageManager: null,
    pacmanProfile: null,
  };
  if (process.platform !== "linux") return empty;

  const osRelease = Bun.file("/etc/os-release");
  if (!(await osRelease.exists())) return empty;

  const values = new Map<string, string>();
  const lines = (await osRelease.text()).split(/\r?\n/);
  for (const line of lines) {
    const match = /^([A-Z][A-Z0-9_]*)=(.*)$/.exec(line);
    if (!match) continue;
    const raw = match[2]!.trim();
    const quoted =
      (raw.startsWith('"') && raw.endsWith('"')) ||
      (raw.startsWith("'") && raw.endsWith("'"));
    values.set(match[1]!, quoted ? raw.slice(1, -1) : raw);
  }

  const id = values.get("ID")?.toLowerCase() || null;
  const idLike = (values.get("ID_LIKE") ?? "")
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  const family = new Set([...(id ? [id] : []), ...idLike]);
  // Omarchy identifies itself as Arch in os-release, so detect its own
  // package helper commands before falling back to distro metadata.
  const isOmarchy = Boolean(
    Bun.which("omarchy-pkg-add") || Bun.which("omarchy-pkg-drop"),
  );
  const pacmanProfile =
    isOmarchy || family.has("omarchy")
      ? "omarchy"
      : family.has("cachyos")
        ? "cachyos"
        : family.has("arch")
          ? "arch"
          : null;

  return {
    id,
    idLike,
    packageManager: pacmanProfile ? "pacman" : null,
    pacmanProfile,
  };
}

export async function inspectPackageBackends() {
  const results = backends.map((backend) => {
    const executable = Bun.which(backend.executable);
    if (!executable)
      return {
        ...backend,
        available: false,
        executablePath: null,
        version: null,
        probeExitCode: null,
      };
    try {
      const probe = Bun.spawnSync([executable, ...backend.versionArgs], {
        stdout: "pipe",
        stderr: "pipe",
        timeout: 5000,
      });
      const output = probe.stdout.toString().trim();
      return {
        ...backend,
        available: true,
        executablePath: executable,
        version: probe.exitCode === 0 ? output.split(/\r?\n/, 1)[0] : null,
        probeExitCode: probe.exitCode,
      };
    } catch {
      return {
        ...backend,
        available: true,
        executablePath: executable,
        version: null,
        probeExitCode: null,
        probeError: true,
      };
    }
  });

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    platform: process.platform,
    architecture: process.arch,
    hostProfile: await inspectHostProfile(),
    scope:
      "Checks executable versions and Linux distribution identity only; repositories, trust settings, ADB devices and installs are not checked.",
    sources: [
      {
        id: "flathub",
        backend: "flatpak",
        kind: "repository",
        checked: false,
      },
    ],
    backends: results,
  };
}

if (import.meta.main) {
  const inventory = await inspectPackageBackends();
  process.stdout.write(`${JSON.stringify(inventory, null, 2)}\n`);
}
