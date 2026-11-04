// SPDX-License-Identifier: MIT OR Apache-2.0
// Delegate dependency resolution to the native backend without installation.
import { executePlan, planInstall, type InstallPlan } from "./package-install";

export function planResolution(
  backend: string,
  packageSpec: string,
): InstallPlan {
  if (backend !== "vcpkg" && backend !== "bun")
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
  return {
    ...plan,
    args: ["install", "--classic", "--dry-run", packageSpec],
    scope: "vcpkg classic dry-run; no packages installed or removed",
  };
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  if (args[0] === "--") args.shift();
  if (args.length !== 2 || !args[0] || !args[1]) {
    console.error("Usage: bun run packages:resolve <bun|vcpkg> <package>");
    process.exit(2);
  }
  try {
    process.exit(await executePlan(planResolution(args[0], args[1])));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
