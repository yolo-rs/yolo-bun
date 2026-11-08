// Copyright 2026 Google LLC
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, test } from "bun:test";
import {
  getNativeEngineVersion,
  loadCarbonData,
  nativeCosineSimilarity,
  nativeDotProduct,
  nativeGeGluMlp,
  nativeGemmaLayerStep,
  nativeMatVecF32,
  nativeRmsNormGemma,
  nativeRopeInplace,
  nativeSoftmax,
} from "../packages/core/src/index.ts";
import {
  computeTextEmbedding64,
  formatGemmaInstructionPair,
  rankCodeChunksWithRustRag,
} from "../packages/dataset/src/index.ts";
import {
  loadDesignGoogleMirror,
  OFFICIAL_GOOGLE_DESIGN_TOKENS,
} from "../packages/design-crawler/src/index.ts";
import {
  buildCookieHeader,
  buildStreamGeneratePayload,
  extractWizGlobalTokens,
  GEMINI_4_CARBON_BENCHMARKS,
  GEMINI_ECOSYSTEM_LIBRARIES,
  GEMINI_WEB_17_CAPABILITIES,
  getUnifiedGpuiAntigravityStudioStatus,
  getYoloWebUnifiedBridgeStatus,
  syncGeminiWebMemory,
} from "../packages/gemini-web-client/src/index.ts";
import {
  loadBunCodebaseGraph,
  queryBunCodebaseGraph,
} from "../packages/graph-engine/src/index.ts";
import { handleMcpRequest } from "../packages/mcp-server/src/index.ts";
import { getUnifiedClusterTopology } from "../packages/mesh-cluster/src/index.ts";
import { handleWebRequest } from "../packages/web/src/index.ts";
import {
  executeGemma4NativeForwardStep,
  GEMMA_4_E2B_CONFIG,
} from "../packages/webgpu-gemma/src/index.ts";

describe("Google DeepMind Carbon — Bare-Metal Rust 2024 FFI Kernels", () => {
  test("verifies native Rust engine version", () => {
    expect(getNativeEngineVersion()).toBe("4.0.0-deepmind-paris-argon");
  });

  test("computes 8-way unrolled SIMD dot product and cosine similarity", () => {
    const a = new Float32Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    const b = new Float32Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(nativeDotProduct(a, b)).toBeCloseTo(385.0, 4);
    expect(nativeCosineSimilarity(a, b)).toBeCloseTo(1.0, 5);
  });

  test("computes numerically stable temperature-scaled softmax", () => {
    const logits = new Float32Array([1.0, 2.0, 3.0]);
    nativeSoftmax(logits, 1.0);
    const sum = logits[0]! + logits[1]! + logits[2]!;
    expect(sum).toBeCloseTo(1.0, 5);
    expect(logits[2]!).toBeGreaterThan(logits[1]!);
    expect(logits[1]!).toBeGreaterThan(logits[0]!);
  });

  test("computes Gemma unit-offset RMSNorm (1.0 + weight)", () => {
    const x = new Float32Array([1.0, -1.0, 1.0, -1.0]);
    const w = new Float32Array([0.0, 0.0, 0.5, 0.5]);
    const out = nativeRmsNormGemma(x, w, 1e-6);
    expect(out[0]!).toBeCloseTo(1.0, 4);
    expect(out[1]!).toBeCloseTo(-1.0, 4);
    expect(out[2]!).toBeCloseTo(1.5, 4);
    expect(out[3]!).toBeCloseTo(-1.5, 4);
  });

  test("computes Gemma Tanh-approximated GeGLU MLP activation", () => {
    const gate = new Float32Array([0.0, 2.0]);
    const up = new Float32Array([5.0, 2.0]);
    const out = nativeGeGluMlp(gate, up);
    expect(out[0]!).toBeCloseTo(0.0, 5);
    expect(out[1]!).toBeGreaterThan(3.9);
  });

  test("applies Rotary Positional Embedding (RoPE) preserving vector norm", () => {
    const qk = new Float32Array([1.0, 2.0, 3.0, 4.0]);
    const normBefore = nativeDotProduct(qk, qk);
    nativeRopeInplace(qk, 4, 1, 5, 10_000.0);
    const normAfter = nativeDotProduct(qk, qk);
    expect(normAfter).toBeCloseTo(normBefore, 4);
  });

  test("computes dense matrix-vector multiplication and full Gemma 4 layer step", () => {
    const weights = new Float32Array([1, 0, 0, 2]);
    const input = new Float32Array([3, 4]);
    const mv = nativeMatVecF32(weights, input, 2, 2);
    expect(mv[0]!).toBeCloseTo(3.0, 5);
    expect(mv[1]!).toBeCloseTo(8.0, 5);

    const step = executeGemma4NativeForwardStep(64, 256, 3);
    expect(step.modelId).toBe(GEMMA_4_E2B_CONFIG.modelId);
    expect(step.postResidualL2Norm).toBeGreaterThan(0.1);
    expect(step.topAttentionProbs.length).toBe(8);

    const directStep = nativeGemmaLayerStep(
      new Float32Array([1, 2]),
      new Float32Array([0, 0]),
      new Float32Array([1, 0, 0, 1]),
      new Float32Array([1, 0, 0, 1]),
      new Float32Array([1, 0, 0, 1]),
      2,
      2,
    );
    expect(directStep.l2Norm).toBeGreaterThan(1.0);
  });
});

describe("Google DeepMind Carbon — Upstream Bun Graph, RAG & Paris Global Mesh", () => {
  test("verifies Upstream Bun v1.4.4 Knowledge Graph census and crate links", () => {
    const graph = loadBunCodebaseGraph();
    expect(graph.bunVersion).toBe("1.4.4");
    expect(graph.totalNodes).toBe(1297);
    expect(graph.workspaceCrateCount).toBe(134);
    expect(graph.totalEdges).toBeGreaterThanOrEqual(1180);

    const aotQuery = queryBunCodebaseGraph("aot", 5);
    expect(aotQuery.matchedNodes.length).toBeGreaterThan(0);
  });

  test("ranks code chunks using Rust FFI Cosine Similarity", () => {
    const chunks = [
      {
        filePath: "src/aot/cranelift.rs",
        extension: ".rs",
        sizeBytes: 1200,
        content: "pub fn compile_ssa_ir_cranelift() {}",
      },
      {
        filePath: "src/sql/postgres.rs",
        extension: ".rs",
        sizeBytes: 1400,
        content: "pub fn execute_postgres_copy_stream() {}",
      },
    ];
    const emb = computeTextEmbedding64("cranelift ssa compiler");
    expect(emb.length).toBe(64);
    const ranked = rankCodeChunksWithRustRag("cranelift ssa aot", chunks, 2);
    expect(ranked[0]?.filePath).toBe("src/aot/cranelift.rs");
    const pair = formatGemmaInstructionPair(chunks[0]!);
    expect(pair.instruction).toContain("src/aot/cranelift.rs");
  });

  test("verifies Paris (europe-west9) primary beta hub and global mesh topology", () => {
    const data = loadCarbonData();
    expect(data.primaryRegion).toContain("europe-west9");
    const mesh = getUnifiedClusterTopology();
    expect(mesh.primaryBetaHub).toContain("europe-west9");
    expect(mesh.nodes.length).toBe(7);
    expect(mesh.totalVramGb).toBeGreaterThanOrEqual(12);
  });
});

describe("Google DeepMind Carbon — Gemini Web App Client, Cookie Vault & Design Mirror", () => {
  test("extracts WIZ_global_data tokens and builds StreamGenerate RPC payload", () => {
    const sampleHtml = `<script>window.WIZ_global_data = {"SNlM0e":"AJv-test-token:123","cfb2h":"boq_assistant-bard-web-server_20261105","FdrFJe":"-99887766"};</script>`;
    const tokens = extractWizGlobalTokens(sampleHtml);
    expect(tokens.snlm0e).toBe("AJv-test-token:123");
    expect(tokens.cfb2h).toBe("boq_assistant-bard-web-server_20261105");
    expect(tokens.fdrFje).toBe("-99887766");

    const cookieHeader = buildCookieHeader({
      secure1Psid: "psid_val",
      secure1Psidts: "psidts_val",
    });
    expect(cookieHeader).toContain("__Secure-1PSID=psid_val");
    expect(cookieHeader).toContain("__Secure-1PSIDTS=psidts_val");

    const rpc = buildStreamGeneratePayload(
      "Audit Bun crates",
      "AJv-test-token:123",
      {
        toolId: "ext_github",
      },
    );
    expect(rpc.url).toContain("StreamGenerate");
    expect(rpc.body).toContain("at=AJv-test-token%3A123");
    expect(rpc.body).toContain("%40GitHub+Audit+Bun+crates");
  });

  test("verifies 17 Gemini Web capabilities, ecosystem libraries, and benchmarks", () => {
    expect(GEMINI_WEB_17_CAPABILITIES.length).toBe(17);
    expect(GEMINI_ECOSYSTEM_LIBRARIES.length).toBeGreaterThanOrEqual(8);
    expect(GEMINI_4_CARBON_BENCHMARKS.length).toBe(3);

    const mem = syncGeminiWebMemory(
      "Verified Paris europe-west9 OpenAI Gateway",
    );
    expect(mem.savedInfoFacts.length).toBeGreaterThanOrEqual(4);
  });

  test("loads local design.google mirror and official Google Brand Identity tokens", () => {
    const mirror = loadDesignGoogleMirror();
    expect(mirror.tokens.fourColorCore.googleBlue.hex).toBe(
      OFFICIAL_GOOGLE_DESIGN_TOKENS.fourColorCore.googleBlue.hex,
    );
    expect(mirror.pages.length).toBeGreaterThanOrEqual(2);
  });
});

describe("Google DeepMind Carbon — MCP JSON-RPC 2.0, OpenAI /v1 Gateway & Web Control Plane", () => {
  test("handles MCP initialize, tools/list (8 tools), resources/read and tools/call", () => {
    const initRes = handleMcpRequest({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
    });
    expect(initRes.error).toBeUndefined();

    const listRes = handleMcpRequest({
      jsonrpc: "2.0",
      id: 2,
      method: "tools/list",
    });
    const tools = (listRes.result as { tools: Array<{ name: string }> }).tools;
    expect(tools.length).toBe(10);

    const gpuiStudio = getUnifiedGpuiAntigravityStudioStatus();
    expect(gpuiStudio.keylessGoogleAiUltraBridge.apiKeyRequired).toBe(false);
    expect(gpuiStudio.uiArchitecture.replacedLegacyShells.length).toBe(2);
    expect(
      gpuiStudio.keylessGoogleAiUltraBridge.unifiedSessionAndTokenTracker
        .totalSessionTokensUsed,
    ).toBe(52_040);

    const yoloBridge = getYoloWebUnifiedBridgeStatus();
    expect(yoloBridge.enginePillars.obscuraRustCrates.length).toBe(10);
    expect(yoloBridge.chromeToAphrodySync.sourceGoogleAccount).toBe(
      "yohanpierre15@gmail.com",
    );
    expect(yoloBridge.chromeToAphrodySync.targetYoloProfile).toBe(
      "aphrody-yolo",
    );
    expect(yoloBridge.indexedRegistries).toEqual([
      "github",
      "npm",
      "crates.io",
      "pypi",
      "go",
    ]);

    const callFfiRes = handleMcpRequest({
      jsonrpc: "2.0",
      id: 3,
      method: "tools/call",
      params: {
        name: "carbon_ffi_gemma_step",
        arguments: { dim: 32, hiddenDim: 128 },
      },
    });
    expect(callFfiRes.error).toBeUndefined();

    const callGatewayRes = handleMcpRequest({
      jsonrpc: "2.0",
      id: 4,
      method: "tools/call",
      params: {
        name: "carbon_gemini_web_gateway",
        arguments: {
          prompt: "Verify OpenAI protocol compatibility",
          model: "gemini-4-argon",
        },
      },
    });
    expect(callGatewayRes.error).toBeUndefined();

    const callMirrorRes = handleMcpRequest({
      jsonrpc: "2.0",
      id: 5,
      method: "tools/call",
      params: {
        name: "carbon_design_google_mirror",
        arguments: {},
      },
    });
    expect(callMirrorRes.error).toBeUndefined();
  });

  test("serves OpenAI /v1/models, /v1/chat/completions, and DeepMind HTML dashboard", async () => {
    const modelsRes = await handleWebRequest(
      new Request("http://127.0.0.1:4040/v1/models"),
    );
    expect(modelsRes.status).toBe(200);
    const modelsJson = (await modelsRes.json()) as {
      object: string;
      data: Array<{ id: string }>;
    };
    expect(modelsJson.object).toBe("list");
    expect(modelsJson.data.length).toBe(5);

    const chatRes = await handleWebRequest(
      new Request("http://127.0.0.1:4040/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "gemini-4-argon",
          messages: [{ role: "user", content: "Benchmark Gemini 4 Carbon" }],
        }),
      }),
    );
    expect(chatRes.status).toBe(200);
    const chatJson = (await chatRes.json()) as {
      object: string;
      model: string;
      choices: Array<{ message: { content: string } }>;
    };
    expect(chatJson.object).toBe("chat.completion");
    expect(chatJson.model).toBe("gemini-4-argon");
    expect(chatJson.choices[0]?.message.content).toContain(
      "Google DeepMind Carbon Gateway",
    );

    const htmlRes = await handleWebRequest(
      new Request("http://127.0.0.1:4040/"),
    );
    expect(htmlRes.status).toBe(200);
    const html = await htmlRes.text();
    expect(html).toContain(
      "Google DeepMind Carbon // Paris (europe-west9) Beta",
    );

    const benchRes = await handleWebRequest(
      new Request("http://127.0.0.1:4040/api/bench"),
    );
    expect(benchRes.status).toBe(200);
    const benchJson = (await benchRes.json()) as {
      dotProduct: number;
      cosineSimilarity: number;
    };
    expect(benchJson.dotProduct).toBe(1_000_000);
    expect(benchJson.cosineSimilarity).toBe(1);
  });

  test("10. Carbon Super-Runtime: OpenPets/Mochi 2D/3D, Voicebox 6 HD + FFI DSP, Cookie Vault, agy Tunnel, yolo-re-google Matrix & Real Hardware", async () => {
    const healthRes = await handleWebRequest(
      new Request("http://127.0.0.1:4040/health"),
    );
    expect(healthRes.status).toBe(200);
    const health = (await healthRes.json()) as {
      ok: boolean;
      authenticated: boolean;
      cookieCount: number;
    };
    expect(health.ok).toBe(true);
    expect(health.authenticated).toBe(true);
    expect(health.cookieCount).toBeGreaterThanOrEqual(20);

    // OpenPets & Mochi 2D/3D
    const petCustomRes = await handleWebRequest(
      new Request("http://127.0.0.1:4040/api/pet/customize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          character: "mochi",
          reaction: "celebrate",
          speechText: "Gemini 4 Argon & Carbon Live!",
          customStyle: { accessory: "crown", is3dMode: true },
        }),
      }),
    );
    expect(petCustomRes.status).toBe(200);
    const petCustom = (await petCustomRes.json()) as {
      ok: boolean;
      state: {
        character: string;
        reaction: string;
        spritesAvailable: { total: number };
      };
    };
    expect(petCustom.ok).toBe(true);
    expect(petCustom.state.character).toBe("mochi");
    expect(petCustom.state.reaction).toBe("celebrate");
    expect(petCustom.state.spritesAvailable.total).toBe(396);

    const svgRes = await handleWebRequest(
      new Request(
        "http://127.0.0.1:4040/assets/openpets/gemini-pet-spritesheet.svg",
      ),
    );
    expect(svgRes.status).toBe(200);
    expect(await svgRes.text()).toContain("<svg");

    const glbRes = await handleWebRequest(
      new Request("http://127.0.0.1:4040/assets/openpets/gemini-pet-3d.glb"),
    );
    expect(glbRes.status).toBe(200);
    const glbBytes = new Uint8Array(await glbRes.arrayBuffer());
    expect(glbBytes[0]).toBe(0x67); // 'g'
    expect(glbBytes[1]).toBe(0x6c); // 'l'
    expect(glbBytes[2]).toBe(0x54); // 'T'
    expect(glbBytes[3]).toBe(0x46); // 'F'

    // Voicebox 6 HD Voices + Bare-Metal Rust FFI Audio DSP + Uncensored Gemma 4
    const synthRes = await handleWebRequest(
      new Request("http://127.0.0.1:4040/api/voicebox/synthesize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: "Testing Carbon Voicebox Aoede HD with Uncensored Gemma 4",
          voice: "Aoede",
          uncensoredGemma4: true,
        }),
      }),
    );
    expect(synthRes.status).toBe(200);
    const synth = (await synthRes.json()) as {
      ok: boolean;
      voice: string;
      rmsAmplitude: number;
      spectrum32Bands: number[];
      resampled16kHzLength: number;
      uncensoredGemma4LayerNorm?: number;
    };
    expect(synth.ok).toBe(true);
    expect(synth.voice).toBe("Aoede");
    expect(synth.rmsAmplitude).toBeGreaterThan(0.1);
    expect(synth.spectrum32Bands.length).toBe(32);
    expect(synth.resampled16kHzLength).toBe(682);
    expect(synth.uncensoredGemma4LayerNorm).toBeGreaterThan(0);

    // Gemini Web App <-> agy CLI MCP Tunnel
    const tunnelRes = await handleWebRequest(
      new Request("http://127.0.0.1:4040/api/tunnel/agy-mcp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tool: "carbon_gpui_antigravity_studio",
          skill: "voice-live",
          syncMemoryFact: "Single-owner domain consolidation verified.",
        }),
      }),
    );
    expect(tunnelRes.status).toBe(200);
    const tunnel = (await tunnelRes.json()) as {
      ok: boolean;
      invokedTool: string;
      cookieAuth: { hasValid1Psid: boolean };
    };
    expect(tunnel.ok).toBe(true);
    expect(tunnel.invokedTool).toBe("carbon_gpui_antigravity_studio");
    expect(tunnel.cookieAuth.hasValid1Psid).toBe(true);

    // yolo-re-google Feature Matrix & Migration Plan
    const matrixRes = await handleWebRequest(
      new Request("http://127.0.0.1:4040/api/re/google-matrix"),
    );
    expect(matrixRes.status).toBe(200);
    const matrix = (await matrixRes.json()) as {
      featureMatrix: unknown[];
      migrationPhases: unknown[];
    };
    expect(matrix.featureMatrix.length).toBe(10);
    expect(matrix.migrationPhases.length).toBe(5);

    // Real Hardware & Software Verification Probe
    const hwRes = await handleWebRequest(
      new Request("http://127.0.0.1:4040/api/hardware/verify"),
    );
    expect(hwRes.status).toBe(200);
    const hw = (await hwRes.json()) as {
      gpu: { detected: boolean; name: string; vramTotalMb: number };
      audioDevices: {
        microphoneDetected: boolean;
        headphonesDetected: boolean;
      };
      antigravityCli: { exists: boolean; sizeBytes: number };
      chromeExtensionOwner: {
        manifestExists: boolean;
        builtDistExists: boolean;
      };
      yoloReGoogleOwner: { migrationReportExists: boolean };
      cookieVault: { hasValid1Psid: boolean; cookieCount: number };
    };
    expect(hw.gpu.detected).toBe(true);
    expect(hw.gpu.name).toContain("RTX 4070");
    expect(hw.gpu.vramTotalMb).toBeGreaterThanOrEqual(12000);
    expect(hw.audioDevices.microphoneDetected).toBe(true);
    expect(hw.audioDevices.headphonesDetected).toBe(true);
    expect(hw.antigravityCli.exists).toBe(true);
    expect(hw.chromeExtensionOwner.manifestExists).toBe(true);
    expect(hw.chromeExtensionOwner.builtDistExists).toBe(true);
    expect(hw.yoloReGoogleOwner.migrationReportExists).toBe(true);
    expect(hw.cookieVault.hasValid1Psid).toBe(true);
  });
});
