#!/usr/bin/env bun
// SPDX-License-Identifier: MIT OR Apache-2.0
/**
 * Unified `yolo` Binary (with complete `bun` and `.bun` compatibility aliases).
 *
 * Merges:
 * 1. `yolo` Fleet & Meta-Platform Orchestrator (`status`, `fleet`, `git`, `publish`, `registry`, `storage`, `sync`, `upstream`, `arena`, `winclean`, `org`, `leak`, `dashboard`)
 * 2. `yolo-bun` Package, Site & Google/Chromium Runtime (`pkg`, `site`, `google`)
 * 3. `yolo bvm` (Bun Version Manager — `uv` / `fnm` / `mise` equivalent for `stable`, `canary`, and `custom-aot` switching + `.bun-version` resolution)
 * 4. Complete `bun` and `.bun` CLI passthrough (`run`, `test`, `install`, `add`, `remove`, `build`, `fmt`, `lint`, `check`, `upgrade`, `x`, `--version`, `--revision`, or invoked via `bun` / `.bun` alias)
 */
import { basename, resolve } from "node:path";
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
import {
  auditBunComForkWebVitals,
  buildBunComSiteIndex,
  createBunComFetchHandler,
  generateBunComLlmsTxt,
  searchBunComDocs,
} from "./bun-com-fork";
import {
  auditNodeBunV8BoringSslCoAbi,
  auditTypeScriptSourceForGts,
  CEF_AUTOMATE_WORKFLOW_SPEC,
  CHROMIUM_DASHBOARD_FEATURES_2026,
  CHROMIUM_GITHUB_COLLABORATION_SPEC,
  CHROMIUM_OS_SOVEREIGN_PROFILE,
  ELECTRON_GN_ARGS_HIERARCHY,
  ELECTRON_PATCH_CONFIG_TARGETS,
  executeElectronBuildToolsCommand,
  GOOGLE_APIS_CATALOG_2026,
  GOOGLE_M3_DARK_TOKENS,
  HELIUM_BRAVE_CHROMIUM_PATCHES,
  inspectDepotTools,
  loadGoogleStyleguide2026,
  loadMergedStandardsSchemas,
  MODERN_WEB_GUIDANCE_RULES_2026,
  orchestrateSrcTree,
  planChromiumRollerUpdate,
  verifyThirdPartyDeps,
  WEB_GUIDELINES_CATALOG_2026,
  type EvmProfileType,
} from "../packages/yolo-bun-plugin/src/index";
import {
  resolveSlotForDirectory,
  setupBvmAndAliases,
  switchBunVersion,
  type BunChannelSlot,
} from "./bvm";
import {
  auditWorkspaceChromiumAlignment,
  CHROMIUM_CHANNEL_PROFILES_2026,
  CHROMIUM_THIRD_PARTY_ALIGNMENT_MATRIX,
  resolveChromiumChannelForDirectory,
  switchChromiumChannel,
  UPSTREAM_ENGINES_MATRIX_2026,
  type ChromiumReleaseChannel,
} from "./cvm";

const rawDir = import.meta.dir;
const root =
  rawDir.startsWith("B:\\~BUN") || rawDir.startsWith("/$bunfs")
    ? (process.env.YOLO_REPO_ROOT ?? "C:/src/yolo")
    : resolve(rawDir, "..");

const BUN_NATIVE_SUBCOMMANDS = new Set([
  "run",
  "test",
  "install",
  "i",
  "add",
  "a",
  "remove",
  "rm",
  "update",
  "outdated",
  "link",
  "unlink",
  "pm",
  "build",
  "compile",
  "init",
  "create",
  "upgrade",
  "fmt",
  "lint",
  "check",
  "x",
  "exec",
  "repl",
  "patch",
  "audit",
  "why",
  "--version",
  "-v",
  "--revision",
]);

const FLEET_COMMANDS: Record<string, string[]> = {
  status: ["run", "scripts/status.ts"],
  registry: ["run", "scripts/registry-check.ts"],
  publish: ["run", "scripts/publish-all.ts"],
  fleet: ["run", "fleet/fleet.ts"],
  storage: ["run", "scripts/storage-status.ts"],
  sync: ["run", "scripts/fleet-sync.ts"],
  upstream: ["run", "scripts/upstream-monitor.ts"],
  git: ["run", "scripts/yolo-git.ts"],
  arena: ["run", "../yolo-ai/scripts/yolo-a2a-arena.ts"],
  winclean: ["run", "../yolo-ai/scripts/yolo-a2a-arena.ts", "winclean"],
  org: ["run", "scripts/org-manager.ts"],
  leak: ["run", "scripts/leak-detector.ts"],
  "github-app": ["run", "scripts/github-app-setup.ts"],
  dashboard: ["run", "scripts/dashboard-runner.ts"],
};

function usage(): never {
  console.error(`Usage (Unified yolo & bun / .bun binary):
  # 1. Bun Version Manager (uv / fnm / mise equivalent for Bun)
  yolo bvm status
  yolo bvm list
  yolo bvm use <stable|canary|custom-aot> [--pin]
  yolo bvm which
  yolo bvm setup

  # 2. Complete Bun & .bun Compatibility Alias / Passthrough
  yolo --as-bun <any-bun-args...>
  yolo <run|test|install|add|remove|build|fmt|lint|check|upgrade|x> [args...]

  # 3. Package & Image Management (yolo-bun)
  yolo pkg backends
  yolo pkg install <bun|uv|cargo|flatpak|winget|pacman|nix|vcpkg|fdroid|play-store> <package> [--execute]
  yolo pkg manage <backend> <search|list|installed|upgrade|remove> [query-or-package] [--execute]
  yolo pkg fdroid <search|show|update|install|upgrade|remove|devices|repos> [arguments...] [--execute]
  yolo pkg resolve <bun|vcpkg|nix|play-store> <package>
  yolo pkg image-plan <resolved-profile.json>
  yolo pkg verify-image-plan <plan.json> <files.json>

  # 4. Sovereign bun.com Fork & Web Vitals 4x100
  yolo site index
  yolo site search <query>
  yolo site audit
  yolo site serve [port]

  # 5. Google Open Source, Chromium, depot_tools & /src Orchestrator
  yolo google third-party
  yolo google styleguide [file]
  yolo google standards
  yolo google stack
  yolo google chromium
  yolo google depot-tools
  yolo google orchestrate [src-root]

  # 6. YOLO Fleet & Meta-Platform Commands
  yolo <status|fleet|git|publish|registry|storage|sync|upstream|arena|winclean|org|leak|dashboard> [args...]`);
  process.exit(2);
}

async function delegateToSelectedBun(
  args: string[],
  cwd = process.cwd(),
): Promise<number> {
  const report = setupBvmAndAliases({ yoloRepoRoot: root });
  const targetBin = report.resolvedForCwd.binaryPath;
  const child = Bun.spawn([targetBin, ...args], {
    cwd,
    env: process.env,
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  });
  return await child.exited;
}

async function main() {
  const rawArgv = Bun.argv.slice(2);
  const invokedName = basename(Bun.argv[1] ?? "yolo").toLowerCase();

  // Direct `bun` or `.bun` alias invocation or explicit `--as-bun` flag
  if (
    rawArgv[0] === "--as-bun" ||
    invokedName === "bun" ||
    invokedName === "bun.exe" ||
    invokedName === "bun.cmd" ||
    invokedName === ".bun" ||
    invokedName === ".bun.exe" ||
    invokedName === ".bun.cmd"
  ) {
    const bunArgs = rawArgv[0] === "--as-bun" ? rawArgv.slice(1) : rawArgv;
    process.exitCode = await delegateToSelectedBun(bunArgs);
    return;
  }

  const [domain, command, ...args] = rawArgv;
  if (!domain || domain === "help" || domain === "--help" || domain === "-h") {
    usage();
  }

  // 1. Bun Version Manager (`yolo bvm ...` or `yolo use ...`)
  if (domain === "bvm" || domain === "version") {
    const sub = command ?? "status";
    if (sub === "status" || sub === "list" || sub === "ls") {
      const report = setupBvmAndAliases({ yoloRepoRoot: root });
      console.log(JSON.stringify(report, null, 2));
      return;
    }
    if (sub === "setup") {
      const report = setupBvmAndAliases({ yoloRepoRoot: root });
      console.log(
        JSON.stringify({ action: "bvm-setup-complete", ...report }, null, 2),
      );
      return;
    }
    if (sub === "which") {
      const report = setupBvmAndAliases({ yoloRepoRoot: root });
      console.log(JSON.stringify(report.resolvedForCwd, null, 2));
      return;
    }
    if (sub === "use" || sub === "switch") {
      const targetSlot = args[0] as BunChannelSlot | undefined;
      if (
        targetSlot !== "stable" &&
        targetSlot !== "canary" &&
        targetSlot !== "custom-aot"
      ) {
        usage();
      }
      const pinInCwd = args.includes("--pin") ? process.cwd() : undefined;
      const report = switchBunVersion(targetSlot, {
        yoloRepoRoot: root,
        writeBunVersionFile: pinInCwd,
      });
      console.log(
        JSON.stringify(
          {
            action: "switched",
            activeSlot: report.activeSlot,
            activeBinary: report.slots[report.activeSlot].binaryPath,
            activeRevision: report.slots[report.activeSlot].revision,
            pinnedInDir: pinInCwd ?? null,
          },
          null,
          2,
        ),
      );
      return;
    }
    usage();
  }

  // 1b. Chromium Version Manager (`yolo cvm ...` or `yolo chromium ...`)
  if (domain === "cvm" || domain === "chromium") {
    const sub = command ?? "status";
    if (sub === "status" || sub === "list" || sub === "ls") {
      const resolved = resolveChromiumChannelForDirectory(process.cwd());
      const audit = auditWorkspaceChromiumAlignment(resolved.channel);
      console.log(
        JSON.stringify(
          {
            resolvedForCwd: resolved,
            channels: CHROMIUM_CHANNEL_PROFILES_2026,
            audit,
          },
          null,
          2,
        ),
      );
      return;
    }
    if (sub === "matrix" || sub === "engines") {
      console.log(
        JSON.stringify(
          {
            upstreamEngines: UPSTREAM_ENGINES_MATRIX_2026,
            thirdPartyMatrix: CHROMIUM_THIRD_PARTY_ALIGNMENT_MATRIX,
          },
          null,
          2,
        ),
      );
      return;
    }
    if (sub === "audit" || sub === "align") {
      const targetChannel =
        (args[0] as ChromiumReleaseChannel | undefined) ??
        resolveChromiumChannelForDirectory(process.cwd()).channel;
      const audit = auditWorkspaceChromiumAlignment(targetChannel);
      console.log(JSON.stringify(audit, null, 2));
      if (audit.alignedCount < audit.totalConsumersChecked) {
        process.exitCode = 1;
      }
      return;
    }
    if (sub === "use" || sub === "switch") {
      const targetChannel = args[0] as ChromiumReleaseChannel | undefined;
      if (
        targetChannel !== "stable" &&
        targetChannel !== "dev" &&
        targetChannel !== "canary"
      ) {
        usage();
      }
      const pinInCwd = args.includes("--pin") ? process.cwd() : undefined;
      const result = switchChromiumChannel(targetChannel, {
        pinDirectory: pinInCwd,
      });
      console.log(
        JSON.stringify(
          {
            action: "chromium-channel-switched",
            activeChannel: result.state.activeChannel,
            alignedBvmSlot: result.state.alignedBvmSlot,
            profile: result.profile,
            pinnedInDir: pinInCwd ?? null,
            auditSummary: {
              totalComponents: result.audit.totalComponents,
              totalConsumersChecked: result.audit.totalConsumersChecked,
              alignedCount: result.audit.alignedCount,
            },
          },
          null,
          2,
        ),
      );
      return;
    }
    usage();
  }

  // 2. YOLO Fleet commands (`status`, `fleet`, `git`, `publish`, etc.)
  if (domain in FLEET_COMMANDS) {
    const fleetCmd = FLEET_COMMANDS[domain]!;
    const forwarded = [command, ...args].filter(Boolean);
    const child = Bun.spawn([process.execPath, ...fleetCmd, ...forwarded], {
      cwd: root,
      env: process.env,
      stdin: "inherit",
      stdout: "inherit",
      stderr: "inherit",
    });
    process.exitCode = await child.exited;
    return;
  }

  // 3. Native Bun subcommand passthrough (`yolo test`, `yolo run`, `yolo fmt`, `yolo check`, etc.)
  if (BUN_NATIVE_SUBCOMMANDS.has(domain)) {
    process.exitCode = await delegateToSelectedBun(rawArgv);
    return;
  }

  // 4. Google & Chromium Toolkit (`yolo google ...`)
  if (domain === "google") {
    if (command === "third-party" && args.length === 0) {
      const report = verifyThirdPartyDeps();
      console.log(JSON.stringify(report, null, 2));
      if (!report.valid) process.exitCode = 1;
      return;
    }
    if (command === "styleguide") {
      const styleguide = loadGoogleStyleguide2026();
      const targetFile = args[0];
      if (targetFile) {
        const source = await Bun.file(targetFile).text();
        const audit = auditTypeScriptSourceForGts(source);
        console.log(
          JSON.stringify({ styleguide, file: targetFile, audit }, null, 2),
        );
        if (!audit.valid) process.exitCode = 1;
        return;
      }
      console.log(JSON.stringify(styleguide, null, 2));
      return;
    }
    if (command === "standards" && args.length === 0) {
      const schemas = loadMergedStandardsSchemas();
      console.log(
        JSON.stringify(
          {
            webGuidelines: WEB_GUIDELINES_CATALOG_2026,
            schemas,
          },
          null,
          2,
        ),
      );
      return;
    }
    if (command === "stack" && args.length === 0) {
      console.log(
        JSON.stringify(
          {
            runtime: "yolo + yolo-bun + yolo-standards + google-bun unified",
            chromiumTarget: "v144+",
            m3DarkTokens: GOOGLE_M3_DARK_TOKENS,
            googleApisCatalog: GOOGLE_APIS_CATALOG_2026,
          },
          null,
          2,
        ),
      );
      return;
    }
    if (command === "chromium" && args.length === 0) {
      console.log(
        JSON.stringify(
          {
            collaboration: CHROMIUM_GITHUB_COLLABORATION_SPEC,
            dashboardFeatures: CHROMIUM_DASHBOARD_FEATURES_2026,
            modernWebGuidance: MODERN_WEB_GUIDANCE_RULES_2026,
            heliumBravePatches: HELIUM_BRAVE_CHROMIUM_PATCHES,
            chromiumOs: CHROMIUM_OS_SOVEREIGN_PROFILE,
          },
          null,
          2,
        ),
      );
      return;
    }
    if (command === "depot-tools" && args.length === 0) {
      console.log(JSON.stringify(inspectDepotTools(), null, 2));
      return;
    }
    if (command === "orchestrate") {
      const report = orchestrateSrcTree(args[0] ?? "C:/src");
      console.log(JSON.stringify(report, null, 2));
      return;
    }
    if (command === "electron" || command === "cef") {
      const sub = args[0] ?? "summary";
      if (sub === "e") {
        const eCmd = (args[1] ?? "sync") as
          | "init"
          | "sync"
          | "build"
          | "patches"
          | "d"
          | "backport"
          | "gn-check"
          | "roll";
        const profile = (args[2] ?? "testing") as EvmProfileType;
        console.log(
          JSON.stringify(
            executeElectronBuildToolsCommand(eCmd, { profile }),
            null,
            2,
          ),
        );
        return;
      }
      if (sub === "roller") {
        const roll = planChromiumRollerUpdate({
          branch: args[1] ?? "main",
          currentChromiumVersion: args[2] ?? "156.0.7103.48",
          targetChannel: "canary",
          channels: {
            stable: "156.0.7103.48",
            beta: "157.0.7151.10",
            dev: "157.0.7151.14",
            canary: "158.0.7192.2",
          },
        });
        console.log(JSON.stringify(roll, null, 2));
        return;
      }
      console.log(
        JSON.stringify(
          {
            electronPatchTargets: ELECTRON_PATCH_CONFIG_TARGETS,
            electronGnArgsHierarchy: ELECTRON_GN_ARGS_HIERARCHY,
            coAbiSpec: auditNodeBunV8BoringSslCoAbi(),
            cefWorkflowSpec: CEF_AUTOMATE_WORKFLOW_SPEC,
          },
          null,
          2,
        ),
      );
      return;
    }
    usage();
  }

  // 5. Sovereign bun.com Fork (`yolo site ...`)
  if (domain === "site") {
    const index = await buildBunComSiteIndex();
    if (command === "index" && args.length === 0) {
      await Bun.write(
        "catalog/bun-com-index.json",
        JSON.stringify(index, null, 2) + "\n",
      );
      await Bun.write(
        "docs/upstream/bun-com-llms.txt",
        generateBunComLlmsTxt(index),
      );
      console.log(
        JSON.stringify(
          {
            action: "indexed",
            canonicalOrigin: index.canonicalOrigin,
            upstreamCommit: index.upstreamCommit,
            totalPages: index.totalPages,
            totalMdxFiles: index.totalMdxFiles,
          },
          null,
          2,
        ),
      );
      return;
    }
    if (command === "search" && args.length > 0) {
      const hits = await searchBunComDocs(args.join(" "));
      console.log(JSON.stringify(hits, null, 2));
      return;
    }
    if (command === "audit" && args.length === 0) {
      const report = await auditBunComForkWebVitals(index);
      console.log(JSON.stringify(report, null, 2));
      if (report.overallScore < 100 || !report.coreWebVitals.withinBudget) {
        process.exitCode = 1;
      }
      return;
    }
    if (command === "serve") {
      const port = Number(args[0] ?? 3144);
      const server = Bun.serve({
        port,
        fetch: createBunComFetchHandler(index),
      });
      console.log(
        `Serving sovereign bun.com fork at http://127.0.0.1:${server.port}`,
      );
      return;
    }
    usage();
  }

  // 6. Native Package Management (`yolo pkg ...`)
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

export { resolveSlotForDirectory };

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
