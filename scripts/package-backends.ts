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
    id: "fdroid-server",
    executable: "fdroid",
    versionArgs: ["--version"],
    domain: "F-Droid repository tooling",
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

process.stdout.write(
  JSON.stringify(
    {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      platform: process.platform,
      architecture: process.arch,
      scope:
        "Executable and version probes only; repositories, privileges and installs are not checked.",
      sources: [
        {
          id: "flathub",
          backend: "flatpak",
          kind: "repository",
          checked: false,
        },
      ],
      backends: results,
    },
    null,
    2,
  ) + "\n",
);
