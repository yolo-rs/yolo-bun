// SPDX-License-Identifier: MIT OR Apache-2.0
/**
 * YOLO Bun Version Manager (`yolo bvm` / `yolo version`)
 *
 * Equivalent to `uv` (Python) + `fnm`/`nvm` (Node) + `mise`/`proto` specifically engineered for
 * Upstream Bun (`stable`, `canary`, `custom-aot`, and pinned versions) with zero conflict:
 *
 * 1. Isolated Slot Store (`~/.yolo/bvm/versions/<channel>/bun.exe`):
 *    - `stable`     : Official Upstream Bun stable release (e.g. `1.4.4+38afee6c8`)
 *    - `canary`     : Official Upstream Bun canary build (e.g. `1.4.4-canary.1+cdfa19bba`)
 *    - `custom-aot` : Local hermetic MSVC/Cranelift AoT build from `upstream/bun` (`1.4.4-canary.1+129f3c7a8`)
 * 2. `.bun-version` & `package.json#packageManager` Automatic Resolution:
 *    - Reads `.bun-version`, `.tool-versions`, or `package.json` (`bun@1.4.4-canary.1`) in the working directory
 *    - Automatically selects the matching isolated slot without mutating the other slots
 * 3. Unified `yolo` Binary with Complete `bun` and `.bun` Compatibility Aliases:
 *    - Generates `yolo`, `bun`, and `.bun` shims/wrappers in `~/.bun/bin` and `C:/src/yolo/bin`
 */
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";

export type BunChannelSlot = "stable" | "canary" | "custom-aot";

export interface BunSlotInfo {
  readonly slot: BunChannelSlot;
  readonly binaryPath: string;
  readonly exists: boolean;
  readonly version: string | null;
  readonly revision: string | null;
  readonly sourceOrigin: string;
}

export interface BvmStateConfig {
  readonly activeSlot: BunChannelSlot;
  readonly updatedAt: string;
  readonly respectBunVersionFile: boolean;
  readonly aliasesConfigured: readonly ("yolo" | "bun" | ".bun")[];
}

export interface BvmStatusReport {
  readonly bvmRoot: string;
  readonly activeSlot: BunChannelSlot;
  readonly resolvedForCwd: {
    readonly slot: BunChannelSlot;
    readonly reason: string;
    readonly binaryPath: string;
  };
  readonly slots: Record<BunChannelSlot, BunSlotInfo>;
  readonly aliases: {
    readonly yoloCmd: string;
    readonly bunAliasCmd: string;
    readonly dotBunAliasCmd: string;
    readonly dotBunHomeDir: string;
  };
  readonly ecosystemComparison: readonly {
    readonly tool: string;
    readonly ecosystem: string;
    readonly yoloBvmEquivalent: string;
  }[];
}

const isWin = process.platform === "win32";
const exeExt = isWin ? ".exe" : "";

export function getBvmRoot(customHome?: string): string {
  const base = customHome ?? process.env.YOLO_HOME ?? join(homedir(), ".yolo");
  return join(base, "bvm");
}

export function getDotBunHome(customHome?: string): string {
  return customHome ?? process.env.BUN_INSTALL ?? join(homedir(), ".bun");
}

function probeBinaryRevision(binPath: string): {
  version: string | null;
  revision: string | null;
} {
  if (!existsSync(binPath)) return { version: null, revision: null };
  try {
    const proc = Bun.spawnSync([binPath, "--revision"], {
      stdout: "pipe",
      stderr: "ignore",
    });
    if (proc.exitCode !== 0) return { version: null, revision: null };
    const raw = new TextDecoder().decode(proc.stdout).trim();
    const [ver, rev] = raw.split("+");
    return {
      version: ver || raw,
      revision: rev ? `${ver}+${rev}` : raw,
    };
  } catch {
    return { version: null, revision: null };
  }
}

/**
 * Discovers existing system Bun binaries on the host workstation so they can be
 * seeded into isolated `~/.yolo/bvm/versions/<slot>/` slots without network downloads.
 */
export function discoverHostBunCandidates(): Record<
  BunChannelSlot,
  { path: string; origin: string }
> {
  const home = homedir();
  const candidates: Record<BunChannelSlot, { path: string; origin: string }> = {
    canary: {
      path: join(
        home,
        ".local",
        "opt",
        "bun-upstream-canary",
        "bin",
        `bun${exeExt}`,
      ),
      origin: "~/.local/opt/bun-upstream-canary (Upstream Canary)",
    },
    stable: {
      path: join(
        home,
        "AppData",
        "Local",
        "Microsoft",
        "WinGet",
        "Links",
        `bun${exeExt}`,
      ),
      origin: "WinGet / Official Stable Release (1.4.4)",
    },
    "custom-aot": {
      path: join(home, ".bun", "bin", `bun${exeExt}`),
      origin: "~/.bun/bin (Local Custom Upstream Build)",
    },
  };

  if (!existsSync(candidates.stable.path)) {
    candidates.stable = {
      path: process.execPath,
      origin: "process.execPath fallback",
    };
  }
  if (!existsSync(candidates.canary.path)) {
    candidates.canary = {
      path: process.execPath,
      origin: "process.execPath fallback",
    };
  }
  if (!existsSync(candidates["custom-aot"].path)) {
    candidates["custom-aot"] = {
      path: process.execPath,
      origin: "process.execPath fallback",
    };
  }

  return candidates;
}

export function loadBvmState(bvmRoot = getBvmRoot()): BvmStateConfig {
  const statePath = join(bvmRoot, "state.json");
  if (existsSync(statePath)) {
    try {
      return JSON.parse(readFileSync(statePath, "utf8")) as BvmStateConfig;
    } catch {
      // Fallback to default
    }
  }
  return {
    activeSlot: "canary",
    updatedAt: new Date().toISOString(),
    respectBunVersionFile: true,
    aliasesConfigured: ["yolo", "bun", ".bun"],
  };
}

export function saveBvmState(
  state: BvmStateConfig,
  bvmRoot = getBvmRoot(),
): void {
  mkdirSync(bvmRoot, { recursive: true });
  writeFileSync(
    join(bvmRoot, "state.json"),
    JSON.stringify(state, null, 2) + "\n",
  );
}

/**
 * Resolves which Bun slot (`stable`, `canary`, or `custom-aot`) should run for a given directory
 * by inspecting `.bun-version` or `package.json#packageManager`, falling back to `state.activeSlot`.
 */
export function resolveSlotForDirectory(
  cwd = process.cwd(),
  bvmRoot = getBvmRoot(),
): { slot: BunChannelSlot; reason: string } {
  const envOverride = process.env.YOLO_BUN_CHANNEL;
  if (
    envOverride === "stable" ||
    envOverride === "canary" ||
    envOverride === "custom-aot"
  ) {
    return { slot: envOverride, reason: "env:YOLO_BUN_CHANNEL" };
  }

  let dir = resolve(cwd);
  for (let depth = 0; depth < 4; depth++) {
    const bunVerFile = join(dir, ".bun-version");
    if (existsSync(bunVerFile)) {
      const content = readFileSync(bunVerFile, "utf8").trim().toLowerCase();
      if (content.includes("canary")) {
        return { slot: "canary", reason: `${bunVerFile} (${content})` };
      }
      if (content.includes("aot") || content.includes("custom")) {
        return { slot: "custom-aot", reason: `${bunVerFile} (${content})` };
      }
      if (content.includes("stable") || /^\d+\.\d+\.\d+$/.test(content)) {
        return { slot: "stable", reason: `${bunVerFile} (${content})` };
      }
    }

    const pkgFile = join(dir, "package.json");
    if (existsSync(pkgFile)) {
      try {
        const pkg = JSON.parse(readFileSync(pkgFile, "utf8")) as {
          packageManager?: string;
        };
        if (pkg.packageManager?.startsWith("bun@")) {
          if (pkg.packageManager.includes("canary")) {
            return {
              slot: "canary",
              reason: `package.json#packageManager (${pkg.packageManager})`,
            };
          }
          if (/^bun@\d+\.\d+\.\d+$/.test(pkg.packageManager)) {
            return {
              slot: "stable",
              reason: `package.json#packageManager (${pkg.packageManager})`,
            };
          }
        }
      } catch {
        // Ignore malformed package.json
      }
    }

    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  const state = loadBvmState(bvmRoot);
  return { slot: state.activeSlot, reason: "bvm:state.activeSlot" };
}

/**
 * Ensures the isolated BVM slot directories exist and registers the `yolo`, `bun`, and `.bun`
 * compatibility aliases in `C:/src/yolo/bin` and `~/.bun/bin`.
 */
export function setupBvmAndAliases(options?: {
  bvmRoot?: string;
  yoloRepoRoot?: string;
  linkBinaries?: boolean;
}): BvmStatusReport {
  const bvmRoot = options?.bvmRoot ?? getBvmRoot();
  const yoloRepoRoot = options?.yoloRepoRoot ?? "C:/src/yolo";
  const discovered = discoverHostBunCandidates();

  const slots: Record<BunChannelSlot, BunSlotInfo> = {} as Record<
    BunChannelSlot,
    BunSlotInfo
  >;

  for (const slot of ["stable", "canary", "custom-aot"] as const) {
    const slotDir = join(bvmRoot, "versions", slot);
    mkdirSync(slotDir, { recursive: true });
    const targetBin = join(slotDir, `bun${exeExt}`);
    const candidate = discovered[slot];

    // Write a lightweight pointer manifest so we don't duplicate 150MB binaries unless requested
    const pointerPath = join(slotDir, "slot.json");
    const effectiveBin =
      options?.linkBinaries && existsSync(candidate.path)
        ? (() => {
            if (!existsSync(targetBin)) {
              copyFileSync(candidate.path, targetBin);
            }
            return targetBin;
          })()
        : existsSync(targetBin)
          ? targetBin
          : candidate.path;

    const probed = probeBinaryRevision(effectiveBin);
    const info: BunSlotInfo = {
      slot,
      binaryPath: effectiveBin,
      exists: existsSync(effectiveBin),
      version: probed.version,
      revision: probed.revision,
      sourceOrigin: candidate.origin,
    };
    writeFileSync(pointerPath, JSON.stringify(info, null, 2) + "\n");
    slots[slot] = info;
  }

  const state = loadBvmState(bvmRoot);
  saveBvmState(state, bvmRoot);

  // Create `yolo`, `bun`, and `.bun` compatibility shims in `C:/src/yolo/bin`
  const yoloBinDir = join(yoloRepoRoot, "bin");
  mkdirSync(yoloBinDir, { recursive: true });

  const activeBinPath = slots[state.activeSlot].binaryPath;
  const cliScriptPath = join(yoloRepoRoot, "scripts", "yolo.ts");

  const yoloCmdPath = join(yoloBinDir, isWin ? "yolo.cmd" : "yolo");
  const bunAliasCmdPath = join(yoloBinDir, isWin ? "bun.cmd" : "bun");
  const dotBunAliasCmdPath = join(yoloBinDir, isWin ? ".bun.cmd" : ".bun");

  if (isWin) {
    writeFileSync(
      yoloCmdPath,
      `@echo off\r\n"${activeBinPath}" "${cliScriptPath}" %*\r\n`,
    );
    writeFileSync(
      bunAliasCmdPath,
      `@echo off\r\n"${activeBinPath}" "${cliScriptPath}" --as-bun %*\r\n`,
    );
    writeFileSync(
      dotBunAliasCmdPath,
      `@echo off\r\n"${activeBinPath}" "${cliScriptPath}" --as-bun %*\r\n`,
    );
  } else {
    const shHeader = "#!/usr/bin/env sh\n";
    writeFileSync(
      yoloCmdPath,
      `${shHeader}exec "${activeBinPath}" "${cliScriptPath}" "$@"\n`,
    );
    writeFileSync(
      bunAliasCmdPath,
      `${shHeader}exec "${activeBinPath}" "${cliScriptPath}" --as-bun "$@"\n`,
    );
    writeFileSync(
      dotBunAliasCmdPath,
      `${shHeader}exec "${activeBinPath}" "${cliScriptPath}" --as-bun "$@"\n`,
    );
  }

  // Also update ~/.bun/bin/yolo.cmd and ~/.bun/bin/.bun.cmd so global PATH has both `yolo` and `.bun`
  const dotBunHome = getDotBunHome();
  const dotBunBin = join(dotBunHome, "bin");
  if (existsSync(dotBunBin) && isWin) {
    writeFileSync(
      join(dotBunBin, "yolo.cmd"),
      `@echo off\r\n"${activeBinPath}" "${cliScriptPath}" %*\r\n`,
    );
    writeFileSync(
      join(dotBunBin, ".bun.cmd"),
      `@echo off\r\n"${activeBinPath}" "${cliScriptPath}" --as-bun %*\r\n`,
    );
  }

  const resolved = resolveSlotForDirectory(process.cwd(), bvmRoot);
  return {
    bvmRoot,
    activeSlot: state.activeSlot,
    resolvedForCwd: {
      slot: resolved.slot,
      reason: resolved.reason,
      binaryPath: slots[resolved.slot].binaryPath,
    },
    slots,
    aliases: {
      yoloCmd: yoloCmdPath,
      bunAliasCmd: bunAliasCmdPath,
      dotBunAliasCmd: dotBunAliasCmdPath,
      dotBunHomeDir: dotBunHome,
    },
    ecosystemComparison: [
      {
        tool: "uv (Astral)",
        ecosystem: "Python",
        yoloBvmEquivalent:
          "yolo bvm use <stable|canary|custom-aot> + .bun-version",
      },
      {
        tool: "fnm / nvm / volta",
        ecosystem: "Node.js",
        yoloBvmEquivalent:
          "Zero-conflict ~/.yolo/bvm/versions/<slot> isolation",
      },
      {
        tool: "mise / proto / bvm",
        ecosystem: "Polyglot / Bun",
        yoloBvmEquivalent:
          "Native yolo binary with bun & .bun passthrough aliases",
      },
    ],
  };
}

/**
 * Switches the active Bun version slot (`stable`, `canary`, or `custom-aot`) without conflict
 * and updates the `yolo`, `bun`, and `.bun` shims.
 */
export function switchBunVersion(
  slot: BunChannelSlot,
  options?: {
    bvmRoot?: string;
    yoloRepoRoot?: string;
    writeBunVersionFile?: string;
  },
): BvmStatusReport {
  const bvmRoot = options?.bvmRoot ?? getBvmRoot();
  const state: BvmStateConfig = {
    activeSlot: slot,
    updatedAt: new Date().toISOString(),
    respectBunVersionFile: true,
    aliasesConfigured: ["yolo", "bun", ".bun"],
  };
  saveBvmState(state, bvmRoot);

  if (options?.writeBunVersionFile) {
    writeFileSync(
      join(options.writeBunVersionFile, ".bun-version"),
      `${slot}\n`,
    );
  }

  return setupBvmAndAliases({
    bvmRoot,
    yoloRepoRoot: options?.yoloRepoRoot,
  });
}
