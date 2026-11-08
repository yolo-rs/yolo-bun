// SPDX-License-Identifier: MIT OR Apache-2.0
import { describe, expect, test } from "bun:test";
import {
  auditBunComForkWebVitals,
  buildBunComSiteIndex,
  createBunComFetchHandler,
  generateBunComLlmsTxt,
  generateBunComRobotsTxt,
  generateBunComSitemapXml,
  searchBunComDocs,
} from "./bun-com-fork";
import { CORE_WEB_VITALS_BUDGET_2026 } from "./web-standards-vitals";

describe("bun.com & oven-sh/bun fork integration + Web Vitals & Lighthouse 4x100", () => {
  test("indexes upstream/bun/docs navigation and matches pinned source-lock commit", async () => {
    const index = await buildBunComSiteIndex();
    expect(index.canonicalOrigin).toBe("https://bun.com");
    expect(index.upstreamRepo).toBe("https://github.com/oven-sh/bun");
    expect(index.forkRepo).toBe("https://github.com/yolo-rs/bun");
    expect(index.upstreamCommit).toBe(
      "e57d89ba63a7504957faa2ccc8f416ce2fb15453",
    );
    expect(index.totalPages).toBeGreaterThan(100);
    expect(index.totalMdxFiles).toBeGreaterThan(150);
    expect(index.tabs).toContain("Runtime");
  });

  test("generates sovereign llms.txt, sitemap.xml, robots.txt and searches documentation routes", async () => {
    const index = await buildBunComSiteIndex();
    const llms = generateBunComLlmsTxt(index);
    expect(llms).toContain("# Bun Documentation Fork (bun.com / yolo-bun)");
    expect(llms).toContain("https://bun.com/docs/installation");

    const sitemap = generateBunComSitemapXml(index);
    expect(sitemap).toContain("<loc>https://bun.com/</loc>");
    expect(sitemap).toContain("<loc>https://bun.com/docs/installation</loc>");

    const robots = generateBunComRobotsTxt();
    expect(robots).toContain("Sitemap: https://bun.com/sitemap.xml");
    expect(robots).toContain("Llms-Txt: https://bun.com/llms.txt");

    const hits = await searchBunComDocs("installation");
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0]?.route).toBe("/installation");
  });

  test("achieves 100/100 across all 4 Lighthouse categories and satisfies 2026 Core Web Vitals & Vercel Edge rules", async () => {
    const index = await buildBunComSiteIndex();
    const report = await auditBunComForkWebVitals(index);

    expect(report.overallScore).toBe(100);
    expect(report.categories.performance.score).toBe(100);
    expect(report.categories.accessibility.score).toBe(100);
    expect(report.categories["best-practices"].score).toBe(100);
    expect(report.categories.seo.score).toBe(100);

    expect(report.coreWebVitals.withinBudget).toBe(true);
    expect(report.coreWebVitals.ttfbMs).toBeLessThanOrEqual(
      CORE_WEB_VITALS_BUDGET_2026.ttfbMaxMs,
    );
    expect(report.coreWebVitals.cls).toBe(0);

    expect(report.vercelBestPractices.isrStaleWhileRevalidate).toBe(true);
    expect(report.vercelBestPractices.etagConditional304).toBe(true);
    expect(report.vercelBestPractices.serverTimingHeader).toBe(true);
    expect(report.vercelBestPractices.speculationRulesPrerender).toBe(true);
    expect(report.vercelBestPractices.edgeSecurityHeaders).toBe(true);
  });

  test("serves /api/status, /api/vitals, /llms.txt, /sitemap.xml, /speculation-rules.json, HTML SSR shell, and ETag 304", async () => {
    const index = await buildBunComSiteIndex();
    const handler = createBunComFetchHandler(index);

    const statusRes = await handler(new Request("http://localhost/api/status"));
    expect(statusRes.status).toBe(200);
    expect(statusRes.headers.get("cross-origin-opener-policy")).toBe(
      "same-origin",
    );
    expect(statusRes.headers.get("cross-origin-embedder-policy")).toBe(
      "require-corp",
    );
    expect(statusRes.headers.get("server-timing")).toContain("total;dur=");
    const etag = statusRes.headers.get("etag");
    expect(etag).toStartWith('W/"');

    // Verify conditional 304 Not Modified (Vercel Edge best practice)
    const cachedRes = await handler(
      new Request("http://localhost/api/status", {
        headers: { "if-none-match": etag! },
      }),
    );
    expect(cachedRes.status).toBe(304);

    // Verify HTML SSR shell with WCAG 2.2 landmarks & Speculation Rules
    const htmlRes = await handler(
      new Request("http://localhost/?format=html", {
        headers: { accept: "text/html" },
      }),
    );
    expect(htmlRes.status).toBe(200);
    const html = await htmlRes.text();
    expect(html).toContain('class="skip-link"');
    expect(html).toContain('type="speculationrules"');
    expect(html).toContain("application/ld+json");

    // Verify /api/vitals endpoint
    const vitalsRes = await handler(new Request("http://localhost/api/vitals"));
    expect(vitalsRes.status).toBe(200);
    const vitalsJson = (await vitalsRes.json()) as { overallScore: number };
    expect(vitalsJson.overallScore).toBe(100);

    // Verify raw MDX doc endpoint
    const docRes = await handler(
      new Request("http://localhost/docs/installation"),
    );
    expect(docRes.status).toBe(200);
    expect(await docRes.text()).toContain("Bun");
  });
});
