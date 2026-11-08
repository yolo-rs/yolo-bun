// SPDX-License-Identifier: MIT OR Apache-2.0
// Sovereign fork & local engine for https://bun.com (backed by upstream/bun/docs & oven-sh/bun),
// refactored with yolo-web, yolo-standards, Modern Web Guidelines, Lighthouse 4x100, Core Web Vitals,
// and Vercel Edge Best Practices.
import { readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  auditHtmlAndHeadersForLighthouse,
  buildModernWebSecurityHeaders,
  computeWeakEtag,
  CORE_WEB_VITALS_BUDGET_2026,
  generateSpeculationRules,
  type LighthouseWebVitalsReport,
} from "./web-standards-vitals.ts";

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

export function generateBunComSitemapXml(index: BunComSiteIndex): string {
  const seen = new Set<string>();
  const urls: string[] = ["https://bun.com/"];
  for (const p of index.pages) {
    if (!seen.has(p.url)) {
      seen.add(p.url);
      urls.push(p.url);
    }
  }
  const items = urls
    .map(
      (u) =>
        `  <url>\n    <loc>${Bun.escapeHTML(u)}</loc>\n    <changefreq>daily</changefreq>\n    <priority>${u === "https://bun.com/" ? "1.0" : "0.8"}</priority>\n  </url>`,
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items}\n</urlset>\n`;
}

export function generateBunComRobotsTxt(): string {
  return [
    "User-agent: *",
    "Allow: /",
    "Sitemap: https://bun.com/sitemap.xml",
    "Llms-Txt: https://bun.com/llms.txt",
    "",
  ].join("\n");
}

export function renderBunComHtmlShell(options: {
  index: BunComSiteIndex;
  route: string;
  title: string;
  description: string;
  bodyMarkdown?: string;
}): string {
  const { index, route, title, description, bodyMarkdown } = options;
  const canonicalUrl =
    route === "/"
      ? "https://bun.com/"
      : `https://bun.com/docs${route === "/index" ? "" : route}`;
  const speculationJson = JSON.stringify(generateSpeculationRules());
  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: title,
    description,
    url: canonicalUrl,
    version: index.upstreamCommit,
    publisher: {
      "@type": "Organization",
      name: "YOLO Bun Sovereign Runtime",
      url: "https://bun.com",
    },
  });

  const navLinks = index.tabs
    .map(
      (t) =>
        `<a class="nav-pill" href="/?tab=${encodeURIComponent(t)}">${Bun.escapeHTML(t)}</a>`,
    )
    .join("");

  const sampleCards = index.pages
    .slice(0, 12)
    .map(
      (p) =>
        `<article class="doc-card"><a class="doc-link" href="/docs${p.route}?format=html"><strong>${Bun.escapeHTML(p.group)}</strong><span>${Bun.escapeHTML(p.route)}</span></a></article>`,
    )
    .join("");

  const renderedBody = bodyMarkdown
    ? `<pre class="mdx-source" tabindex="0"><code>${Bun.escapeHTML(bodyMarkdown)}</code></pre>`
    : `<section class="card-grid" aria-label="Documentation routes">${sampleCards}</section>`;

  return `<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <meta name="color-scheme" content="dark light" />
  <meta name="theme-color" content="#14151a" />
  <title>${Bun.escapeHTML(title)} — ${Bun.escapeHTML(index.siteName)} Sovereign Fork</title>
  <meta name="description" content="${Bun.escapeHTML(description)}" />
  <link rel="canonical" href="${Bun.escapeHTML(canonicalUrl)}" />
  <link rel="alternate" type="text/plain" title="LLMs Index" href="/llms.txt" />
  <script type="speculationrules">${speculationJson}</script>
  <script type="application/ld+json">${jsonLd}</script>
  <style>
    :root {
      --bg: #0f1117;
      --surface: #181b24;
      --text: #f3f4f6;
      --muted: #9ca3af;
      --accent: #ff73a8;
      --border: #2a2f3d;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.6;
      text-rendering: optimizeLegibility;
    }
    .skip-link {
      position: absolute;
      left: -9999px;
      top: 0;
      background: var(--accent);
      color: #000;
      padding: 8px 16px;
      min-height: 24px;
      min-width: 24px;
      z-index: 1000;
      font-weight: 700;
    }
    .skip-link:focus, .skip-link:focus-visible {
      left: 12px;
      top: 12px;
      outline: 3px solid #fff;
      outline-offset: 2px;
    }
    header {
      border-bottom: 1px solid var(--border);
      padding: 16px 24px;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }
    nav {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    a, button {
      min-height: 24px;
      min-width: 24px;
      display: inline-flex;
      align-items: center;
    }
    a:focus-visible, button:focus-visible, pre:focus-visible {
      outline: 2px solid var(--accent);
      outline-offset: 2px;
    }
    .nav-pill {
      padding: 6px 12px;
      border-radius: 6px;
      background: var(--surface);
      color: var(--text);
      text-decoration: none;
      border: 1px solid var(--border);
      font-size: 0.9rem;
    }
    main {
      max-width: 1120px;
      margin: 0 auto;
      padding: 32px 24px;
      content-visibility: auto;
      contain-intrinsic-size: 1px 800px;
    }
    .card-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
      gap: 16px;
      margin-top: 24px;
    }
    .doc-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 16px;
      contain: content;
    }
    .doc-link {
      color: var(--text);
      text-decoration: none;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .doc-link span {
      color: var(--muted);
      font-size: 0.85rem;
    }
    .mdx-source {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 20px;
      overflow-x: auto;
      font-size: 0.9rem;
    }
    footer {
      border-top: 1px solid var(--border);
      padding: 24px;
      text-align: center;
      color: var(--muted);
      font-size: 0.85rem;
    }
  </style>
</head>
<body>
  <a class="skip-link" href="#main-content">Skip to main content</a>
  <header>
    <div>
      <strong>${Bun.escapeHTML(index.siteName)}</strong>
      <span>(${Bun.escapeHTML(index.upstreamCommit.slice(0, 12))})</span>
    </div>
    <nav aria-label="Primary documentation sections">${navLinks}</nav>
  </header>
  <main id="main-content">
    <h1>${Bun.escapeHTML(title)}</h1>
    <p>${Bun.escapeHTML(description)}</p>
    ${renderedBody}
  </main>
  <footer>
    <span>Sovereign Fork: ${Bun.escapeHTML(index.forkRepo)} | Total Pages: ${index.totalPages} | Total MDX: ${index.totalMdxFiles}</span>
  </footer>
</body>
</html>`;
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

export async function auditBunComForkWebVitals(
  index: BunComSiteIndex,
): Promise<LighthouseWebVitalsReport> {
  const start = performance.now();
  const html = renderBunComHtmlShell({
    index,
    route: "/",
    title: "Bun Documentation & Runtime Portal",
    description:
      "Fast all-in-one JavaScript, TypeScript, and AOT runtime synchronized with oven-sh/bun and yolo-bun.",
  });
  const ttfbMs = performance.now() - start;
  const etag = computeWeakEtag(html);
  const headers = buildModernWebSecurityHeaders({
    policyKind: "isr-doc",
    etag,
    timings: [{ name: "ssr", durMs: ttfbMs, desc: "HTML Shell Render" }],
    canonicalUrl: "https://bun.com/",
  });
  return auditHtmlAndHeadersForLighthouse({ html, headers, ttfbMs });
}

function respondWithEtag(
  req: Request,
  body: string,
  contentType: string,
  policyKind: "immutable-asset" | "isr-doc" | "dynamic-api" | "manifest",
  startMs: number,
  desc: string,
  canonicalUrl?: string,
): Response {
  const etag = computeWeakEtag(body);
  const durMs = performance.now() - startMs;
  const baseHeaders = buildModernWebSecurityHeaders({
    policyKind,
    etag,
    timings: [{ name: "total", durMs, desc }],
    canonicalUrl,
  });
  const ifNoneMatch = req.headers.get("if-none-match");
  if (ifNoneMatch && ifNoneMatch === etag) {
    return new Response(null, {
      status: 304,
      headers: baseHeaders,
    });
  }
  return new Response(body, {
    status: 200,
    headers: {
      ...baseHeaders,
      "content-type": contentType,
    },
  });
}

export function createBunComFetchHandler(
  index: BunComSiteIndex,
  repoRoot = rootDir,
) {
  return async function fetchHandler(req: Request): Promise<Response> {
    const startMs = performance.now();
    const url = new URL(req.url);

    if (url.pathname === "/api/status" || url.pathname === "/status.json") {
      const payload = JSON.stringify({
        status: "ok",
        canonicalOrigin: index.canonicalOrigin,
        upstreamRepo: index.upstreamRepo,
        forkRepo: index.forkRepo,
        upstreamCommit: index.upstreamCommit,
        totalPages: index.totalPages,
        totalMdxFiles: index.totalMdxFiles,
        coreWebVitalsBudget: CORE_WEB_VITALS_BUDGET_2026,
      });
      return respondWithEtag(
        req,
        payload,
        "application/json; charset=utf-8",
        "dynamic-api",
        startMs,
        "Status API",
      );
    }

    if (url.pathname === "/api/vitals" || url.pathname === "/api/lighthouse") {
      const report = await auditBunComForkWebVitals(index);
      return respondWithEtag(
        req,
        JSON.stringify(report),
        "application/json; charset=utf-8",
        "dynamic-api",
        startMs,
        "Lighthouse & Core Web Vitals Audit",
      );
    }

    if (url.pathname === "/speculation-rules.json") {
      return respondWithEtag(
        req,
        JSON.stringify(generateSpeculationRules()),
        "application/speculationrules+json; charset=utf-8",
        "manifest",
        startMs,
        "Speculation Rules",
      );
    }

    if (url.pathname === "/llms.txt") {
      return respondWithEtag(
        req,
        generateBunComLlmsTxt(index),
        "text/plain; charset=utf-8",
        "manifest",
        startMs,
        "LLMs Index",
        "https://bun.com/llms.txt",
      );
    }

    if (url.pathname === "/sitemap.xml") {
      return respondWithEtag(
        req,
        generateBunComSitemapXml(index),
        "application/xml; charset=utf-8",
        "manifest",
        startMs,
        "XML Sitemap",
      );
    }

    if (url.pathname === "/robots.txt") {
      return respondWithEtag(
        req,
        generateBunComRobotsTxt(),
        "text/plain; charset=utf-8",
        "manifest",
        startMs,
        "Robots Policy",
      );
    }

    if (url.pathname === "/api/search") {
      const q = url.searchParams.get("q") ?? "";
      const results = await searchBunComDocs(q, repoRoot);
      return respondWithEtag(
        req,
        JSON.stringify({ query: q, count: results.length, results }),
        "application/json; charset=utf-8",
        "dynamic-api",
        startMs,
        "Docs Search",
      );
    }

    if (url.pathname.startsWith("/docs/")) {
      const route = url.pathname.slice("/docs".length) || "/index";
      const file = Bun.file(
        join(repoRoot, "upstream", "bun", "docs", `${route.slice(1)}.mdx`),
      );
      if (await file.exists()) {
        const mdxText = await file.text();
        const wantsHtml =
          url.searchParams.get("format") === "html" ||
          (req.headers.get("accept")?.includes("text/html") ?? false);
        if (wantsHtml) {
          const html = renderBunComHtmlShell({
            index,
            route,
            title: `Bun Docs: ${route}`,
            description: `Sovereign documentation page for ${route} at commit ${index.upstreamCommit.slice(0, 12)}.`,
            bodyMarkdown: mdxText,
          });
          return respondWithEtag(
            req,
            html,
            "text/html; charset=utf-8",
            "isr-doc",
            startMs,
            "HTML Doc View",
            `https://bun.com/docs${route}`,
          );
        }
        return respondWithEtag(
          req,
          mdxText,
          "text/markdown; charset=utf-8",
          "isr-doc",
          startMs,
          "Raw MDX View",
          `https://bun.com/docs${route}`,
        );
      }
      return new Response("Not Found", {
        status: 404,
        headers: buildModernWebSecurityHeaders({
          policyKind: "dynamic-api",
          timings: [
            {
              name: "total",
              durMs: performance.now() - startMs,
              desc: "Not Found",
            },
          ],
        }),
      });
    }

    const wantsHtmlRoot =
      url.searchParams.get("format") === "html" ||
      (req.headers.get("accept")?.includes("text/html") ?? false);
    if (url.pathname === "/" && wantsHtmlRoot) {
      const html = renderBunComHtmlShell({
        index,
        route: "/",
        title: "Bun Documentation & Runtime Portal",
        description:
          "Fast all-in-one JavaScript, TypeScript, and AOT runtime synchronized with oven-sh/bun and yolo-bun.",
      });
      return respondWithEtag(
        req,
        html,
        "text/html; charset=utf-8",
        "isr-doc",
        startMs,
        "Root HTML Shell",
        "https://bun.com/",
      );
    }

    const rootJson = JSON.stringify({
      name: "YOLO Bun — Sovereign bun.com & oven-sh/bun Fork Portal",
      upstreamCommit: index.upstreamCommit,
      tabs: index.tabs,
      totalPages: index.totalPages,
      endpoints: [
        "/api/status",
        "/api/vitals",
        "/api/search?q=aot",
        "/llms.txt",
        "/sitemap.xml",
        "/robots.txt",
        "/speculation-rules.json",
        "/docs/index",
      ],
    });
    return respondWithEtag(
      req,
      rootJson,
      "application/json; charset=utf-8",
      "dynamic-api",
      startMs,
      "Portal Metadata",
      "https://bun.com/",
    );
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
  } else if (cmd === "audit") {
    const report = await auditBunComForkWebVitals(index);
    console.log(JSON.stringify(report, null, 2));
    if (report.overallScore < 100 || !report.coreWebVitals.withinBudget) {
      process.exitCode = 1;
    }
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
      "Usage: bun scripts/bun-com-fork.ts <index|search|audit|serve> [args...]",
    );
    process.exit(2);
  }
}
