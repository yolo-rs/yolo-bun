// SPDX-License-Identifier: MIT OR Apache-2.0
// Native tool installation adapters. Each backend keeps its own package format.
export type Backend =
  "bun" | "uv" | "cargo" | "flatpak" | "winget" | "pacman" | "vcpkg";
export type InstallPlan = {
  backend: Backend;
  executable: string;
  args: string[];
  scope: string;
};

export function planInstall(backend: string, packageSpec: string): InstallPlan {
  if (
    !packageSpec ||
    packageSpec.startsWith("-") ||
    !(backend === "vcpkg"
      ? /^[a-z0-9][a-z0-9-]*(?:\[[a-z0-9-]+(?:,[a-z0-9-]+)*\])?(?::[a-z0-9][a-z0-9-]*)?$/.test(
          packageSpec,
        )
      : /^[a-zA-Z0-9@/._+~^=<>!-]+$/.test(packageSpec))
  ) {
    throw new Error(
      "Invalid package spec: use a registry package name and optional version constraint",
    );
  }
  switch (backend) {
    case "bun":
      return {
        backend,
        executable: "bun",
        args: ["add", "--global", packageSpec],
        scope: "Bun global tools",
      };
    case "uv":
      return {
        backend,
        executable: "uv",
        args: ["tool", "install", packageSpec],
        scope: "uv isolated tool environment",
      };
    case "cargo":
      return {
        backend,
        executable: "cargo",
        args: ["install", "--locked", packageSpec],
        scope: "Cargo binary installation root",
      };
    case "flatpak":
      if (!/^[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+){2,}$/.test(packageSpec))
        throw new Error(
          "Flatpak requires an application ID such as org.gimp.GIMP",
        );
      return {
        backend,
        executable: "flatpak",
        args: ["install", "--user", "flathub", packageSpec],
        scope: "Flatpak user installation from configured flathub remote",
      };
    case "winget":
      if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(packageSpec))
        throw new Error("WinGet requires an exact package ID");
      return {
        backend,
        executable: "winget",
        args: ["install", "--id", packageSpec, "--exact", "--source", "winget"],
        scope: "WinGet community source; scope determined by installer",
      };
    case "pacman":
      if (!/^[A-Za-z0-9][A-Za-z0-9@._+/-]*$/.test(packageSpec))
        throw new Error("pacman requires a package name or repository/name");
      return {
        backend,
        executable: "pacman",
        args: ["-S", "--needed", packageSpec],
        scope: "Arch system installation; requires appropriate privileges",
      };
    case "vcpkg":
      return {
        backend,
        executable: "vcpkg",
        args: ["install", "--classic", packageSpec],
        scope:
          "vcpkg classic installation; existing ports may require rebuilding",
      };
    default:
      throw new Error(`Unsupported backend: ${backend}`);
  }
}

/** Run a planned command without a shell and return the child's exit code. */
export async function executePlan(
  plan: Pick<InstallPlan, "executable" | "args">,
): Promise<number> {
  const executable = Bun.which(plan.executable);
  if (!executable)
    throw new Error(`Backend executable not found: ${plan.executable}`);
  const child = Bun.spawn([executable, ...plan.args], {
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  });
  return await child.exited;
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  if (args[0] === "--") args.shift();
  const [backend, packageSpec, flag] = args;
  if (
    !backend ||
    !packageSpec ||
    (flag && flag !== "--execute") ||
    args.length > 3
  ) {
    console.error(
      "Usage: bun run packages:install <bun|uv|cargo|flatpak|winget|pacman|vcpkg> <package> [--execute]",
    );
    process.exit(2);
  }
  try {
    const plan = planInstall(backend, packageSpec);
    if (flag !== "--execute") {
      console.log(JSON.stringify({ action: "plan", ...plan }, null, 2));
    } else {
      process.exit(await executePlan(plan));
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
