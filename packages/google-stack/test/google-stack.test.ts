// SPDX-License-Identifier: Apache-2.0
import { describe, expect, test } from "bun:test";
import {
  BoqServerEngine,
  GOOGLE_M3_DARK_TOKENS,
  GOOGLE_POLYGLOT_MATRIX,
  GOOGLE_XSSI_PREFIX,
  GoogleMultiSurfaceCompiler,
  WizResumableRuntime,
  createComputed,
  createSignal,
  generateZedIdeSettingsJson,
  generateZedIdeTasksJson,
  parseJsActionAttribute,
} from "../src/index.ts";

describe("@google-bun/google-stack: Full Google.com Stack From Scratch (BOQ + Wiz + M3 + Compose + Flutter + GPUI + TV)", () => {
  test("BOQ Server generates WIZ_global_data, AF_initDataCallback, and round-trips batchexecute RPCs", async () => {
    const boq = new BoqServerEngine({
      serviceName: "boq_google-search-ai",
    });
    boq.registerRpc("CgZi2b", (payload) => ({
      aiModeAnswer: "Google Stack Resumable Response",
      received: payload,
    }));

    const wizScript = boq.renderWizGlobalDataScript();
    expect(wizScript).toContain("window.WIZ_global_data");
    expect(wizScript).toContain("SNlM0e");

    const afChunk = boq.renderAfInitDataCallback("ds:0", { query: "gemini 4" });
    expect(afChunk).toContain("AF_initDataCallback({key: 'ds:0'");

    const fReq = boq.encodeBatchExecuteRequest([
      { rpcId: "CgZi2b", payload: ["google.com from scratch"] },
    ]);
    const wireOut = await boq.handleBatchExecute(fReq);
    expect(wireOut.startsWith(GOOGLE_XSSI_PREFIX)).toBe(true);

    const decoded = boq.parseBatchExecuteResponse<{
      aiModeAnswer: string;
      received: string[];
    }>(wireOut);
    expect(decoded.length).toBe(1);
    expect(decoded[0]?.rpcId).toBe("CgZi2b");
    expect(decoded[0]?.data.aiModeAnswer).toBe(
      "Google Stack Resumable Response",
    );
  });

  test("Wiz + Angular Signals runtime supports reactive signals and zero-hydration jsaction event delegation", async () => {
    const count = createSignal(2);
    const doubled = createComputed(() => count() * 2, [count]);
    expect(doubled()).toBe(4);
    count.set(7);
    expect(doubled()).toBe(14);

    const parsed = parseJsActionAttribute(
      "click:cOuCgd; keydown:I481le; defaultAction",
    );
    expect(parsed).toEqual([
      { eventType: "click", actionName: "cOuCgd" },
      { eventType: "keydown", actionName: "I481le" },
      { eventType: "click", actionName: "defaultAction" },
    ]);

    const wiz = new WizResumableRuntime();
    wiz.registerController("SearchBoxCtrl", {
      cOuCgd: ({ payload }) => ({ triggered: true, q: payload }),
    });
    expect(wiz.getHydratedCount()).toBe(0);

    const res = await wiz.dispatchJsAction({
      controllerId: "SearchBoxCtrl",
      jsactionAttr: "click:cOuCgd; keydown:I481le",
      eventType: "click",
      payload: "google stack",
    });
    expect(res.handled).toBe(true);
    expect(wiz.getHydratedCount()).toBe(1);
  });

  test("GoogleMultiSurfaceCompiler compiles a single M3 spec to Web Wiz/Angular, Android Jetpack Compose, Flutter/Dart, Zed GPUI Rust, and Google TV", () => {
    const compiler = new GoogleMultiSurfaceCompiler();
    const res = compiler.compileAll({
      id: "GoogleWorkspaceHub",
      title: "Google Workspace & AI Hub",
      searchPlaceholder: "Search Drive, Docs, Gmail, Gemini...",
      primaryActionLabel: "Ask Gemini",
      primaryJsAction: "askGemini",
      cards: [
        {
          id: "c1",
          heading: "Google Docs",
          subtitle: "Real-time collaborative canvas",
          badge: "WIZ",
        },
      ],
    });

    expect(res.tokens.primary).toBe(GOOGLE_M3_DARK_TOKENS.primary);
    expect(res.outputs["web-wiz-angular-m3"]).toContain(
      'jscontroller="GoogleWorkspaceHubController"',
    );
    expect(res.outputs["android-jetpack-compose"]).toContain("@Composable");
    expect(res.outputs["flutter-dart-m3"]).toContain("useMaterial3: true");
    expect(res.outputs["desktop-zed-gpui-rust"]).toContain(
      "impl Render for GoogleWorkspaceHubGpuiView",
    );
    expect(res.outputs["tv-google-leanback"]).toContain("TvLazyRow");
  });

  test("Polyglot matrix & Zed / Antigravity IDE workspace generators cover all 5 Google language stacks", () => {
    expect(GOOGLE_POLYGLOT_MATRIX.map((m) => m.id)).toEqual([
      "bun-ts7",
      "rust-2024",
      "go-1.27",
      "python-uv",
      "dart-flutter",
    ]);
    const zedSettings = generateZedIdeSettingsJson();
    expect(zedSettings.buffer_font_family).toBe("Google Sans Mono");
    expect(zedSettings.TabSize ?? zedSettings.tab_size).toBe(2);
    const zedTasks = generateZedIdeTasksJson();
    expect(zedTasks.length).toBe(3);
  });
});
