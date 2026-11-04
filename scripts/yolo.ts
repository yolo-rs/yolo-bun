#!/usr/bin/env bun
// SPDX-License-Identifier: MIT OR Apache-2.0
// Unified YOLO Bun package CLI. Native package managers retain their own plans.
import { inspectPackageBackends } from "./package-backends";
import {
  executePlan,
  planFdroidCommand,
  planInstall,
  planManageCommand,
} from "./package-install";
import { planResolution } from "./package-resolve";
import { makeImagePlan } from "./image-plan";
import { verifyImagePlan } from "./verify-image-plan";

function usage(): never {
  console.error(`Usage:
  yolo pkg backends
  yolo pkg install <bun|uv|cargo|flatpak|winget|pacman|vcpkg|fdroid> <package> [--execute]
  yolo pkg manage <backend> <search|list|installed|upgrade|remove> [query-or-package] [--execute]
  yolo pkg fdroid <search|show|update|install|upgrade|remove|devices|repos> [arguments...] [--execute]
  yolo pkg resolve <bun|vcpkg> <package>
  yolo pkg image-plan <resolved-profile.json>
  yolo pkg verify-image-plan <plan.json> <files.json>`);
  process.exit(2);
}

async function main() {
  const [, , domain, command, ...args] = Bun.argv;
  if (domain !== "pkg") usage();

  if (command === "backends") {
    if (args.length) usage();
    console.log(JSON.stringify(await inspectPackageBackends(), null, 2));
    return;
  }

  if (command === "fdroid") {
    const [operation, ...rawValues] = args;
    if (!operation) usage();
    const execute = rawValues.at(-1) === "--execute";
    const values = execute ? rawValues.slice(0, -1) : rawValues;
    if (rawValues.some((value) => value === "--execute") && !execute) usage();
    const plan = planFdroidCommand(operation, values);
    if (!execute) {
      console.log(JSON.stringify({ action: "plan", ...plan }, null, 2));
      return;
    }
    process.exitCode = await executePlan(plan);
    return;
  }

  if (command === "manage") {
    const [backend, operation, ...rawValues] = args;
    if (!backend || !operation) usage();
    const execute = rawValues.at(-1) === "--execute";
    const values = execute ? rawValues.slice(0, -1) : rawValues;
    if (rawValues.some((value) => value === "--execute") && !execute) usage();
    if (values.length > 1) usage();
    const plan = planManageCommand(backend, operation, values[0]);
    const readOnly =
      operation === "search" ||
      operation === "list" ||
      operation === "installed";
    if (!execute && !readOnly) {
      console.log(JSON.stringify({ action: "plan", ...plan }, null, 2));
      return;
    }
    process.exitCode = await executePlan(plan);
    return;
  }

  if (command === "install") {
    const [backend, packageSpec, flag] = args;
    if (
      !backend ||
      !packageSpec ||
      (flag !== undefined && flag !== "--execute") ||
      args.length > 3
    )
      usage();
    const plan = planInstall(backend, packageSpec);
    if (flag !== "--execute") {
      console.log(JSON.stringify({ action: "plan", ...plan }, null, 2));
      return;
    }
    process.exitCode = await executePlan(plan);
    return;
  }

  if (command === "resolve") {
    const [backend, packageSpec] = args;
    if (!backend || !packageSpec || args.length !== 2) usage();
    process.exitCode = await executePlan(planResolution(backend, packageSpec));
    return;
  }

  if (command === "image-plan") {
    if (args.length !== 1) usage();
    const profile = await Bun.file(args[0]!).json();
    console.log(JSON.stringify(makeImagePlan(profile), null, 2));
    return;
  }

  if (command === "verify-image-plan") {
    if (args.length !== 2) usage();
    const plan = await Bun.file(args[0]!).json();
    const files = await Bun.file(args[1]!).json();
    const receipt = await verifyImagePlan(plan, files);
    console.log(JSON.stringify(receipt, null, 2));
    if (!receipt.verified) process.exitCode = 1;
    return;
  }

  usage();
}

try {
  await main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
