// SPDX-License-Identifier: MIT OR Apache-2.0
// Sovereign fork & local engine for https://bun.com (backed by upstream/bun/docs & oven-sh/bun).
import { readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export interface BunComNavPage {
  readonly tab: string;
  readonly group: string;
  readonly route: string;
  readonly filePath: string;
  readonly url: string;
}

export interface BunComSiteIndex {
  readonly schemaVersion: 1;
  readonly canonicalOrigin: "https://bun.com";
  readonly upstreamRepo: "https://github.com/oven-sh/bun";
  readonly forkRepo: "https://github.com/yolo-rs/bun";
  readonly upstreamCommit: string;
  readonly siteName: string;
  readonly theme: string;
  readonly totalPages: number;
  readonly totalMdxFiles: number;
  readonly tabs: readonly string[];
  readonly pages: readonly BunComNavPage[];
}

export interface BunComSearchHit {
  readonly route: string;
  readonly title: string;
  readonly tab: string;
  readonly group: string;
  readonly url: string;
  readonly score: number;
}

type DocsJsonConfig = {
  theme?: string;
  name?: string;
  navigation?: {
    tabs?: Array<{
      tab?: string;
      groups?: Array<{
        group?: string;
        pages?: unknown[];
      }>;
    }>;
  };
};

type SourceLock = {
  sources: Array<{ name: string; url: string; commit: string }>;
};

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function flattenPages(items: unknown[]): string[] {
  const result: string[] = [];
  for (const item of items) {
    if (typeof item === "string") {
      result.push(item);
    } else if (
      item &&
      typeof item === "object" &&
      "pages" in item &&
      Array.isArray((item as { pages: unknown[] }).pages)
    ) {
      result.push(...flattenPages((item as { pages: unknown[] }).pages));
    }
  }
  return result;
}

function countMdxFiles(dir: string): number {
  let count = 0;
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        count += countMdxFiles(full);
      } else if (entry.name.endsWith(".mdx") || entry.name.endsWith(".md")) {
        count += 1;
      }
    }
  } catch {
    return 0;
  }
  return count;
}

export async function buildBunComSiteIndex(
  repoRoot = rootDir,
): Promise<BunComSiteIndex> {
  const lock = (await Bun.file(
    join(repoRoot, "source-lock.json"),
  ).json()) as SourceLock;
  const upstream = lock.sources.find((s) => s.name === "bun-upstream-main");
  if (!upstream) {
    throw new Error("source-lock.json is missing bun-upstream-main");
  }

  const docsDir = join(repoRoot, "upstream", "bun", "docs");
  const docsJsonPath = join(docsDir, "docs.json");
  const config = (await Bun.file(docsJsonPath).json()) as DocsJsonConfig;

  const tabs: string[] = [];
  const pages: BunComNavPage[] = [];

  for (const tabObj of config.navigation?.tabs ?? []) {
    const tabName = tabObj.tab ?? "General";
    tabs.push(tabName);
    for (const groupObj of tabObj.groups ?? []) {
      const groupName = groupObj.group ?? "Overview";
      const routes = flattenPages(groupObj.pages ?? []);
      for (const route of routes) {
        const cleanRoute = route.startsWith("/") ? route : `/${route}`;
        const relFile = `${cleanRoute.slice(1)}.mdx`;
        pages.push({
          tab: tabName,
          group: groupName,
          route: cleanRoute,
          filePath: `upstream/bun/docs/${relFile}`,
          url: `https://bun.com/docs${cleanRoute === "/index" ? "" : cleanRoute}`,
        });
      }
    }
  }

  const totalMdxFiles = countMdxFiles(docsDir);

  return {
    schemaVersion: 1,
    canonicalOrigin: "https://bun.com",
    upstreamRepo: "https://github.com/oven-sh/bun",
    forkRepo: "https://github.com/yolo-rs/bun",
    upstreamCommit: upstream.commit,
    siteName: config.name ?? "Bun",
    theme: config.theme ?? "aspen",
    totalPages: pages.length,
    totalMdxFiles,
    tabs,
    pages,
  };
}

export function generateBunComLlmsTxt(index: BunComSiteIndex): string {
  const lines: string[] = [
    `# ${index.siteName} Documentation Fork (bun.com / yolo-bun)`,
    "",
    `> Sovereign fork of ${index.canonicalOrigin} synchronized with ${index.upstreamRepo} and ${index.forkRepo} at commit \`${index.upstreamCommit}\`.`,
    "",
    `## Summary`,
    `- Canonical Origin: ${index.canonicalOrigin}`,
    `- Upstream Repository: ${index.upstreamRepo}`,
    `- Mirror / Fork Repository: ${index.forkRepo}`,
    `- Pinned Commit: ${index.upstreamCommit}`,
    `- Indexed Navigation Pages: ${index.totalPages}`,
    `- Total Local MDX Documents: ${index.totalMdxFiles}`,
    "",
  ];

  for (const tab of index.tabs) {
    lines.push(`## ${tab}`);
    const tabPages = index.pages.filter((p) => p.tab === tab);
    for (const p of tabPages) {
      lines.push(`- [${p.group}: ${p.route}](${p.url}) (\`${p.filePath}\`)`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

export async function searchBunComDocs(
  query: string,
  repoRoot = rootDir,
  limit = 10,
): Promise<BunComSearchHit[]> {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const index = await buildBunComSiteIndex(repoRoot);
  const terms = q.split(/\s+/).filter(Boolean);
  const hits: BunComSearchHit[] = [];

  for (const page of index.pages) {
    const hayRoute = page.route.toLowerCase();
    const hayGroup = page.group.toLowerCase();
    const hayTab = page.tab.toLowerCase();
    let score = 0;

    for (const term of terms) {
      if (hayRoute === `/${term}`) score += 50;
      else if (hayRoute.includes(term)) score += 20;
      if (hayGroup.includes(term)) score += 10;
      if (hayTab.includes(term)) score += 5;
    }

    if (score > 0) {
      hits.push({
        route: page.route,
        title: `${page.group} — ${page.route}`,
        tab: page.tab,
        group: page.group,
        url: page.url,
        score,
      });
    }
  }

  hits.sort((a, b) => b.score - a.score || a.route.localeCompare(b.route));
  return hits.slice(0, limit);
}

export function createBunComFetchHandler(
  index: BunComSiteIndex,
  repoRoot = rootDir,
) {
  return async function fetchHandler(req: Request): Promise<Response> {
    const url = new URL(req.url);
    if (url.pathname === "/api/status" || url.pathname === "/status.json") {
      return Response.json({
        status: "ok",
        canonicalOrigin: index.canonicalOrigin,
        upstreamRepo: index.upstreamRepo,
        forkRepo: index.forkRepo,
        upstreamCommit: index.upstreamCommit,
        totalPages: index.totalPages,
        totalMdxFiles: index.totalMdxFiles,
      });
    }

    if (url.pathname === "/llms.txt") {
      return new Response(generateBunComLlmsTxt(index), {
        headers: { "content-type": "text/plain; charset=utf-8" },
      });
    }

    if (url.pathname === "/api/search") {
      const q = url.searchParams.get("q") ?? "";
      const results = await searchBunComDocs(q, repoRoot);
      return Response.json({ query: q, count: results.length, results });
    }

    if (url.pathname.startsWith("/docs/")) {
      const route = url.pathname.slice("/docs".length) || "/index";
      const file = Bun.file(
        join(repoRoot, "upstream", "bun", "docs", `${route.slice(1)}.mdx`),
      );
      if (await file.exists()) {
        return new Response(await file.text(), {
          headers: { "content-type": "text/markdown; charset=utf-8" },
        });
      }
      return new Response("Not Found", { status: 404 });
    }

    return Response.json({
      name: "YOLO Bun — Sovereign bun.com & oven-sh/bun Fork Portal",
      upstreamCommit: index.upstreamCommit,
      tabs: index.tabs,
      totalPages: index.totalPages,
      endpoints: [
        "/api/status",
        "/api/search?q=aot",
        "/llms.txt",
        "/docs/index",
      ],
    });
  };
}

if (import.meta.main) {
  const cmd = Bun.argv[2] ?? "index";
  const index = await buildBunComSiteIndex(rootDir);

  if (cmd === "index") {
    const outJson = join(rootDir, "catalog", "bun-com-index.json");
    const outLlms = join(rootDir, "docs", "upstream", "bun-com-llms.txt");
    await Bun.write(outJson, JSON.stringify(index, null, 2) + "\n");
    await Bun.write(outLlms, generateBunComLlmsTxt(index));
    console.log(
      JSON.stringify(
        {
          action: "indexed",
          canonicalOrigin: index.canonicalOrigin,
          upstreamCommit: index.upstreamCommit,
          totalPages: index.totalPages,
          totalMdxFiles: index.totalMdxFiles,
          outputs: [
            "catalog/bun-com-index.json",
            "docs/upstream/bun-com-llms.txt",
          ],
        },
        null,
        2,
      ),
    );
  } else if (cmd === "search") {
    const q = Bun.argv.slice(3).join(" ");
    const hits = await searchBunComDocs(q, rootDir);
    console.log(JSON.stringify(hits, null, 2));
  } else if (cmd === "serve") {
    const port = Number(Bun.argv[3] ?? 3144);
    const server = Bun.serve({
      port,
      fetch: createBunComFetchHandler(index, rootDir),
    });
    console.log(
      `Serving sovereign bun.com fork at http://127.0.0.1:${server.port}`,
    );
  } else {
    console.error(
      "Usage: bun scripts/bun-com-fork.ts <index|search|serve> [args...]",
    );
    process.exit(2);
  }
}
