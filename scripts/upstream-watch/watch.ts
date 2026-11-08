// SPDX-License-Identifier: MIT OR Apache-2.0
import type { Database } from "bun:sqlite";
import { join } from "node:path";
import type { GitHub } from "./github";

export interface Pin {
  commit: string;
  stable: { ref: string; commit: string } | null;
  snapshotDate: string;
}

interface SourceLockEntry {
  name?: string;
  ref?: string;
  commit: string;
}

interface SourceLockFile {
  snapshotDate: string;
  sources: SourceLockEntry[];
}

export async function readPin(
  lockPath = join(import.meta.dir, "..", "..", "source-lock.json"),
): Promise<Pin> {
  const lock = (await Bun.file(lockPath).json()) as SourceLockFile;
  const main = lock.sources.find((s) => s.name === "bun-upstream-main");
  if (!main) throw new Error("source-lock.json has no bun-upstream-main");
  const st = lock.sources.find((s) => s.name?.startsWith("bun-stable-"));
  return {
    commit: main.commit,
    stable: st && st.ref ? { ref: st.ref, commit: st.commit } : null,
    snapshotDate: lock.snapshotDate,
  };
}

/** Count and list workspace members from a Cargo.toml `members = [...]`. */
export function parseWorkspaceMembers(toml: string): string[] {
  const m = /^\s*members\s*=\s*\[/m.exec(toml);
  if (!m) return [];
  const members: string[] = [];
  const rest = toml.slice(m.index + m[0].length);
  for (const raw of rest.split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, "");
    for (const q of line.matchAll(/"([^"]+)"/g)) members.push(q[1]!);
    if (line.includes("]")) break;
  }
  return members;
}

export function parseWebkitVersion(src: string | null): string | null {
  if (!src) return null;
  return (
    /WEBKIT_VERSION\s*=\s*"([0-9a-f]{7,40})"/i.exec(src)?.[1] ??
    /set\(\s*WEBKIT_VERSION\s+([0-9a-f]{7,40})/i.exec(src)?.[1] ??
    null
  );
}

const WEBKIT_FILES = [
  "scripts/build/deps/webkit.ts",
  "cmake/tools/SetupWebKit.cmake",
];

async function webkitAt(gh: GitHub, ref: string) {
  for (const f of WEBKIT_FILES) {
    const v = parseWebkitVersion(
      await gh.raw(`/repos/oven-sh/bun/contents/${f}?ref=${ref}`),
    );
    if (v) return v;
  }
  return null;
}

async function cargoAt(gh: GitHub, ref: string) {
  const t = await gh.raw(`/repos/oven-sh/bun/contents/Cargo.toml?ref=${ref}`);
  return t ? parseWorkspaceMembers(t) : [];
}

async function compareCounts(gh: GitHub, base: string, head: string) {
  const c = await gh.tryGet(
    `/repos/oven-sh/bun/compare/${base}...${head}?per_page=1`,
  );
  if (!c) return null;
  return {
    status: c.status as string,
    aheadBy: c.ahead_by as number,
    behindBy: c.behind_by as number,
    totalCommits: c.total_commits as number,
  };
}

async function searchCount(gh: GitHub, q: string): Promise<number | null> {
  const r = await gh.tryGet(
    `/search/issues?q=${encodeURIComponent(q)}&per_page=1`,
  );
  return r ? (r.total_count as number) : null;
}

interface GitHubReleaseItem {
  tag_name: string;
  prerelease: boolean;
  draft?: boolean;
  published_at: string;
  target_commitish?: string;
  name?: string;
}

interface GitHubCommitItem {
  sha: string;
  commit: {
    message: string;
    committer: { date: string };
  };
}

interface GitHubRepoMeta {
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  language: string;
  pushed_at: string;
}

export async function collectBun(gh: GitHub, pin: Pin, now = new Date()) {
  const repo = "repo:oven-sh/bun";
  const day = (n: number) =>
    new Date(now.getTime() - n * 86_400_000).toISOString().slice(0, 10);
  const d7 = day(7);

  const [meta, head, releases, canaryRef] = await Promise.all([
    gh.get<GitHubRepoMeta>("/repos/oven-sh/bun"),
    gh.get<GitHubCommitItem>("/repos/oven-sh/bun/commits/main"),
    gh.get<GitHubReleaseItem[]>("/repos/oven-sh/bun/releases?per_page=30"),
    gh.tryGet<{ object?: { sha?: string } }>(
      "/repos/oven-sh/bun/git/ref/tags/canary",
    ),
  ]);
  const stableRel = releases.find((r) => !r.prerelease && !r.draft);
  const canaryRel = await gh.tryGet<GitHubReleaseItem>(
    "/repos/oven-sh/bun/releases/tags/canary",
  );
  const stableCommit = stableRel
    ? ((
        await gh.tryGet<{ sha?: string }>(
          `/repos/oven-sh/bun/commits/${stableRel.tag_name}`,
        )
      )?.sha ??
      stableRel.target_commitish ??
      null)
    : null;
  const canaryCommit: string | null =
    canaryRef?.object?.sha ??
    /\(([0-9a-f]{40})\)/.exec(canaryRel?.name ?? "")?.[1] ??
    null;

  const [prOpen, prOpened7, prMerged7, issOpen, issOpened7, issClosed7] = [
    await searchCount(gh, `${repo} is:pr is:open`),
    await searchCount(gh, `${repo} is:pr created:>=${d7}`),
    await searchCount(gh, `${repo} is:pr is:merged merged:>=${d7}`),
    await searchCount(gh, `${repo} is:issue is:open`),
    await searchCount(gh, `${repo} is:issue created:>=${d7}`),
    await searchCount(gh, `${repo} is:issue is:closed closed:>=${d7}`),
  ];

  const [cargoMain, cargoPin, webkitMain, webkitPin] = await Promise.all([
    cargoAt(gh, head.sha),
    cargoAt(gh, pin.commit),
    webkitAt(gh, head.sha),
    webkitAt(gh, pin.commit),
  ]);
  const src = (l: string[]) => l.filter((m) => m.startsWith("src/"));
  const added = cargoMain.filter((m) => !cargoPin.includes(m));
  const removed = cargoPin.filter((m) => !cargoMain.includes(m));

  const [mainVsPin, stableVsPin, canaryVsPin] = await Promise.all([
    compareCounts(gh, pin.commit, head.sha),
    stableCommit ? compareCounts(gh, pin.commit, stableCommit) : null,
    canaryCommit ? compareCounts(gh, pin.commit, canaryCommit) : null,
  ]);

  return {
    generatedAt: now.toISOString(),
    pin,
    repo: {
      stars: meta.stargazers_count,
      forks: meta.forks_count,
      openIssuesAndPrs: meta.open_issues_count,
      language: meta.language,
      pushedAt: meta.pushed_at,
    },
    main: {
      sha: head.sha as string,
      date: head.commit.committer.date as string,
      message: String(head.commit.message).split("\n")[0],
      vsPin: mainVsPin,
    },
    stable: stableRel
      ? {
          tag: stableRel.tag_name as string,
          publishedAt: stableRel.published_at as string,
          commit: stableCommit as string | null,
          vsPin: stableVsPin,
        }
      : null,
    canary: canaryCommit
      ? {
          tag: "canary",
          commit: canaryCommit,
          publishedAt: (canaryRel?.published_at as string) ?? null,
          vsPin: canaryVsPin,
          vsMain: head.sha === canaryCommit ? "equal" : "differs",
        }
      : null,
    recentReleases: releases.slice(0, 8).map((r) => ({
      tag: r.tag_name,
      prerelease: r.prerelease,
      publishedAt: r.published_at,
    })),
    velocity: {
      since: d7,
      prOpen,
      prOpened7,
      prMerged7,
      issOpen,
      issOpened7,
      issClosed7,
    },
    cargo: {
      membersMain: cargoMain.length,
      membersPin: cargoPin.length,
      srcMembersMain: src(cargoMain).length,
      srcMembersPin: src(cargoPin).length,
      added,
      removed,
    },
    webkit: {
      pin: webkitPin,
      main: webkitMain,
      changed: !!webkitPin && !!webkitMain && webkitPin !== webkitMain,
    },
  };
}

export type BunWatch = Awaited<ReturnType<typeof collectBun>>;

interface GitHubOrgRepo {
  name: string;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  language?: string | null;
  pushed_at: string;
  archived?: boolean;
  fork?: boolean;
  description?: string | null;
}

export async function collectOrg(gh: GitHub, org = "oven-sh") {
  const repos = await gh.paginate<GitHubOrgRepo>(
    `/orgs/${org}/repos?per_page=100&type=public`,
  );
  return repos
    .map((r) => ({
      name: r.name,
      stars: r.stargazers_count,
      forks: r.forks_count,
      openIssues: r.open_issues_count,
      language: r.language ?? null,
      pushedAt: r.pushed_at,
      archived: !!r.archived,
      fork: !!r.fork,
      description: r.description ?? null,
    }))
    .sort((a, b) => b.stars - a.stars);
}

export type OrgWatch = Awaited<ReturnType<typeof collectOrg>>;

export function lastSnapshot<T = Record<string, unknown>>(
  db: Database,
  kind: string,
): T | null {
  const row = db
    .query("SELECT data FROM snapshot WHERE kind = ? ORDER BY id DESC LIMIT 1")
    .get(kind) as { data: string } | null;
  return row ? (JSON.parse(row.data) as T) : null;
}

export function saveSnapshot(
  db: Database,
  kind: string,
  data: unknown,
  at: string,
) {
  db.query("INSERT INTO snapshot (kind, taken_at, data) VALUES (?,?,?)").run(
    kind,
    at,
    JSON.stringify(data),
  );
}

export function bunChanges(prev: BunWatch | null, cur: BunWatch): string[] {
  if (!prev) return ["first snapshot"];
  const c: string[] = [];
  if (prev.main.sha !== cur.main.sha)
    c.push(
      `main moved ${prev.main.sha.slice(0, 8)} -> ${cur.main.sha.slice(0, 8)}`,
    );
  if (prev.stable?.tag !== cur.stable?.tag)
    c.push(`stable release ${prev.stable?.tag} -> ${cur.stable?.tag}`);
  if (prev.canary?.commit !== cur.canary?.commit)
    c.push(`canary moved to ${cur.canary?.commit.slice(0, 8)}`);
  if (prev.webkit.main !== cur.webkit.main)
    c.push(
      `WebKit pin ${prev.webkit.main?.slice(0, 8)} -> ${cur.webkit.main?.slice(0, 8)}`,
    );
  if (prev.cargo.membersMain !== cur.cargo.membersMain)
    c.push(
      `cargo members ${prev.cargo.membersMain} -> ${cur.cargo.membersMain}`,
    );
  return c.length ? c : ["no change since last snapshot"];
}
