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
  {
    id: "nix",
    executable: "nix",
    versionArgs: ["--version"],
    domain: "Nix declarative packages and flakes",
  },
  {
    id: "play-store",
    executable: "sdkmanager",
    versionArgs: ["--version"],
    domain:
      "Android 17 x64 Google Play / GoogleBook (API 37.x, ChromiumOS, Aluminium OS) system images and packages",
  },
];

// Stable source names for yolo-os profiles. These describe native authorities;
// they are not evidence that a host has configured or trusts those sources.
const sourceCatalog = [
  {
    id: "bun-npm",
    backend: "bun",
    authority: "npm-compatible registry metadata and integrity hashes",
    role: "JavaScript and TypeScript packages",
    targetScope: "build-time and Bun application dependencies",
  },
  {
    id: "flatpak-flathub",
    backend: "flatpak",
    authority: "Flathub refs, OSTree commits, metadata and permissions",
    role: "sandboxed desktop apps and runtimes",
    targetScope: "Linux desktop profiles",
  },
  {
    id: "fdroid-configured",
    backend: "fdroid",
    authority: "fdroidcl configured repositories and local index",
    role: "Android app lifecycle through ADB",
    targetScope: "connected Android device; not a host OS image source",
  },
  {
    id: "winget-community",
    backend: "winget",
    authority: "WinGet source manifests and installer policy",
    role: "Windows apps and developer tools",
    targetScope: "Windows host or Windows build profile",
  },
  {
    id: "uv-index",
    backend: "uv",
    authority: "Python indexes, uv.lock and artifact hashes",
    role: "Python project and isolated CLI dependencies",
    targetScope: "build-time and developer profiles",
  },
  {
    id: "cargo-crates-io",
    backend: "cargo",
    authority: "Cargo registry sources, Cargo.lock and checksums",
    role: "Rust crates and developer tools",
    targetScope: "build-time and developer profiles",
  },
  {
    id: "vcpkg-registry",
    backend: "vcpkg",
    authority: "vcpkg registry baseline, port versions and triplets",
    role: "native C and C++ dependencies",
    targetScope: "build-time toolchain profiles",
  },
  {
    id: "pacman-configured",
    backend: "pacman",
    authority:
      "configured pacman repositories, package and database signatures",
    role: "Arch-family system packages",
    targetScope: "Arch, CachyOS, Omarchy and derived image profiles",
  },
  {
    id: "nix-nixpkgs",
    backend: "nix",
    authority: "nixpkgs flake lock, store paths and content hashes",
    role: "declarative reproducible packages and profiles",
    targetScope: "Linux and developer profiles",
  },
  {
    id: "play-store-google-sdk",
    backend: "play-store",
    authority:
      "Google Android SDK repository manifests, system-image revisions and Play Store image checksums",
    role: "Android 17 x64 Google Play and GoogleBook 2026 (API 37.1 android-desktop, ChromiumOS, Aluminium OS) system images and packages",
    targetScope:
      "GoogleBook 2026 Android 17 x64 + ChromiumOS + Aluminium OS image profiles",
  },
] as const;

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
    sourceCatalog: sourceCatalog.map((source) => ({
      ...source,
      checked: false,
    })),
    backends: results,
  };
}

if (import.meta.main) {
  const inventory = await inspectPackageBackends();
  process.stdout.write(`${JSON.stringify(inventory, null, 2)}\n`);
}
