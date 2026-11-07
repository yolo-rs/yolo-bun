// SPDX-License-Identifier: MIT OR Apache-2.0
// Usage: bun run upstream:watch -- bun|oven-sh|mirror-drift|all [--db path] [--out dir] [--all-forks] [--no-report]
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { GitHub, openDb, resolveToken } from "./github";
import {
  bunChanges,
  collectBun,
  collectOrg,
  lastSnapshot,
  readPin,
  saveSnapshot,
} from "./watch";
import { collectDrift } from "./mirror-drift";
import { bunMarkdown, driftMarkdown, orgMarkdown } from "./report";

const root = join(import.meta.dir, "..", "..");

async function sh(cmd: string[]): Promise<string> {
  try {
    const p = Bun.spawn(cmd, { stdout: "pipe", stderr: "pipe", cwd: root });
    const out = await new Response(p.stdout).text();
    const err = await new Response(p.stderr).text();
    await p.exited;
    return (out + err).replace(/\bgh[a-z]_\w+/g, "***").trim();
  } catch (e) {
    return `unavailable: ${(e as Error).message}`;
  }
}

export async function audit(gh: GitHub) {
  const rl = await gh.tryGet("/rate_limit");
  return {
    remotes: (await sh(["git", "remote", "-v"])).split(/\r?\n/),
    ghAuth: (await sh(["gh", "auth", "status"]))
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean),
    rateLimit: rl
      ? { core: rl.resources.core, search: rl.resources.search }
      : null,
    requests: gh.requests,
    etagCacheHits: gh.cacheHits,
  };
}

function writeReport(
  dir: string,
  name: string,
  date: string,
  md: string,
  json: unknown,
) {
  mkdirSync(dir, { recursive: true });
  const base = join(dir, `${name}-${date}`);
  Bun.write(`${base}.md`, md);
  Bun.write(`${base}.json`, JSON.stringify(json, null, 2) + "\n");
  return base;
}

export async function main(argv: string[], gh?: GitHub) {
  const args = argv.filter((a) => !a.startsWith("--"));
  const flag = (n: string) => {
    const i = argv.indexOf(`--${n}`);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  const target = args[0] ?? "all";
  if (!["bun", "oven-sh", "mirror-drift", "all"].includes(target)) {
    console.error(
      "Usage: upstream:watch -- bun|oven-sh|mirror-drift|all [--db path] [--out dir] [--all-forks] [--no-report]",
    );
    return 2;
  }
  const db = openDb(
    flag("db") ?? join(root, ".state", "upstream-watch.sqlite"),
  );
  gh ??= new GitHub({ db, token: await resolveToken() });
  const out = flag("out") ?? join(root, "docs", "upstream");
  const report = !argv.includes("--no-report");
  const now = new Date();
  const at = now.toISOString();
  const date = at.slice(0, 10);

  if (target === "bun" || target === "all") {
    const prev = lastSnapshot(db, "bun");
    const data = await collectBun(gh, await readPin(), now);
    const changes = bunChanges(prev, data);
    saveSnapshot(db, "bun", data, at);
    if (report)
      writeReport(out, "bun-watch", date, bunMarkdown(data, changes), {
        ...data,
        changes,
      });
    console.log(
      JSON.stringify(
        {
          bun: {
            main: data.main.sha,
            stable: data.stable?.tag,
            canary: data.canary?.commit,
            mainVsPin: data.main.vsPin,
            canaryVsPin: data.canary?.vsPin,
            changes,
          },
        },
        null,
        2,
      ),
    );
  }
  if (target === "oven-sh" || target === "all") {
    const prev = lastSnapshot(db, "oven-sh");
    const data = await collectOrg(gh);
    saveSnapshot(db, "oven-sh", data, at);
    if (report)
      writeReport(
        out,
        "oven-sh-watch",
        date,
        orgMarkdown(data, prev, at),
        data,
      );
    console.log(
      data
        .slice(0, 10)
        .map((r, i) => `${i + 1}. ${r.name} ${r.stars}`)
        .join("\n"),
    );
  }
  if (target === "mirror-drift" || target === "all") {
    const data = await collectDrift(gh, { all: argv.includes("--all-forks") });
    const a = await audit(gh);
    saveSnapshot(db, "mirror-drift", data, at);
    if (report)
      writeReport(out, "mirror-drift", date, driftMarkdown(data, a, at), {
        ...data,
        audit: a,
      });
    console.log(
      data.rows
        .slice(0, 10)
        .map((r) => `${r.repo} ${r.status} behind=${r.behindBy}`)
        .join("\n"),
    );
  }
  return 0;
}

if (import.meta.main) process.exit(await main(Bun.argv.slice(2)));
