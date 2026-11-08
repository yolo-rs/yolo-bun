import { describe, expect, test } from "bun:test";
import { FreeContext7Engine } from "../src/index";

describe("@google-bun/free-context7: Sovereign & Free Context7 Engine", () => {
  test("resolves official libraries correctly without external network", () => {
    const engine = new FreeContext7Engine();
    const bunLib = engine.resolveLibrary("bun");
    expect(bunLib).not.toBeNull();
    expect(bunLib?.version).toBe("1.4.4");
    expect(bunLib?.ecosystem).toBe("bun");

    const gvisorLib = engine.resolveLibrary("gvisor");
    expect(gvisorLib).not.toBeNull();
    expect(gvisorLib?.ecosystem).toBe("google");

    const unknownLib = engine.resolveLibrary("unknown-lib-xyz");
    expect(unknownLib).toBeNull();
  });

  test("queries symbols and guides locally with high relevance and zero latency", () => {
    const engine = new FreeContext7Engine();
    const results = engine.queryDocs({ query: "sqlite" });
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].symbol).toBe("Database");
    expect(results[0].library).toBe("bun");
    expect(results[0].codeSnippet).toContain("PRAGMA journal_mode = WAL;");
  });

  test("registers new verified docs and tracks catalog stats", () => {
    const engine = new FreeContext7Engine();
    const initialStats = engine.getStats();

    engine.registerDoc({
      library: "chromium",
      topic: "devtools",
      symbol: "cdp.send",
      kind: "function",
      signature: "cdp.send(method: string, params?: object): Promise<any>",
      summary: "Communication directe protocole Chrome DevTools via WebSocket.",
      codeSnippet: 'await cdp.send("Page.enable");',
      sourceUri: "https://chromedevtools.github.io/devtools-protocol/",
      verified: true,
    });

    const newStats = engine.getStats();
    expect(newStats.totalDocs).toBe(initialStats.totalDocs + 1);

    const hits = engine.queryDocs({ library: "chromium", query: "cdp" });
    expect(hits.length).toBe(1);
    expect(hits[0].symbol).toBe("cdp.send");
  });
});
