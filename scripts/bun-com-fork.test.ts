// SPDX-License-Identifier: MIT OR Apache-2.0
import { describe, expect, test } from "bun:test";
import {
  buildBunComSiteIndex,
  createBunComFetchHandler,
  generateBunComLlmsTxt,
  searchBunComDocs,
} from "./bun-com-fork";

describe("bun.com & oven-sh/bun fork integration", () => {
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

  test("generates sovereign llms.txt manifest and searches documentation routes", async () => {
    const index = await buildBunComSiteIndex();
    const llms = generateBunComLlmsTxt(index);
    expect(llms).toContain("# Bun Documentation Fork (bun.com / yolo-bun)");
    expect(llms).toContain("https://bun.com/docs/installation");

    const hits = await searchBunComDocs("installation");
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0]?.route).toBe("/installation");
  });

  test("serves /api/status, /llms.txt, /api/search, and raw MDX pages over HTTP handler", async () => {
    const index = await buildBunComSiteIndex();
    const handler = createBunComFetchHandler(index);

    const statusRes = await handler(new Request("http://localhost/api/status"));
    expect(statusRes.status).toBe(200);
    const statusJson = (await statusRes.json()) as {
      status: string;
      upstreamCommit: string;
    };
    expect(statusJson.status).toBe("ok");
    expect(statusJson.upstreamCommit).toBe(
      "e57d89ba63a7504957faa2ccc8f416ce2fb15453",
    );

    const llmsRes = await handler(new Request("http://localhost/llms.txt"));
    expect(llmsRes.status).toBe(200);
    expect(await llmsRes.text()).toContain(
      "e57d89ba63a7504957faa2ccc8f416ce2fb15453",
    );

    const docRes = await handler(
      new Request("http://localhost/docs/installation"),
    );
    expect(docRes.status).toBe(200);
    expect(await docRes.text()).toContain("Bun");
  });
});
