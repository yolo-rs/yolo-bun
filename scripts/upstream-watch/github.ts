// SPDX-License-Identifier: MIT OR Apache-2.0
// GitHub REST client: ETag cache in bun:sqlite, pagination, rate-limit handling.
import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";

export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

export interface ClientOptions {
  token?: string;
  db: Database;
  fetchImpl?: FetchLike;
  baseUrl?: string;
  /** Longest rate-limit sleep tolerated before throwing, in ms. */
  maxWaitMs?: number;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
}

export class RateLimitError extends Error {
  constructor(
    message: string,
    readonly resetAt: number,
  ) {
    super(message);
  }
}

export function openDb(path: string): Database {
  if (path !== ":memory:") {
    const dir = path.replace(/[\\/][^\\/]*$/, "");
    if (dir && dir !== path) mkdirSync(dir, { recursive: true });
  }
  const db = new Database(path, { create: true });
  db.run("PRAGMA journal_mode = WAL");
  db.run(
    `CREATE TABLE IF NOT EXISTS etag (url TEXT PRIMARY KEY, etag TEXT NOT NULL, body TEXT NOT NULL, fetched_at INTEGER NOT NULL)`,
  );
  db.run(
    `CREATE TABLE IF NOT EXISTS snapshot (id INTEGER PRIMARY KEY AUTOINCREMENT, kind TEXT NOT NULL, taken_at TEXT NOT NULL, data TEXT NOT NULL)`,
  );
  return db;
}

/** Token from env, else the active `gh` account. Never logged. */
export async function resolveToken(): Promise<string | undefined> {
  const env = Bun.env.GITHUB_TOKEN || Bun.env.GH_TOKEN;
  if (env) return env;
  try {
    const p = Bun.spawn(["gh", "auth", "token"], {
      stdout: "pipe",
      stderr: "ignore",
    });
    const out = (await new Response(p.stdout).text()).trim();
    return (await p.exited) === 0 && out ? out : undefined;
  } catch {
    return undefined;
  }
}

export class GitHub {
  readonly db: Database;
  requests = 0;
  cacheHits = 0;
  rateRemaining: number | undefined;
  private readonly f: FetchLike;
  private readonly base: string;
  private readonly token?: string;
  private readonly maxWait: number;
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly now: () => number;

  constructor(o: ClientOptions) {
    this.db = o.db;
    this.f = o.fetchImpl ?? ((u, i) => fetch(u, i));
    this.base = o.baseUrl ?? "https://api.github.com";
    this.token = o.token;
    this.maxWait = o.maxWaitMs ?? 120_000;
    this.sleep = o.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
    this.now = o.now ?? Date.now;
  }

  private url(path: string): string {
    return path.startsWith("http") ? path : this.base + path;
  }

  private headers(accept?: string, etag?: string): Record<string, string> {
    const h: Record<string, string> = {
      accept: accept ?? "application/vnd.github+json",
      "x-github-api-version": "2022-11-28",
      "user-agent": "yolo-bun-upstream-watch",
    };
    if (this.token) h.authorization = `Bearer ${this.token}`;
    if (etag) h["if-none-match"] = etag;
    return h;
  }

  /** Raw GET with ETag revalidation. Returns response text and headers. */
  async getRaw(
    path: string,
    accept?: string,
  ): Promise<{ text: string; headers: Headers; status: number }> {
    const url = this.url(path);
    const key = `${accept ?? ""}|${url}`;
    for (let attempt = 0; ; attempt++) {
      const row = this.db
        .query("SELECT etag, body FROM etag WHERE url = ?")
        .get(key) as { etag: string; body: string } | null;
      this.requests++;
      const res = await this.f(url, {
        headers: this.headers(accept, row?.etag),
      });
      const rem = res.headers.get("x-ratelimit-remaining");
      if (rem !== null) this.rateRemaining = Number(rem);

      if (res.status === 304 && row) {
        this.cacheHits++;
        return { text: row.body, headers: res.headers, status: 200 };
      }
      if (res.ok) {
        const text = await res.text();
        const etag = res.headers.get("etag");
        if (etag)
          this.db
            .query(
              "INSERT OR REPLACE INTO etag (url, etag, body, fetched_at) VALUES (?,?,?,?)",
            )
            .run(key, etag, text, this.now());
        return { text, headers: res.headers, status: res.status };
      }
      const limited =
        res.status === 429 ||
        (res.status === 403 &&
          (res.headers.get("x-ratelimit-remaining") === "0" ||
            res.headers.has("retry-after")));
      if (limited) {
        const retry = Number(res.headers.get("retry-after"));
        const reset = Number(res.headers.get("x-ratelimit-reset"));
        const waitMs = retry
          ? retry * 1000
          : reset
            ? Math.max(0, reset * 1000 - this.now()) + 1000
            : 60_000;
        if (waitMs > this.maxWait || attempt >= 3)
          throw new RateLimitError(
            `GitHub rate limit; resets in ${Math.ceil(waitMs / 1000)}s`,
            this.now() + waitMs,
          );
        await this.sleep(waitMs);
        continue;
      }
      if (res.status >= 500 && attempt < 3) {
        await this.sleep(500 * 2 ** attempt);
        continue;
      }
      const body = (await res.text()).slice(0, 200);
      throw new Error(`GitHub ${res.status} for ${path}: ${body}`);
    }
  }

  async get<T = Record<string, unknown>>(path: string): Promise<T> {
    return JSON.parse((await this.getRaw(path)).text) as T;
  }

  /** Returns null on 404 instead of throwing. */
  async tryGet<T = Record<string, unknown>>(path: string): Promise<T | null> {
    try {
      return await this.get<T>(path);
    } catch (e) {
      if (String((e as Error).message).startsWith("GitHub 404")) return null;
      throw e;
    }
  }

  async raw(path: string): Promise<string | null> {
    try {
      return (await this.getRaw(path, "application/vnd.github.raw")).text;
    } catch (e) {
      if (String((e as Error).message).startsWith("GitHub 404")) return null;
      throw e;
    }
  }

  /** Follows Link rel=next. Handles both array and {items: []} bodies. */
  async paginate<T = Record<string, unknown>>(
    path: string,
    maxPages = 50,
  ): Promise<T[]> {
    const out: T[] = [];
    let next: string | null = this.url(path);
    for (let i = 0; next && i < maxPages; i++) {
      const { text, headers } = await this.getRaw(next);
      const json = JSON.parse(text);
      out.push(...(Array.isArray(json) ? json : (json.items ?? [])));
      next =
        /<([^>]+)>;\s*rel="next"/.exec(headers.get("link") ?? "")?.[1] ?? null;
    }
    return out;
  }
}
