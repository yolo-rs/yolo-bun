// SPDX-License-Identifier: MIT OR Apache-2.0
// How far each yolo-rs fork mirror trails its upstream parent.
import type { GitHub } from "./github";

export interface DriftRow {
  repo: string;
  upstream: string | null;
  branch: string | null;
  status: "identical" | "behind" | "ahead" | "diverged" | "unknown";
  behindBy: number | null;
  aheadBy: number | null;
  mirrorPushedAt: string | null;
  error?: string;
}

async function pool<T, R>(items: T[], n: number, fn: (t: T) => Promise<R>) {
  const out: R[] = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(n, items.length) }, async () => {
      while (i < items.length) {
        const k = i++;
        out[k] = await fn(items[k]!);
      }
    }),
  );
  return out;
}

export async function driftFor(
  gh: GitHub,
  org: string,
  name: string,
): Promise<DriftRow> {
  const base: DriftRow = {
    repo: `${org}/${name}`,
    upstream: null,
    branch: null,
    status: "unknown",
    behindBy: null,
    aheadBy: null,
    mirrorPushedAt: null,
  };
  try {
    const r = await gh.get(`/repos/${org}/${name}`);
    if (!r.fork || !r.parent) return { ...base, error: "not a fork" };
    const up = r.parent.full_name as string;
    const upBranch = r.parent.default_branch as string;
    const branch = r.default_branch as string;
    const c = await gh.get(
      `/repos/${org}/${name}/compare/${up.split("/")[0]}:${upBranch}...${org}:${branch}?per_page=1`,
    );
    const behind = c.behind_by as number;
    const ahead = c.ahead_by as number;
    return {
      ...base,
      upstream: up,
      branch,
      status:
        c.status === "identical"
          ? "identical"
          : behind && ahead
            ? "diverged"
            : behind
              ? "behind"
              : "ahead",
      behindBy: behind,
      aheadBy: ahead,
      mirrorPushedAt: r.pushed_at,
    };
  } catch (e) {
    return { ...base, error: (e as Error).message.slice(0, 160) };
  }
}

/**
 * Default scope: forks whose parent is under `parents` (oven-sh), plus any
 * extra names. `all` covers every fork in the org.
 */
export async function collectDrift(
  gh: GitHub,
  opts: {
    org?: string;
    parents?: string[];
    all?: boolean;
    names?: string[];
    concurrency?: number;
  } = {},
) {
  const org = opts.org ?? "yolo-rs";
  const parents = opts.parents ?? ["oven-sh"];
  let names = opts.names;
  if (!names) {
    const list = await gh.paginate<any>(
      `/orgs/${org}/repos?per_page=100&type=forks`,
    );
    names = list.filter((r) => r.fork).map((r) => r.name as string);
  }
  const rows = await pool(names, opts.concurrency ?? 6, (n) =>
    driftFor(gh, org, n),
  );
  const scoped =
    opts.all || opts.names
      ? rows
      : rows.filter(
          (r) => r.upstream && parents.includes(r.upstream.split("/")[0]!),
        );
  scoped.sort((a, b) => (b.behindBy ?? -1) - (a.behindBy ?? -1));
  return { org, scanned: rows.length, rows: scoped };
}

export type DriftReport = Awaited<ReturnType<typeof collectDrift>>;
