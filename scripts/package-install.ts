// SPDX-License-Identifier: MIT OR Apache-2.0
// Native tool installation adapters. Each backend keeps its own package format.
export type Backend =
  "bun" | "uv" | "cargo" | "flatpak" | "winget" | "pacman" | "vcpkg" | "fdroid";
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
    case "fdroid":
      if (!isFdroidAppId(packageSpec))
        throw new Error("F-Droid requires an app ID such as org.adaway");
      return {
        backend,
        executable: "fdroidcl",
        args: ["install", packageSpec],
        scope: "F-Droid app installed on the selected Android device via ADB",
      };
    default:
      throw new Error(`Unsupported backend: ${backend}`);
  }
}

function isFdroidAppId(value: string): boolean {
  return /^[A-Za-z0-9_][A-Za-z0-9._]*(?::[0-9]+)?$/.test(value);
}

/** Map a bounded F-Droid operation to fdroidcl, preserving its native state. */
export function planFdroidCommand(
  operation: string,
  values: string[],
): InstallPlan {
  const base = { backend: "fdroid" as const, executable: "fdroidcl" };
  switch (operation) {
    case "search":
      if (
        values.some(
          (value) => !value || value.startsWith("-") || /[\0\r\n]/.test(value),
        )
      )
        throw new Error(
          "F-Droid search terms must be nonempty query arguments",
        );
      return {
        ...base,
        args: ["search", ...values],
        scope: "F-Droid repository search via the native local index",
      };
    case "show":
      if (!values.length || values.some((value) => !isFdroidAppId(value)))
        throw new Error("F-Droid show requires one or more valid app IDs");
      return {
        ...base,
        args: ["show", ...values],
        scope: "F-Droid app metadata via the native client",
      };
    case "update":
      if (values.length) throw new Error("F-Droid update takes no arguments");
      return {
        ...base,
        args: ["update"],
        scope: "F-Droid repository index update via the native client",
      };
    case "install":
      if (!values.length || values.some((value) => !isFdroidAppId(value)))
        throw new Error("F-Droid install requires one or more valid app IDs");
      return {
        ...base,
        args: ["install", ...values],
        scope: "F-Droid apps installed on the selected Android device via ADB",
      };
    case "upgrade":
      if (values.length) throw new Error("F-Droid upgrade takes no arguments");
      return {
        ...base,
        args: ["install", "-u"],
        scope:
          "All available F-Droid app upgrades on the selected Android device",
      };
    case "remove":
      if (!values.length || values.some((value) => !isFdroidAppId(value)))
        throw new Error("F-Droid remove requires one or more valid app IDs");
      return {
        ...base,
        args: ["uninstall", ...values],
        scope: "F-Droid apps removed from the selected Android device via ADB",
      };
    case "devices":
      if (values.length) throw new Error("F-Droid devices takes no arguments");
      return {
        ...base,
        args: ["devices"],
        scope: "Connected Android devices reported by ADB",
      };
    case "repos":
      if (values.length) throw new Error("F-Droid repos takes no arguments");
      return {
        ...base,
        args: ["repo"],
        scope: "F-Droid repositories configured in fdroidcl",
      };
    default:
      throw new Error(`Unsupported F-Droid operation: ${operation}`);
  }
}

function isManagedPackageId(
  backend: Exclude<Backend, "fdroid">,
  value: string,
) {
  switch (backend) {
    case "bun":
      return /^(?:@[A-Za-z0-9._-]+\/)?[A-Za-z0-9][A-Za-z0-9._-]*$/.test(value);
    case "uv":
    case "cargo":
      return /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(value);
    case "flatpak":
      return /^[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+){2,}$/.test(value);
    case "winget":
      return /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(value);
    case "pacman":
      return /^[A-Za-z0-9][A-Za-z0-9@._+/-]*$/.test(value);
    case "vcpkg":
      return /^[a-z0-9][a-z0-9-]*(?:\[[a-z0-9-]+(?:,[a-z0-9-]+)*\])?(?::[a-z0-9][a-z0-9-]*)?$/.test(
        value,
      );
  }
}

function packageManagerPlan(
  backend: Exclude<Backend, "fdroid">,
  args: string[],
  scope: string,
): InstallPlan {
  return { backend, executable: backend, args, scope };
}

/** Map supported package lifecycle commands to native manager invocations. */
export function planManageCommand(
  backend: string,
  operation: string,
  packageSpec?: string,
): InstallPlan {
  if (backend === "fdroid")
    throw new Error("Use `yolo pkg fdroid` for F-Droid lifecycle commands");
  if (
    !["bun", "uv", "cargo", "flatpak", "winget", "pacman", "vcpkg"].includes(
      backend,
    )
  )
    throw new Error(`Unsupported package manager: ${backend}`);
  const manager = backend as Exclude<Backend, "fdroid">;
  if (operation === "installed") operation = "list";

  if (operation === "search") {
    if (manager === "bun" || manager === "uv")
      throw new Error(
        `Search is not supported for ${manager}; its native CLI has no package search command`,
      );
    if (
      !packageSpec ||
      packageSpec.startsWith("-") ||
      /[\0\r\n]/.test(packageSpec)
    )
      throw new Error(`${manager} search requires a safe query`);
    switch (manager) {
      case "cargo":
        return packageManagerPlan(
          manager,
          ["search", packageSpec],
          "Crates.io search",
        );
      case "flatpak":
        return packageManagerPlan(
          manager,
          ["search", packageSpec],
          "Configured Flatpak remotes",
        );
      case "winget":
        return packageManagerPlan(
          manager,
          ["search", packageSpec, "--source", "winget"],
          "WinGet community source",
        );
      case "pacman":
        return packageManagerPlan(
          manager,
          ["-Ss", packageSpec],
          "Configured pacman sync databases",
        );
      case "vcpkg":
        return packageManagerPlan(
          manager,
          ["search", packageSpec],
          "Configured vcpkg registries",
        );
    }
  }

  if (operation === "list") {
    if (packageSpec)
      throw new Error(`${manager} list does not accept a package filter here`);
    switch (manager) {
      case "bun":
        return packageManagerPlan(
          manager,
          ["pm", "ls", "--global"],
          "Bun global package store",
        );
      case "uv":
        return packageManagerPlan(
          manager,
          ["tool", "list"],
          "uv tool environments",
        );
      case "cargo":
        return packageManagerPlan(
          manager,
          ["install", "--list"],
          "Cargo-installed binaries",
        );
      case "flatpak":
        return packageManagerPlan(
          manager,
          ["list", "--user"],
          "Flatpak user installation",
        );
      case "winget":
        return packageManagerPlan(
          manager,
          ["list"],
          "Installed Windows applications",
        );
      case "pacman":
        return packageManagerPlan(manager, ["-Q"], "Installed pacman database");
      case "vcpkg":
        return packageManagerPlan(
          manager,
          ["list"],
          "vcpkg classic installed tree",
        );
    }
  }

  if (operation !== "upgrade" && operation !== "remove")
    throw new Error(`Unsupported package operation: ${operation}`);
  if (packageSpec && !isManagedPackageId(manager, packageSpec))
    throw new Error(`Invalid ${manager} package ID`);

  switch (manager) {
    case "bun":
      if (operation === "upgrade")
        return packageManagerPlan(
          manager,
          ["update", "--global", ...(packageSpec ? [packageSpec] : [])],
          packageSpec
            ? "Selected Bun global package"
            : "All Bun global packages",
        );
      if (!packageSpec) throw new Error("Bun remove requires a package ID");
      return packageManagerPlan(
        manager,
        ["remove", "--global", packageSpec],
        "Bun global package store",
      );
    case "uv":
      if (operation === "upgrade")
        return packageManagerPlan(
          manager,
          ["tool", "upgrade", ...(packageSpec ? [packageSpec] : ["--all"])],
          packageSpec
            ? "Selected uv tool environment"
            : "All uv tool environments",
        );
      if (!packageSpec) throw new Error("uv remove requires a tool package ID");
      return packageManagerPlan(
        manager,
        ["tool", "uninstall", packageSpec],
        "Selected uv tool environment",
      );
    case "cargo":
      if (!packageSpec)
        throw new Error(
          `Cargo ${operation} requires an installed binary-crate ID`,
        );
      return operation === "upgrade"
        ? packageManagerPlan(
            manager,
            ["install", "--locked", "--force", packageSpec],
            "Selected Cargo-installed binary crate",
          )
        : packageManagerPlan(
            manager,
            ["uninstall", packageSpec],
            "Selected Cargo-installed binary crate",
          );
    case "flatpak":
      if (operation === "upgrade")
        return packageManagerPlan(
          manager,
          ["update", "--user", ...(packageSpec ? [packageSpec] : [])],
          packageSpec
            ? "Selected Flatpak user app/runtime"
            : "All Flatpak user apps and runtimes",
        );
      if (!packageSpec)
        throw new Error("Flatpak remove requires an application or runtime ID");
      return packageManagerPlan(
        manager,
        ["uninstall", "--user", packageSpec],
        "Flatpak user installation",
      );
    case "winget":
      if (operation === "upgrade")
        return packageManagerPlan(
          manager,
          packageSpec
            ? ["upgrade", "--id", packageSpec, "--exact", "--source", "winget"]
            : ["upgrade", "--all", "--source", "winget"],
          packageSpec
            ? "Selected WinGet package; installer controls install scope"
            : "All upgradeable WinGet packages",
        );
      if (!packageSpec)
        throw new Error("WinGet remove requires an exact package ID");
      return packageManagerPlan(
        manager,
        ["uninstall", "--id", packageSpec, "--exact", "--source", "winget"],
        "Selected WinGet package; installer controls removal scope",
      );
    case "pacman":
      if (operation === "upgrade") {
        if (packageSpec)
          throw new Error("pacman upgrade is system-wide; omit the package ID");
        return packageManagerPlan(
          manager,
          ["-Syu"],
          "System-wide pacman upgrade",
        );
      }
      if (!packageSpec) throw new Error("pacman remove requires a package ID");
      return packageManagerPlan(
        manager,
        ["-R", packageSpec],
        "System pacman database; removal requires system privileges",
      );
    case "vcpkg":
      if (operation === "upgrade") {
        if (packageSpec)
          throw new Error(
            "vcpkg upgrade operates on all outdated classic packages",
          );
        return packageManagerPlan(
          manager,
          ["upgrade", "--no-dry-run"],
          "All outdated vcpkg classic packages; native command has no rollback",
        );
      }
      if (!packageSpec) throw new Error("vcpkg remove requires a port ID");
      return packageManagerPlan(
        manager,
        ["remove", packageSpec],
        "vcpkg classic installed tree",
      );
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
  const args = Bun.argv.slice(2);
  if (args[0] === "--") args.shift();
  const [backend, packageSpec, flag] = args;
  if (
    !backend ||
    !packageSpec ||
    (flag && flag !== "--execute") ||
    args.length > 3
  ) {
    console.error(
      "Usage: bun run packages:install <bun|uv|cargo|flatpak|winget|pacman|vcpkg|fdroid> <package> [--execute]",
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
