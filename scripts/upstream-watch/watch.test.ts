// SPDX-License-Identifier: MIT OR Apache-2.0
import { describe, expect, test } from "bun:test";
import { GitHub, RateLimitError, openDb } from "./github";
import {
  bunChanges,
  collectBun,
  collectOrg,
  parseWebkitVersion,
  parseWorkspaceMembers,
} from "./watch";
import { collectDrift } from "./mirror-drift";
import { main } from "./cli";

const json = (b: unknown, h: Record<string, string> = {}, status = 200) =>
  new Response(JSON.stringify(b), {
    status,
    headers: { "content-type": "application/json", ...h },
  });

function client(
  handler: (url: string, init?: RequestInit) => Response | Promise<Response>,
  extra = {},
) {
  return new GitHub({
    db: openDb(":memory:"),
    fetchImpl: async (u, i) => handler(u, i),
    sleep: async () => {},
    ...extra,
  });
}

describe("client", () => {
  test("etag revalidation serves cached body on 304", async () => {
    let n = 0;
    const gh = client((_u, init) => {
      n++;
      const inm = (init!.headers as Record<string, string>)["if-none-match"];
      return inm === '"a"'
        ? new Response(null, { status: 304 })
        : json({ v: 1 }, { etag: '"a"' });
    });
    expect(await gh.get("/x")).toEqual({ v: 1 });
    expect(await gh.get("/x")).toEqual({ v: 1 });
    expect(n).toBe(2);
    expect(gh.cacheHits).toBe(1);
  });

  test("paginates via Link and unwraps search items", async () => {
    const gh = client((u) =>
      u.endsWith("page=2")
        ? json([{ n: 3 }])
        : json([{ n: 1 }, { n: 2 }], {
            link: '<https://api.github.com/p?page=2>; rel="next"',
          }),
    );
    expect((await gh.paginate("/p")).map((r) => r.n)).toEqual([1, 2, 3]);
  });

  test("waits out a short rate limit then succeeds", async () => {
    let n = 0;
    const slept: number[] = [];
    const gh = client(
      () =>
        n++ === 0
          ? json(
              {},
              {
                "x-ratelimit-remaining": "0",
                "x-ratelimit-reset": String(Math.floor(Date.now() / 1000) + 5),
              },
              403,
            )
          : json({ ok: 1 }),
      {
        sleep: async (ms: number) => void slept.push(ms),
      },
    );
    expect(await gh.get("/x")).toEqual({ ok: 1 });
    expect(slept.length).toBe(1);
  });

  test("throws RateLimitError when reset is too far", async () => {
    const gh = client(() => json({}, { "retry-after": "9999" }, 429), {
      maxWaitMs: 1000,
    });
    await expect(gh.get("/x")).rejects.toBeInstanceOf(RateLimitError);
  });

  test("token is sent as bearer but 404 tryGet returns null", async () => {
    let auth = "";
    const gh = client(
      (_u, i) => (
        (auth = (i!.headers as Record<string, string>).authorization ?? ""),
        json({}, {}, 404)
      ),
      { token: "t0k" },
    );
    expect(await gh.tryGet("/x")).toBeNull();
    expect(auth).toBe("Bearer t0k");
  });
});

describe("parsers", () => {
  test("workspace members ignore comments and stop at the closing bracket", () => {
    const toml = `[workspace]\nmembers = [\n  "src/a", # c ]\n  "src/b",\n  "tools/c",\n]\nexclude = ["vendor"]`;
    expect(parseWorkspaceMembers(toml)).toEqual(["src/a", "src/b", "tools/c"]);
  });
  test("webkit version from ts and cmake", () => {
    const h = "4d45755fed4aeef19e95beb90d3d0c884a2812bd";
    expect(parseWebkitVersion(`export const WEBKIT_VERSION = "${h}";`)).toBe(h);
    expect(parseWebkitVersion(`set(WEBKIT_VERSION ${h})`)).toBe(h);
    expect(parseWebkitVersion(null)).toBeNull();
  });
});

const PIN = "e57d89ba63a7504957faa2ccc8f416ce2fb15453";
const HEAD = "f".repeat(40);
const CANARY = "c".repeat(40);

function bunRoutes(url: string): Response {
  const u = decodeURIComponent(url);
  if (u.endsWith("/repos/oven-sh/bun"))
    return json({
      stargazers_count: 90000,
      forks_count: 1,
      open_issues_count: 5,
      language: "Rust",
      pushed_at: "x",
    });
  if (u.includes("/commits/main"))
    return json({
      sha: HEAD,
      commit: {
        message: "feat: x\n\nbody",
        committer: { date: "2026-11-07T00:00:00Z" },
      },
    });
  if (u.includes("/commits/bun-v1.4.4"))
    return json({ sha: "38afee6c" + "0".repeat(32) });
  if (u.includes("/releases?"))
    return json([
      { tag_name: "canary", prerelease: true },
      {
        tag_name: "bun-v1.4.4",
        prerelease: false,
        published_at: "2026-10-22T00:00:00Z",
      },
    ]);
  if (u.includes("/git/ref/tags/canary"))
    return json({ object: { sha: CANARY } });
  if (u.includes("/releases/tags/canary"))
    return json({
      name: `Canary (${CANARY})`,
      published_at: "2026-11-06T00:00:00Z",
    });
  if (u.includes("/search/issues")) return json({ total_count: 7 });
  if (u.includes("/compare/"))
    return json({
      status: "ahead",
      ahead_by: u.includes(CANARY) ? 10 : 42,
      behind_by: 0,
      total_commits: 42,
    });
  if (u.includes("Cargo.toml"))
    return new Response(
      u.includes(`ref=${PIN}`)
        ? 'members = [\n"src/a",\n]'
        : 'members = [\n"src/a",\n"src/b",\n]',
    );
  if (u.includes("webkit.ts"))
    return new Response(
      `export const WEBKIT_VERSION = "${u.includes(`ref=${PIN}`) ? "a".repeat(40) : "b".repeat(40)}";`,
    );
  return json({}, {}, 404);
}

describe("collectors", () => {
  test("collectBun computes deltas against the pin", async () => {
    const gh = client(bunRoutes);
    const w = await collectBun(
      gh,
      { commit: PIN, stable: null, snapshotDate: "2026-11-04" },
      new Date("2026-11-07T00:00:00Z"),
    );
    expect(w.main.vsPin?.aheadBy).toBe(42);
    expect(w.canary?.commit).toBe(CANARY);
    expect(w.canary?.vsPin?.aheadBy).toBe(10);
    expect(w.stable?.tag).toBe("bun-v1.4.4");
    expect(w.velocity.prOpen).toBe(7);
    expect(w.cargo).toMatchObject({
      membersPin: 1,
      membersMain: 2,
      added: ["src/b"],
    });
    expect(w.webkit.changed).toBe(true);
    expect(bunChanges(null, w)).toEqual(["first snapshot"]);
    expect(bunChanges(w, w)).toEqual(["no change since last snapshot"]);
  });

  test("collectOrg sorts by stars", async () => {
    const gh = client(() =>
      json([
        { name: "a", stargazers_count: 1 },
        { name: "b", stargazers_count: 9 },
      ]),
    );
    expect((await collectOrg(gh)).map((r) => r.name)).toEqual(["b", "a"]);
  });

  test("mirror drift reports behind counts and filters by parent", async () => {
    const gh = client((u) => {
      if (u.includes("/compare/"))
        return json({ status: "behind", ahead_by: 0, behind_by: 2 });
      if (u.endsWith("/repos/yolo-rs/bun"))
        return json({
          fork: true,
          parent: { full_name: "oven-sh/bun", default_branch: "main" },
          default_branch: "main",
          pushed_at: "p",
        });
      if (u.endsWith("/repos/yolo-rs/other"))
        return json({
          fork: true,
          parent: { full_name: "x/other", default_branch: "main" },
          default_branch: "main",
        });
      return json([
        { name: "bun", fork: true },
        { name: "other", fork: true },
      ]);
    });
    const d = await collectDrift(gh);
    expect(d.scanned).toBe(2);
    expect(d.rows).toHaveLength(1);
    expect(d.rows[0]).toMatchObject({
      repo: "yolo-rs/bun",
      status: "behind",
      behindBy: 2,
    });
  });
});

describe("cli", () => {
  test("rejects unknown targets", async () => {
    expect(await main(["nope"])).toBe(2);
  });
});
