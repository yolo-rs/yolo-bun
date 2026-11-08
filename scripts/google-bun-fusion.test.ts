// SPDX-License-Identifier: MIT OR Apache-2.0
import { describe, expect, test } from "bun:test";
import {
  auditLighthouse,
  auditTypeScriptSourceForGts,
  BoqServerEngine,
  createChromiumFriendlyFetchHandler,
  createSignal,
  GOOGLE_APIS_CATALOG_2026,
  GOOGLE_M3_DARK_TOKENS,
  GOOGLE_XSSI_PREFIX,
  GoogleApisClient,
  loadGoogleStyleguide2026,
  loadMergedStandardsSchemas,
  registerYoloBunChromiumPlugins,
  verifyThirdPartyDeps,
  WEB_GUIDELINES_CATALOG_2026,
} from "../packages/yolo-bun-plugin/src/index";

describe("Unified yolo-bun + yolo-standards + google-bun Runtime & Plugins", () => {
  test("verifies Chromium-governed DEPS and third_party/**/README.chromium files", () => {
    const report = verifyThirdPartyDeps();
    expect(report.depsFileExists).toBe(true);
    expect(report.depsCount).toBeGreaterThanOrEqual(12);
    expect(report.packages.length).toBeGreaterThanOrEqual(12);
    expect(report.agplViolations).toEqual([]);
    expect(report.missingFields).toEqual([]);
    expect(report.valid).toBe(true);

    const shortNames = report.packages.map((p) => p.shortName);
    expect(shortNames).toContain("styleguide");
    expect(shortNames).toContain("gts");
    expect(shortNames).toContain("lighthouse");
    expect(shortNames).toContain("web-vitals");
    expect(shortNames).toContain("chrome-standards");
    expect(shortNames).toContain("googleapis");
    expect(shortNames).toContain("boq-wiz");
    expect(shortNames).toContain("material-color-utilities");
    expect(shortNames).toContain("zx");
    expect(shortNames).toContain("gvisor");
  });

  test("validates Google Styleguide 2026 schema and GTS static analyzer", () => {
    const styleguide = loadGoogleStyleguide2026();
    expect(styleguide.version).toBe("2026.1.0");
    expect(styleguide.typescript.rules).toContain("no-any-prefer-unknown");
    expect(styleguide.rust.chromiumFfiSafety.prohibitCatchUnwind).toBe(true);
    expect(styleguide.cppChromium.rules).toContain(
      "no-rtti-no-exceptions-in-chromium",
    );
    expect(styleguide.aospAndroid17.releaseName).toBe("Android 17");

    const cleanCheck = auditTypeScriptSourceForGts(
      "export const count = 42;\nexport function add(a: number, b: number): number { return a + b; }\n",
    );
    expect(cleanCheck.valid).toBe(true);
    expect(cleanCheck.violations).toHaveLength(0);

    const dirtyCheck = auditTypeScriptSourceForGts(
      "var legacy: any = 1;\nconst enum Mode { Fast }\n",
    );
    expect(dirtyCheck.valid).toBe(false);
    expect(dirtyCheck.violations.length).toBeGreaterThanOrEqual(3);
  });

  test("loads merged yolo-standards schemas (Google Chrome, MDN, TC39, Wasm, MCP 2026)", () => {
    const schemas = loadMergedStandardsSchemas();
    expect(schemas.googleChrome).toBeDefined();
    expect(schemas.mdnCompat).toBeDefined();
    expect(schemas.tc39).toBeDefined();
    expect(schemas.webassembly).toBeDefined();
    expect(schemas.mcp2026).toBeDefined();
    expect(WEB_GUIDELINES_CATALOG_2026.length).toBeGreaterThanOrEqual(6);
  });

  test("executes Google APIs TypeScript client, BOQ batchexecute RPC, and Wiz Signals", async () => {
    const client = new GoogleApisClient({ projectId: "aphrody" });
    expect(client.listDiscoveryServices().length).toBe(
      GOOGLE_APIS_CATALOG_2026.length,
    );
    expect(client.buildSecretVersionUrl("CF_API_TOKEN")).toContain(
      "projects/aphrody/secrets/CF_API_TOKEN/versions/latest:access",
    );
    expect(client.buildVertexGeminiEndpoint("gemini-2.5-pro")).toContain(
      "publishers/google/models/gemini-2.5-pro:generateContent",
    );

    const boq = new BoqServerEngine();
    boq.registerRpc("EchoRpc", (payload) => ({ echoed: payload }));
    const fReq = boq.encodeBatchExecuteRequest([
      { rpcId: "EchoRpc", payload: { hello: "chromium" }, orderIndex: 1 },
    ]);
    const wire = await boq.handleBatchExecute(fReq);
    expect(wire.startsWith(GOOGLE_XSSI_PREFIX)).toBe(true);

    const parsed = boq.parseBatchExecuteResponse<{
      echoed: { hello: string };
    }>(wire);
    expect(parsed).toHaveLength(1);
    expect(parsed[0]?.rpcId).toBe("EchoRpc");
    expect(parsed[0]?.data.echoed.hello).toBe("chromium");

    const sig = createSignal(10);
    let observed = 0;
    sig.subscribe((v) => {
      observed = v;
    });
    sig.update((n) => n + 5);
    expect(sig()).toBe(15);
    expect(observed).toBe(15);
  });

  test("renders Chromium-friendly app with 100/100 Lighthouse, Web Vitals, ETag 304, and BOQ RPC", async () => {
    const handler = createChromiumFriendlyFetchHandler({
      title: "Yolo-Bun Sovereign Chromium App",
      description:
        "Chromium-friendly Bun runtime pre-configured with Google Standards, Lighthouse 100/100, Core Web Vitals, and BOQ/Wiz/M3.",
      canonicalOrigin: "https://bun.aphrody.com",
    });

    const res = await handler(new Request("https://bun.aphrody.com/"));
    expect(res.status).toBe(200);
    const html = await res.text();
    const headersObj: Record<string, string> = {};
    res.headers.forEach((value, key) => {
      headersObj[key.toLowerCase()] = value;
    });

    const lh = auditLighthouse({
      url: "https://bun.aphrody.com/",
      html,
      headers: headersObj,
      responseTimeMs: 1.8,
    });
    expect(lh.categories.performance).toBe(100);
    expect(lh.categories.accessibility).toBe(100);
    expect(lh.categories.bestPractices).toBe(100);
    expect(lh.categories.seo).toBe(100);
    expect(lh.overallScore).toBe(100);
    expect(lh.passedGate).toBe(true);
    expect(html).toContain("window.WIZ_global_data");
    expect(html).toContain("window.__YOLO_WEB_VITALS__");
    expect(html).toContain(GOOGLE_M3_DARK_TOKENS.primary);

    const etag = res.headers.get("etag");
    expect(etag).toBeTruthy();
    const res304 = await handler(
      new Request("https://bun.aphrody.com/", {
        headers: { "if-none-match": etag! },
      }),
    );
    expect(res304.status).toBe(304);

    const boqEngine = new BoqServerEngine();
    const fReq = boqEngine.encodeBatchExecuteRequest([
      { rpcId: "GetRuntimeVitals", payload: {} },
    ]);
    const boqRes = await handler(
      new Request("https://bun.aphrody.com/_/BoqUi/data/batchexecute", {
        method: "POST",
        body: new URLSearchParams({ "f.req": fReq }).toString(),
      }),
    );
    expect(boqRes.status).toBe(200);
    const boqWire = await boqRes.text();
    expect(boqWire.startsWith(GOOGLE_XSSI_PREFIX)).toBe(true);
  });

  test("resolves all yolo-bun:* virtual modules via Bun.plugin", async () => {
    registerYoloBunChromiumPlugins();

    const lhMod = await import("yolo-bun:lighthouse");
    expect(lhMod.default.lighthouseVersion).toBe("12.4.0-chromium-144");

    const wgMod = await import("yolo-bun:web-guidelines");
    expect(wgMod.default.catalog.length).toBeGreaterThanOrEqual(6);

    const wvMod = await import("yolo-bun:web-vitals");
    expect(wvMod.default.budget.lcpMaxMs).toBe(2500);

    const gsMod = await import("yolo-bun:google-styleguide");
    expect(gsMod.default.version).toBe("2026.1.0");

    const gaMod = await import("yolo-bun:googleapis");
    expect(gaMod.default.projectId).toBe("aphrody");

    const stackMod = await import("yolo-bun:google-stack");
    expect(stackMod.default.xssiPrefix).toBe(GOOGLE_XSSI_PREFIX);

    const tpMod = await import("yolo-bun:third-party");
    expect(tpMod.default.valid).toBe(true);

    const tkMod = await import("yolo-bun:chromium-toolkit");
    expect(tkMod.default.patches.length).toBeGreaterThanOrEqual(6);

    const dtMod = await import("yolo-bun:depot-tools");
    expect(dtMod.default.depotToolsDir).toBe("C:/src/depot_tools");

    const cdMod = await import("yolo-bun:chromium-dashboard");
    expect(cdMod.default.repoUrl).toBe(
      "https://github.com/GoogleChrome/chromium-dashboard",
    );

    const mwgMod = await import("yolo-bun:modern-web-guidance");
    expect(mwgMod.default.repoUrl).toBe(
      "https://github.com/GoogleChrome/modern-web-guidance-src",
    );

    const crosMod = await import("yolo-bun:chromiumos");
    expect(crosMod.default.milestone).toContain("R144");

    const orchMod = await import("yolo-bun:src-orchestrator");
    expect(orchMod.default.totalPillars).toBeGreaterThanOrEqual(10);
    expect(
      orchMod.default.pillars.some(
        (p: Record<string, unknown>) => p.name === "google",
      ),
    ).toBe(true);
    expect(
      orchMod.default.pillars.some(
        (p: Record<string, unknown>) => p.name === "yolo-bun",
      ),
    ).toBe(true);
  });
});
