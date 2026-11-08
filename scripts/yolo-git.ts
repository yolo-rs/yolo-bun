#!/usr/bin/env bun
// SPDX-License-Identifier: MIT OR Apache-2.0
/**
 * Unified Git & GitHub Fleet Manager (`yolo git`) mixing:
 * - `aphrody-labs` (public product/main org, UI applications, desktop & plugin integrations)
 * - `aphrody-dev` (personal/research & upstream mirrors)
 * - `yolo-rs` (core reusable Rust/Bun libraries, testing, research, dev env, standards)
 * with Google/Chromium (`depot_tools` / `gclient` / `repo` style) parallel multi-repo workflows.
 *
 * Subcommands:
 *   yolo git status [--json] [--all]     Fast parallel status across local C:\src\* checkouts
 *   yolo git sync [--dry] [--merge-all]  Non-destructive parallel fetch + ff-only on main, main-only hooks, optional server-side merge-all
 *   yolo git orgs [--json]               Query aphrody-labs, aphrody-dev, and yolo-rs via GitHub API and reconcile scope boundaries
 */

import { copyFileSync, chmodSync, existsSync, readdirSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { resolveGithubToken } from "./upstream-monitor";

const ROOT = resolve(import.meta.dir, "..");
const SRC_ROOT = resolve(ROOT, "..");
const HOOKS_DIR = join(import.meta.dir, "hooks");
const GIT_BIN = Bun.which("git.exe") ?? Bun.which("git") ?? "git";

export type RepoScope = "aphrody-product" | "yolo-core" | "community" | "google-upstream" | "archive" | "external";

export interface LocalRepoStatus {
  name: string;
  path: string;
  scope: RepoScope;
  branch: string | null;
  head: string | null;
  upstream: string | null;
  originUrl: string | null;
  ahead: number;
  behind: number;
  staged: number;
  unstaged: number;
  untracked: number;
  conflicts: number;
  clean: boolean;
  onMain: boolean;
  hooksInstalled: boolean;
  lastCommitAt: string | null;
  lastCommitSubject: string | null;
}

export interface OrgRepoEntry {
  owner: string;
  name: string;
  fullName: string;
  private: boolean;
  fork: boolean;
  archived: boolean;
  stars: number;
  defaultBranch: string;
  pushedAt: string | null;
  language: string | null;
  scopeRole: "aphrody-product" | "yolo-core-lib" | "research-mirror";
  localCheckout: string | null;
}

export interface OrgsReconciliationReport {
  generatedAt: string;
  architecturePolicy: {
    aphrodyLabs: string;
    aphrodyDev: string;
    yoloRs: string;
  };
  totals: {
    aphrodyLabs: number;
    aphrodyDev: number;
    yoloRs: number;
  };
  orgs: {
    "aphrody-labs": OrgRepoEntry[];
    "aphrody-dev": OrgRepoEntry[];
    "yolo-rs": OrgRepoEntry[];
  };
  localToRemoteReconciliation: Array<{
    localRepo: string;
    originUrl: string | null;
    detectedOwner: string | null;
    recommendedOwner: "aphrody-labs" | "yolo-rs" | "upstream";
    status: "aligned" | "needs-remote" | "owner-mismatch" | "upstream-pin";
    note: string;
  }>;
}

async function runGit(repoPath: string, args: string[], timeoutMs = 45_000): Promise<{ code: number; out: string; err: string }> {
  const proc = Bun.spawn([GIT_BIN, "-C", repoPath, "-c", "gc.auto=0", ...args], {
    env: { ...process.env, GIT_TERMINAL_PROMPT: "0", LC_ALL: "C" },
    stdin: "ignore",
    stdout: "pipe",
    stderr: "pipe",
    timeout: timeoutMs,
    windowsHide: true,
  });
  const [out, err, code] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  return { code, out: out.trim(), err: err.trim() };
}

function classifyScope(name: string, originUrl: string | null): RepoScope {
  const lower = name.toLowerCase();
  const url = (originUrl ?? "").toLowerCase();
  if (lower.startsWith("yolo") || url.includes("yolo-rs/")) return "yolo-core";
  if (lower === "shenron" || lower === "sheron" || lower === "rosegriffon" || url.includes("aphrody-dev/shenron") || url.includes("aphrody-dev/rosegriffon")) {
    return "community";
  }
  if (lower.startsWith("bun-os") || lower === "archive") {
    return "archive";
  }
  if (
    url.includes("aphrody-labs/") ||
    url.includes("aphrody-dev/") ||
    ["auto", "wii-os", "fcmcp", "concat"].includes(lower)
  ) {
    return "aphrody-product";
  }
  if (
    url.includes("googlesource.com") ||
    ["chromium", "depot_tools", "android-tv"].includes(lower)
  ) {
    return "google-upstream";
  }
  return "external";
}

export function discoverSrcRepos(srcRoot = SRC_ROOT, includeAll = true): string[] {
  const entries = readdirSync(srcRoot, { withFileTypes: true });
  const dirs: string[] = [];
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    if (e.name.startsWith(".") || e.name.startsWith("_")) continue;
    const full = join(srcRoot, e.name);
    if (existsSync(join(full, ".git"))) {
      if (!includeAll && !e.name.startsWith("yolo")) continue;
      dirs.push(full);
    } else if (e.name === "products" && includeAll) {
      const prodEntries = readdirSync(full, { withFileTypes: true });
      for (const p of prodEntries) {
        if (!p.isDirectory()) continue;
        const prodFull = join(full, p.name);
        if (existsSync(join(prodFull, ".git"))) {
          dirs.push(prodFull);
        }
      }
    }
  }
  return dirs.sort((a, b) => basename(a).localeCompare(basename(b)));
}

async function inspectLocalRepo(repoPath: string): Promise<LocalRepoStatus> {
  const name = basename(repoPath);
  const isHugeUpstream = ["chromium", "vcpkg", "bun-os-archive"].includes(name.toLowerCase());
  const statusArgs = isHugeUpstream
    ? ["status", "--porcelain=v2", "--branch", "--untracked-files=no", "--ignore-submodules=all"]
    : ["status", "--porcelain=v2", "--branch", "--untracked-files=normal", "--ignore-submodules=dirty"];
  const [statusRes, originRes, logRes, gitDirRes] = await Promise.all([
    runGit(repoPath, statusArgs, 15_000),
    runGit(repoPath, ["remote", "get-url", "origin"], 5_000),
    runGit(repoPath, ["log", "-1", "--format=%cI%x1f%h%x1f%s"], 5_000),
    runGit(repoPath, ["rev-parse", "--git-common-dir"], 5_000),
  ]);

  const originUrl = originRes.code === 0 && originRes.out ? originRes.out : null;
  const scope = classifyScope(name, originUrl);

  let branch: string | null = null;
  let upstream: string | null = null;
  let ahead = 0;
  let behind = 0;
  let staged = 0;
  let unstaged = 0;
  let untracked = 0;
  let conflicts = 0;

  if (statusRes.code === 0) {
    for (const line of statusRes.out.split(/\r?\n/)) {
      if (!line) continue;
      if (line.startsWith("# branch.head ")) {
        const b = line.slice("# branch.head ".length).trim();
        branch = b === "(detached)" ? null : b;
      } else if (line.startsWith("# branch.upstream ")) {
        upstream = line.slice("# branch.upstream ".length).trim();
      } else if (line.startsWith("# branch.ab ")) {
        const m = line.match(/\+(\d+)\s+-(\d+)/);
        if (m) {
          ahead = Number(m[1]);
          behind = Number(m[2]);
        }
      } else if (line.startsWith("? ")) {
        untracked++;
      } else if (!line.startsWith("# ")) {
        const kind = line[0];
        const xy = line.slice(2, 4);
        if (kind === "u") conflicts++;
        if (xy[0] && xy[0] !== ".") staged++;
        if (xy[1] && xy[1] !== ".") unstaged++;
      }
    }
  }

  const [lastCommitAt = null, head = null, lastCommitSubject = null] =
    logRes.code === 0 && logRes.out ? logRes.out.split("\x1f") : [];

  let hooksInstalled = false;
  if (gitDirRes.code === 0 && gitDirRes.out) {
    const prePush = join(repoPath, gitDirRes.out, "hooks", "pre-push");
    hooksInstalled = existsSync(prePush);
  }

  const clean = staged === 0 && unstaged === 0 && untracked === 0 && conflicts === 0;
  const onMain = branch === "main" || branch === "master";

  return {
    name,
    path: repoPath.replaceAll("\\", "/"),
    scope,
    branch,
    head,
    upstream,
    originUrl,
    ahead,
    behind,
    staged,
    unstaged,
    untracked,
    conflicts,
    clean,
    onMain,
    hooksInstalled,
    lastCommitAt,
    lastCommitSubject,
  };
}

export async function gitFleetStatus(options?: { includeAll?: boolean; concurrency?: number }): Promise<LocalRepoStatus[]> {
  const dirs = discoverSrcRepos(SRC_ROOT, options?.includeAll ?? true);
  const concurrency = Math.max(1, options?.concurrency ?? 8);
  const out: LocalRepoStatus[] = new Array(dirs.length);
  let idx = 0;

  await Promise.all(
    Array.from({ length: Math.min(concurrency, dirs.length) }, async () => {
      while (idx < dirs.length) {
        const current = idx++;
        out[current] = await inspectLocalRepo(dirs[current]!);
      }
    }),
  );

  return out;
}

export function printFleetStatusTable(statuses: LocalRepoStatus[]): void {
  console.log(
    `[yolo git status] Scanned ${statuses.length} repositories under ${SRC_ROOT.replaceAll("\\", "/")} (gclient/repo parallel mode)`,
  );
  console.log(
    "REPO".padEnd(20) +
      "SCOPE".padEnd(18) +
      "BRANCH".padEnd(14) +
      "HEAD".padEnd(10) +
      "SYNC".padEnd(12) +
      "WORKTREE".padEnd(24) +
      "HOOKS",
  );
  console.log("-".repeat(106));

  for (const s of statuses) {
    const br = (s.branch ?? "(detached)").slice(0, 12);
    const hd = (s.head ?? "-").slice(0, 8);
    const sync = s.upstream ? `+${s.ahead}/-${s.behind}` : "no-up";
    const wt = s.clean ? "clean" : `M:${s.staged + s.unstaged} ?: ${s.untracked}${s.conflicts ? ` !:${s.conflicts}` : ""}`;
    const hk = s.hooksInstalled ? "main-only" : "-";
    console.log(
      s.name.slice(0, 19).padEnd(20) +
        s.scope.padEnd(18) +
        br.padEnd(14) +
        hd.padEnd(10) +
        sync.padEnd(12) +
        wt.padEnd(24) +
        hk,
    );
  }
}

export async function gitFleetSync(options?: {
  dryRun?: boolean;
  runMergeAll?: boolean;
}): Promise<{
  syncedAt: string;
  dryRun: boolean;
  results: Array<{ repo: string; branch: string | null; action: string; detail: string }>;
}> {
  const dryRun = Boolean(options?.dryRun);
  const dirs = discoverSrcRepos(SRC_ROOT, true);
  const results: Array<{ repo: string; branch: string | null; action: string; detail: string }> = [];

  for (const repoPath of dirs) {
    const name = basename(repoPath);
    const st = await inspectLocalRepo(repoPath);
    if (st.scope !== "yolo-core" && st.scope !== "aphrody-product") {
      results.push({ repo: name, branch: st.branch, action: "skipped-external", detail: st.scope });
      continue;
    }

    // 1. Ensure main-only hooks on yolo/aphrody repos
    const notes: string[] = [];
    if (!dryRun && existsSync(HOOKS_DIR)) {
      const gitDirRes = await runGit(repoPath, ["rev-parse", "--git-common-dir"]);
      const hpRes = await runGit(repoPath, ["config", "core.hooksPath"]);
      if (gitDirRes.code === 0 && !hpRes.out) {
        const hookTargetDir = join(repoPath, gitDirRes.out, "hooks");
        for (const h of ["pre-push", "post-commit"]) {
          const srcHook = join(HOOKS_DIR, h);
          const dstHook = join(hookTargetDir, h);
          if (existsSync(srcHook)) {
            try {
              copyFileSync(srcHook, dstHook);
              chmodSync(dstHook, 0o755);
              notes.push(`hook:${h}`);
            } catch {
              // Ignore hook write errors on read-only git dirs
            }
          }
        }
      }
    }

    if (!st.originUrl) {
      results.push({ repo: name, branch: st.branch, action: "no-remote", detail: notes.join(",") || "local only" });
      continue;
    }

    if (dryRun) {
      results.push({
        repo: name,
        branch: st.branch,
        action: "dry-run",
        detail: `would fetch ${st.originUrl} and ff-only on main`,
      });
      continue;
    }

    const fetchRes = await runGit(repoPath, ["fetch", "--no-tags", "--no-recurse-submodules", "--quiet", "origin"]);
    if (fetchRes.code !== 0) {
      results.push({
        repo: name,
        branch: st.branch,
        action: "fetch-failed",
        detail: fetchRes.err.split(/\r?\n/)[0]?.slice(0, 100) ?? "fetch error",
      });
      continue;
    }

    if (st.branch === "main" && st.upstream && st.ahead === 0 && st.behind > 0 && st.clean) {
      const ff = await runGit(repoPath, ["merge", "--ff-only", "--quiet", st.upstream]);
      results.push({
        repo: name,
        branch: st.branch,
        action: ff.code === 0 ? "ff-merged" : "ff-refused",
        detail: ff.code === 0 ? `fast-forwarded ${st.behind} commits` : ff.err.slice(0, 100),
      });
    } else {
      results.push({
        repo: name,
        branch: st.branch,
        action: "fetched",
        detail: [`+${st.ahead}/-${st.behind}`, notes.join(",")].filter(Boolean).join(" "),
      });
    }
  }

  if (options?.runMergeAll) {
    const mergeAllScript = join(ROOT, "scripts", "merge-all.ts");
    if (existsSync(mergeAllScript)) {
      const args = ["run", mergeAllScript, ...(dryRun ? ["--dry"] : [])];
      const proc = Bun.spawn(["bun", ...args], { cwd: ROOT, stdout: "inherit", stderr: "inherit" });
      await proc.exited;
    }
  }

  return {
    syncedAt: new Date().toISOString(),
    dryRun,
    results,
  };
}

async function fetchOwnerRepos(token: string, owner: string, kind: "orgs" | "users"): Promise<OrgRepoEntry[]> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "User-Agent": "yolo-git-fleet/1.0",
  };
  const res = await fetch(`https://api.github.com/${kind}/${owner}/repos?per_page=100&sort=updated`, { headers });
  if (!res.ok) return [];
  const raw = (await res.json()) as any[];
  const localDirs = new Set(discoverSrcRepos(SRC_ROOT, true).map((d) => basename(d).toLowerCase()));

  return raw.map((r) => {
    const nameLower = String(r.name).toLowerCase();
    const localCheckout = localDirs.has(nameLower) ? join(SRC_ROOT, r.name).replaceAll("\\", "/") : null;
    const scopeRole =
      owner === "aphrody-labs"
        ? "aphrody-product"
        : owner === "yolo-rs"
          ? "yolo-core-lib"
          : "research-mirror";
    return {
      owner,
      name: r.name,
      fullName: r.full_name,
      private: Boolean(r.private),
      fork: Boolean(r.fork),
      archived: Boolean(r.archived),
      stars: Number(r.stargazers_count ?? 0),
      defaultBranch: r.default_branch ?? "main",
      pushedAt: r.pushed_at ?? null,
      language: r.language ?? null,
      scopeRole,
      localCheckout,
    };
  });
}

export async function reconcileGithubOrgs(): Promise<OrgsReconciliationReport> {
  const token = await resolveGithubToken();
  if (!token) {
    throw new Error("GitHub token required via GITHUB_TOKEN, GH_TOKEN, or `gh auth token`.");
  }

  const [aphrodyLabs, aphrodyDev, yoloRs, localStatuses] = await Promise.all([
    fetchOwnerRepos(token, "aphrody-labs", "orgs"),
    fetchOwnerRepos(token, "aphrody-dev", "users"),
    fetchOwnerRepos(token, "yolo-rs", "orgs"),
    gitFleetStatus({ includeAll: true }),
  ]);

  const localToRemoteReconciliation: OrgsReconciliationReport["localToRemoteReconciliation"] = [];
  for (const st of localStatuses) {
    const ownerMatch = st.originUrl?.match(/github\.com[:/]([^/]+)\/([^/.]+)/i);
    const detectedOwner = ownerMatch?.[1] ?? null;
    const isYoloNamed = st.name.toLowerCase().startsWith("yolo");
    const isGoogleUpstream = st.scope === "google-upstream";

    if (isGoogleUpstream) {
      localToRemoteReconciliation.push({
        localRepo: st.name,
        originUrl: st.originUrl,
        detectedOwner: "googlesource",
        recommendedOwner: "upstream",
        status: "upstream-pin",
        note: "Google/Chromium/AOSP upstream source checkout managed via gclient/repo.",
      });
      continue;
    }

    const recommendedOwner = isYoloNamed ? "yolo-rs" : "aphrody-labs";
    if (!st.originUrl) {
      localToRemoteReconciliation.push({
        localRepo: st.name,
        originUrl: null,
        detectedOwner: null,
        recommendedOwner,
        status: "needs-remote",
        note: `Local workspace without origin remote; target organization is ${recommendedOwner}.`,
      });
    } else if (detectedOwner?.toLowerCase() === recommendedOwner) {
      localToRemoteReconciliation.push({
        localRepo: st.name,
        originUrl: st.originUrl,
        detectedOwner,
        recommendedOwner,
        status: "aligned",
        note: `Aligned with ${recommendedOwner} scope boundary.`,
      });
    } else {
      localToRemoteReconciliation.push({
        localRepo: st.name,
        originUrl: st.originUrl,
        detectedOwner,
        recommendedOwner,
        status: "owner-mismatch",
        note: `Origin points to ${detectedOwner ?? "external"} while scope boundary recommends ${recommendedOwner}.`,
      });
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    architecturePolicy: {
      aphrodyLabs:
        "Public product & main organization (Aphrody AI, Locally Uncensored, OpenCode, Zed integration, M3 product themes, production services).",
      aphrodyDev:
        "Developer research, personal forks, and upstream experiments prior to graduation into yolo-rs or aphrody-labs.",
      yoloRs:
        "Core open-source reusable libraries, Rust/Bun/Zig toolchains, browser engines, standards schemas, MCP plugins, and testing harnesses.",
    },
    totals: {
      aphrodyLabs: aphrodyLabs.length,
      aphrodyDev: aphrodyDev.length,
      yoloRs: yoloRs.length,
    },
    orgs: {
      "aphrody-labs": aphrodyLabs,
      "aphrody-dev": aphrodyDev,
      "yolo-rs": yoloRs,
    },
    localToRemoteReconciliation,
  };
}

function printOrgsReport(report: OrgsReconciliationReport): void {
  console.log(`[yolo git orgs] GitHub Organization & Scope Reconciliation — ${report.generatedAt}`);
  console.log(`  - aphrody-labs (Product / Main Org): ${report.totals.aphrodyLabs} repos`);
  console.log(`  - yolo-rs      (Core Libs / Tooling): ${report.totals.yoloRs} repos`);
  console.log(`  - aphrody-dev  (Research / Mirrors) : ${report.totals.aphrodyDev} repos`);
  console.log("");
  console.log("LOCAL REPO".padEnd(20) + "DETECTED OWNER".padEnd(18) + "RECOMMENDED".padEnd(16) + "STATUS".padEnd(18) + "NOTE");
  console.log("-".repeat(110));
  for (const r of report.localToRemoteReconciliation) {
    console.log(
      r.localRepo.slice(0, 19).padEnd(20) +
        (r.detectedOwner ?? "-").slice(0, 17).padEnd(18) +
        r.recommendedOwner.padEnd(16) +
        r.status.padEnd(18) +
        r.note,
    );
  }
}

export const GIT_KERNEL_SCALAR_CONFIG_MATRIX: readonly [string, string][] = [
  ["feature.manyFiles", "true"],
  ["index.version", "4"],
  ["core.untrackedCache", "true"],
  ["core.fsmonitor", "true"],
  ["core.fscache", "true"],
  ["core.preloadIndex", "true"],
  ["core.autocrlf", "false"],
  ["core.eol", "lf"],
  ["core.longpaths", "true"],
  ["fetch.writeCommitGraph", "true"],
  ["fetch.prune", "true"],
  ["fetch.parallel", "0"],
  ["submodule.fetchJobs", "0"],
  ["gc.writeCommitGraph", "true"],
  ["commitGraph.changedPaths", "true"],
  ["core.multiPackIndex", "true"],
  ["repack.writeBitmaps", "true"],
  ["merge.conflictStyle", "zdiff3"],
  ["rerere.enabled", "true"],
  ["rerere.autoUpdate", "true"],
  ["diff.algorithm", "histogram"],
  ["diff.colorMoved", "default"],
  ["branch.sort", "-committerdate"],
  ["tag.sort", "version:refname"],
  ["pull.rebase", "true"],
  ["rebase.autoStash", "true"],
  ["rebase.autoSquash", "true"],
  ["rebase.updateRefs", "true"],
  ["push.default", "current"],
  ["push.autoSetupRemote", "true"],
  ["push.followTags", "true"],
  ["protocol.version", "2"],
  ["advice.detachedHead", "false"],
  ["advice.statusHints", "false"],
];

export interface GitOptimizeRepoResult {
  readonly repo: string;
  readonly path: string;
  readonly scope: RepoScope;
  readonly configsApplied: number;
  readonly hooksInstalled: boolean;
  readonly commitGraphWritten: boolean;
  readonly maintenanceRegistered: boolean;
}

export async function gitFleetOptimize(options?: {
  writeCommitGraph?: boolean;
  registerMaintenance?: boolean;
}): Promise<{
  optimizedAt: string;
  totalRepos: number;
  configKeysPerRepo: number;
  results: GitOptimizeRepoResult[];
}> {
  const dirs = discoverSrcRepos(SRC_ROOT, true);
  const writeGraph = options?.writeCommitGraph ?? true;
  const regMaint = options?.registerMaintenance ?? true;
  const results: GitOptimizeRepoResult[] = [];

  await Promise.all(
    dirs.map(async (repoPath) => {
      const name = basename(repoPath);
      const originRes = await runGit(repoPath, ["remote", "get-url", "origin"], 5_000);
      const originUrl = originRes.code === 0 ? originRes.out : null;
      const scope = classifyScope(name, originUrl);

      let configsApplied = 0;
      for (const [key, val] of GIT_KERNEL_SCALAR_CONFIG_MATRIX) {
        const res = await runGit(repoPath, ["config", "--local", key, val], 5_000);
        if (res.code === 0) configsApplied++;
      }

      let hooksInstalled = false;
      if (
        (scope === "yolo-core" || scope === "aphrody-product" || scope === "community") &&
        existsSync(HOOKS_DIR)
      ) {
        const gitDirRes = await runGit(repoPath, ["rev-parse", "--git-common-dir"], 5_000);
        if (gitDirRes.code === 0 && gitDirRes.out) {
          const hookTargetDir = join(repoPath, gitDirRes.out, "hooks");
          for (const h of ["pre-push", "post-commit"]) {
            const srcHook = join(HOOKS_DIR, h);
            const dstHook = join(hookTargetDir, h);
            if (existsSync(srcHook)) {
              try {
                copyFileSync(srcHook, dstHook);
                chmodSync(dstHook, 0o755);
                hooksInstalled = true;
              } catch {
                // Ignore read-only hook dir
              }
            }
          }
        }
      }

      let commitGraphWritten = false;
      if (writeGraph && scope !== "google-upstream") {
        const cg = await runGit(
          repoPath,
          ["commit-graph", "write", "--reachable", "--changed-paths"],
          20_000,
        );
        commitGraphWritten = cg.code === 0;
      }

      let maintenanceRegistered = false;
      if (regMaint && scope !== "google-upstream") {
        const mr = await runGit(repoPath, ["maintenance", "register"], 10_000);
        maintenanceRegistered = mr.code === 0;
      }

      results.push({
        repo: name,
        path: repoPath.replaceAll("\\", "/"),
        scope,
        configsApplied,
        hooksInstalled,
        commitGraphWritten,
        maintenanceRegistered,
      });
    }),
  );

  results.sort((a, b) => a.repo.localeCompare(b.repo));
  return {
    optimizedAt: new Date().toISOString(),
    totalRepos: results.length,
    configKeysPerRepo: GIT_KERNEL_SCALAR_CONFIG_MATRIX.length,
    results,
  };
}

if (import.meta.main) {
  const [sub = "status", ...rest] = Bun.argv.slice(2);
  const flags = new Set(rest);
  const asJson = flags.has("--json");

  if (sub === "help" || sub === "--help" || sub === "-h") {
    console.log("Usage: yolo git <status|sync|optimize|orgs> [--json] [--dry] [--merge-all] [--only-yolo]");
    process.exit(0);
  }

  if (sub === "status") {
    const statuses = await gitFleetStatus({ includeAll: !flags.has("--only-yolo") });
    if (asJson) console.log(JSON.stringify(statuses, null, 2));
    else printFleetStatusTable(statuses);
  } else if (sub === "optimize") {
    const report = await gitFleetOptimize();
    if (asJson) console.log(JSON.stringify(report, null, 2));
    else {
      console.log(
        `[yolo git optimize] Applied ${report.configKeysPerRepo} Git Scalar + Kernel.org + NHITL settings across ${report.totalRepos} repositories`,
      );
      for (const r of report.results) {
        console.log(
          `  ${r.repo.padEnd(20)} ${r.scope.padEnd(18)} cfg:${String(r.configsApplied).padEnd(4)} hooks:${r.hooksInstalled ? "yes" : "no "} graph:${r.commitGraphWritten ? "yes" : "no "} maint:${r.maintenanceRegistered ? "yes" : "no"}`,
        );
      }
    }
  } else if (sub === "sync") {
    const res = await gitFleetSync({ dryRun: flags.has("--dry"), runMergeAll: flags.has("--merge-all") });
    if (asJson) console.log(JSON.stringify(res, null, 2));
    else {
      console.log(`[yolo git sync] Completed at ${res.syncedAt} (dryRun=${res.dryRun})`);
      for (const r of res.results) {
        console.log(`  ${r.repo.padEnd(20)} ${(r.branch ?? "-").padEnd(12)} ${r.action.padEnd(18)} ${r.detail}`);
      }
    }
  } else if (sub === "orgs") {
    const report = await reconcileGithubOrgs();
    if (asJson) console.log(JSON.stringify(report, null, 2));
    else printOrgsReport(report);
  } else {
    console.error(`Unknown yolo git subcommand: ${sub}`);
    process.exit(2);
  }
}
