// SPDX-License-Identifier: MIT OR Apache-2.0
// Delegate dependency resolution to the native backend without installation.
import { executePlan, planInstall, type InstallPlan } from "./package-install";

export function planResolution(
  backend: string,
  packageSpec: string,
): InstallPlan {
  if (
    backend !== "vcpkg" &&
    backend !== "bun" &&
    backend !== "nix" &&
    backend !== "play-store"
  )
    throw new Error(`Dependency resolution is not implemented for ${backend}`);
  const plan = planInstall(backend, packageSpec);
  if (backend === "bun") {
    return {
      ...plan,
      args: ["add", "--global", "--dry-run", packageSpec],
      scope:
        "Bun global dry-run; may read global state and download to cache; output can describe simulated installs",
    };
  }
  if (backend === "nix") {
    const flakeRef = packageSpec.startsWith("nixpkgs#")
      ? packageSpec
      : `nixpkgs#${packageSpec}`;
    return {
      ...plan,
      args: ["eval", "--raw", `${flakeRef}.outPath`],
      scope: "Nix flake store-path resolution without installation",
    };
  }
  if (backend === "play-store") {
    const channel = packageSpec.includes(";android-desktop;") ? "3" : "0";
    return {
      ...plan,
      args: [`--channel=${channel}`, "--list", packageSpec],
      scope:
        "Android 17 x64 Google Play / GoogleBook (API 37.x, ChromiumOS, Aluminium OS) SDK package resolution without installation",
    };
  }
  return {
    ...plan,
    args: ["install", "--classic", "--dry-run", packageSpec],
    scope: "vcpkg classic dry-run; no packages installed or removed",
  };
}

if (import.meta.main) {
  const args = Bun.argv.slice(2);
  if (args[0] === "--") args.shift();
  if (args.length !== 2 || !args[0] || !args[1]) {
    console.error(
      "Usage: bun run packages:resolve <bun|vcpkg|nix|play-store> <package>",
    );
    process.exit(2);
  }
  try {
    process.exit(await executePlan(planResolution(args[0], args[1])));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
