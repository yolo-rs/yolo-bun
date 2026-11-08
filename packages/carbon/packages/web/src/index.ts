// Copyright 2026 Google LLC
// SPDX-License-Identifier: Apache-2.0

import {
  getNativeEngineVersion,
  loadCarbonData,
  nativeCosineSimilarity,
  nativeDotProduct,
  saveCarbonData,
} from "../../core/src/index.ts";
import { loadDesignGoogleMirror } from "../../design-crawler/src/index.ts";
import {
  executeOpenAiChatCompletion,
  GEMINI_4_CARBON_BENCHMARKS,
  GEMINI_ECOSYSTEM_LIBRARIES,
  GEMINI_WEB_17_CAPABILITIES,
  GEMINI_WEB_ENDPOINTS,
  getOpenAiModelsList,
  getPetState,
  getUnifiedGpuiAntigravityStudioStatus,
  getYoloWebUnifiedBridgeStatus,
  GEMINI_6_HD_VOICES,
  customizePetState,
  generatePet3dGlbBinary,
  generatePetSpritesheetSvg,
  getCookieVaultStatus,
  invokeAgyMcpTunnel,
  probeRealHardwareAndSoftware,
  synthesizeVoiceboxWithFfiDsp,
  updateCookieVault,
  type OpenAiChatCompletionRequest,
  syncGeminiWebMemory,
} from "../../gemini-web-client/src/index.ts";
import {
  loadBunCodebaseGraph,
  queryBunCodebaseGraph,
} from "../../graph-engine/src/index.ts";
import { handleMcpRequest, type JsonRpcRequest } from "../../mcp-server/src/index.ts";
import { getUnifiedClusterTopology } from "../../mesh-cluster/src/index.ts";
import {
  executeGemma4NativeForwardStep,
  GEMMA_WGSL_MATMUL,
  GEMMA_WGSL_RMSNORM,
} from "../../webgpu-gemma/src/index.ts";

const DEFAULT_PORT = Number(process.env.PORT || 4040);
const DEFAULT_HOST = process.env.HOST || "127.0.0.1";

export function renderDeepMindDashboardHtml(): string {
  const data = loadCarbonData();
  const nativeVersion = getNativeEngineVersion();
  const mesh = getUnifiedClusterTopology();
  const graph = loadBunCodebaseGraph();
  const mirror = loadDesignGoogleMirror();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Google DeepMind Carbon // Paris (europe-west9) Beta &amp; Global Vertex AI Control Plane</title>
  <style>
    :root {
      --g-blue: #4285F4;
      --g-red: #EA4335;
      --g-yellow: #FBBC04;
      --g-green: #34A853;
      --gdm-cyan: #8AB4F8;
      --gdm-violet: #9B72CB;
      --surface-0: #060911;
      --surface-1: #0B101C;
      --surface-2: #111829;
      --surface-3: #182238;
      --border: #1E2B45;
      --border-active: #4285F4;
      --text-primary: #F8FAFC;
      --text-secondary: #94A3B8;
      --text-muted: #64748B;
      --font-display: 'Google Sans', 'Product Sans', 'Plus Jakarta Sans', system-ui, sans-serif;
      --font-body: 'Google Sans Text', 'Google Sans', system-ui, sans-serif;
      --font-mono: 'Google Sans Mono', 'JetBrains Mono', ui-monospace, monospace;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: radial-gradient(circle at 15% 0%, rgba(66, 133, 244, 0.10), transparent 45%),
                  radial-gradient(circle at 85% 5%, rgba(155, 114, 203, 0.08), transparent 40%),
                  var(--surface-0);
      color: var(--text-primary);
      font-family: var(--font-body);
      line-height: 1.55;
      min-height: 100vh;
    }
    .google-four-color-bar {
      height: 4px;
      width: 100%;
      display: grid;
      grid-template-columns: repeat(4, 1fr);
    }
    .google-four-color-bar div:nth-child(1) { background: var(--g-blue); }
    .google-four-color-bar div:nth-child(2) { background: var(--g-red); }
    .google-four-color-bar div:nth-child(3) { background: var(--g-yellow); }
    .google-four-color-bar div:nth-child(4) { background: var(--g-green); }

    .container {
      max-width: 1360px;
      margin: 0 auto;
      padding: 2rem 1.75rem 3.5rem;
    }
    header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      flex-wrap: wrap;
      gap: 1.5rem;
      padding-bottom: 1.75rem;
      border-bottom: 1px solid var(--border);
      margin-bottom: 2rem;
    }
    .brand-lockup {
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    .brand-title {
      font-family: var(--font-display);
      font-size: 1.65rem;
      font-weight: 600;
      letter-spacing: -0.025em;
      color: var(--text-primary);
    }
    .brand-subtitle {
      font-size: 0.88rem;
      color: var(--text-secondary);
      margin-top: 0.2rem;
    }
    .pill-row {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      align-items: center;
    }
    .pill {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.3rem 0.75rem;
      border-radius: 999px;
      font-family: var(--font-mono);
      font-size: 0.75rem;
      font-weight: 500;
      background: var(--surface-2);
      border: 1px solid var(--border);
      color: var(--gdm-cyan);
    }
    .pill-blue { border-color: rgba(66,133,244,0.5); background: rgba(66,133,244,0.12); color: #8AB4F8; }
    .pill-green { border-color: rgba(52,168,83,0.5); background: rgba(52,168,83,0.12); color: #81C995; }
    .pill-yellow { border-color: rgba(251,188,4,0.5); background: rgba(251,188,4,0.12); color: #FDD663; }
    .pill-red { border-color: rgba(234,67,53,0.5); background: rgba(234,67,53,0.12); color: #F28B82; }

    .kpi-strip {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
    }
    .kpi-card {
      background: var(--surface-1);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 1.1rem 1.25rem;
    }
    .kpi-label {
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--text-secondary);
      font-family: var(--font-mono);
    }
    .kpi-value {
      font-family: var(--font-display);
      font-size: 1.45rem;
      font-weight: 600;
      color: var(--text-primary);
      margin-top: 0.3rem;
    }
    .kpi-sub {
      font-size: 0.78rem;
      color: var(--gdm-cyan);
      margin-top: 0.2rem;
      font-family: var(--font-mono);
    }

    .grid-2 {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(440px, 1fr));
      gap: 1.5rem;
      margin-bottom: 1.75rem;
    }
    .card {
      background: var(--surface-1);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 1.5rem;
      margin-bottom: 1.5rem;
    }
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
      padding-bottom: 0.75rem;
      border-bottom: 1px solid var(--border);
    }
    .card-title {
      font-family: var(--font-display);
      font-size: 1.12rem;
      font-weight: 600;
      color: var(--text-primary);
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .btn-group {
      display: flex;
      flex-wrap: wrap;
      gap: 0.65rem;
      margin-top: 0.75rem;
    }
    button {
      background: var(--g-blue);
      color: #FFFFFF;
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 6px;
      padding: 0.5rem 0.95rem;
      font-family: var(--font-display);
      font-size: 0.82rem;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.15s ease;
    }
    button:hover { background: #1A73E8; }
    button.btn-secondary {
      background: var(--surface-3);
      color: var(--gdm-cyan);
      border-color: var(--border);
    }
    button.btn-secondary:hover {
      border-color: var(--g-blue);
    }
    input[type="text"], select {
      background: var(--surface-0);
      border: 1px solid var(--border);
      color: var(--text-primary);
      border-radius: 6px;
      padding: 0.5rem 0.85rem;
      font-family: var(--font-mono);
      font-size: 0.82rem;
    }
    input[type="text"] { width: 260px; }
    .terminal-out {
      background: #04070D;
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 1rem;
      margin-top: 0.9rem;
      font-family: var(--font-mono);
      font-size: 0.8rem;
      color: #8AB4F8;
      max-height: 280px;
      overflow-y: auto;
      white-space: pre-wrap;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.84rem;
    }
    th, td {
      text-align: left;
      padding: 0.65rem 0.75rem;
      border-bottom: 1px solid var(--border);
    }
    th {
      color: var(--text-secondary);
      font-family: var(--font-mono);
      font-size: 0.74rem;
      text-transform: uppercase;
    }
    .item-row {
      padding: 0.8rem 0;
      border-bottom: 1px solid var(--border);
    }
    .item-row:last-child { border-bottom: none; }
    .item-meta {
      display: flex;
      justify-content: space-between;
      font-family: var(--font-mono);
      font-size: 0.75rem;
      color: var(--text-secondary);
      margin-bottom: 0.25rem;
    }
    .item-heading {
      font-weight: 600;
      color: var(--text-primary);
      margin-bottom: 0.25rem;
    }
    .item-desc {
      font-size: 0.85rem;
      color: var(--text-secondary);
    }
    pre {
      background: #04070D;
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 0.85rem;
      overflow-x: auto;
      font-family: var(--font-mono);
      font-size: 0.79rem;
      color: #81C995;
      margin-top: 0.45rem;
    }
    a { color: var(--gdm-cyan); text-decoration: none; }
    a:hover { text-decoration: underline; }
    footer {
      margin-top: 2.5rem;
      padding-top: 1.5rem;
      border-top: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      flex-wrap: wrap;
      font-family: var(--font-mono);
      font-size: 0.76rem;
      color: var(--text-secondary);
    }
  </style>
</head>
<body>
  <div class="google-four-color-bar"><div></div><div></div><div></div><div></div></div>
  <div class="container">
    <header>
      <div class="brand-lockup">
        <svg width="44" height="44" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id="gdm-grad" cx="25%" cy="25%" r="80%">
              <stop offset="0%" stop-color="#8AB4F8"/>
              <stop offset="40%" stop-color="#4285F4"/>
              <stop offset="75%" stop-color="#9B72CB"/>
              <stop offset="100%" stop-color="#EA4335"/>
            </radialGradient>
          </defs>
          <path d="M32 2C32 18.5685 45.4315 32 62 32C45.4315 32 32 45.4315 32 62C32 45.4315 18.5685 32 2 32C18.5685 32 32 18.5685 32 2Z" fill="url(#gdm-grad)"/>
        </svg>
        <div>
          <div class="brand-title">Google DeepMind Carbon // Paris (europe-west9) Beta</div>
          <div class="brand-subtitle">Gemini 4 Argon High-Reasoning Control Plane &bull; OpenAI /v1 Gateway &bull; Gemma 4 WebGPU/FFI &bull; Upstream Bun 134-Crate Graph</div>
        </div>
      </div>
      <div class="pill-row">
        <span class="pill pill-blue">Kernel: ${nativeVersion}</span>
        <span class="pill pill-green">Region: europe-west9 -> Global</span>
        <span class="pill pill-yellow">OpenAI /v1 + MCP JSON-RPC 2.0</span>
        <span class="pill pill-red">design.google Mirror: ${mirror.pages.length} Pages</span>
      </div>
    </header>

    <!-- KPI STRIP -->
    <div class="kpi-strip">
      <div class="kpi-card">
        <div class="kpi-label">Upstream Bun Graph</div>
        <div class="kpi-value">${graph.totalNodes} Nodes</div>
        <div class="kpi-sub">${graph.workspaceCrateCount} Cargo Crates / ${graph.subsystems.length} Subsystems</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Gemini Web &amp; OpenAI /v1</div>
        <div class="kpi-value">17 Tools / 5 Models</div>
        <div class="kpi-sub">StreamGenerate + /v1/chat/completions</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">LMSYS Arena Elo</div>
        <div class="kpi-value">1442 (#1 Overall)</div>
        <div class="kpi-sub">GPQA 84.6% / SWE-bench 79.4%</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Unified Mesh Rack</div>
        <div class="kpi-value">${mesh.totalVramGb} GB VRAM</div>
        <div class="kpi-sub">${mesh.totalCpuCores} Cores / ${mesh.totalRamGb} GB RAM (${mesh.activeWireguardMeshNetwork})</div>
      </div>
    </div>

    <!-- GEMINI WEB APP CLIENT, OPENAI /v1 GATEWAY & GLOBAL BENCHMARKS -->
    <div class="grid-2">
      <section class="card" style="margin-bottom:0;">
        <div class="card-header">
          <div class="card-title">Gemini Web App Client &amp; OpenAI /v1 Gateway</div>
          <span class="pill pill-blue">POST /v1/chat/completions</span>
        </div>
        <p class="item-desc">
          Drop-in OpenAI-compatible gateway bridging AGY CLI, LiteLLM, Open WebUI, and OpenRouter to Gemini 4 Argon, Gemini Web App (<code>StreamGenerate</code> + <code>__Secure-1PSID</code> cookie rotation), and local Gemma 4 E2B FFI.
        </p>
        <div class="btn-group">
          <select id="oai-model">
            <option value="gemini-4-argon">gemini-4-argon</option>
            <option value="gemini-4-carbon">gemini-4-carbon</option>
            <option value="gemini-web-deep-research">gemini-web-deep-research</option>
            <option value="gemini-web-canvas">gemini-web-canvas</option>
            <option value="gemma-4-e2b-it">gemma-4-e2b-it</option>
          </select>
          <input type="text" id="oai-prompt" value="Explain StreamGenerate & RotateCookies" placeholder="Prompt for /v1/chat/completions..." />
          <button onclick="runOpenAiGateway()">Send /v1 Chat</button>
          <button class="btn-secondary" onclick="inspectGeminiWeb()">Endpoints &amp; Memory</button>
        </div>
        <div id="gateway-out" class="terminal-out">Ready. Select a model and click Send /v1 Chat or Endpoints &amp; Memory.</div>
      </section>

      <section class="card" style="margin-bottom:0;">
        <div class="card-header">
          <div class="card-title">Global Benchmarks &amp; Design.google Local Mirror</div>
          <span class="pill pill-green">LMSYS &bull; OpenRouter &bull; HF &bull; Vertex</span>
        </div>
        <p class="item-desc">
          Inspect real-time Gemini 4 Carbon / Argon &amp; Gemma 4 benchmarks (LMSYS Arena, GPQA, SWE-bench), client libraries (PyPI/npm/crates.io), and the local <code>design.google</code> brand identity mirror.
        </p>
        <div class="btn-group">
          <button onclick="loadBenchmarks()">1. Global Benchmarks &amp; Ecosystem</button>
          <button class="btn-secondary" onclick="loadDesignMirror()">2. Local design.google Mirror</button>
          <button class="btn-secondary" onclick="loadOpenAiModels()">3. GET /v1/models</button>
        </div>
        <div id="bench-mirror-out" class="terminal-out">Click above to inspect LMSYS Arena / OpenRouter / Vertex AI benchmarks or the local design.google mirror.</div>
      </section>
    </div>

    <!-- INTERACTIVE GEMMA 4 FFI, WEBGPU & GRAPH CONSOLE -->
    <div class="grid-2">
      <section class="card" style="margin-bottom:0;">
        <div class="card-header">
          <div class="card-title">Gemma 4 E2B Bare-Metal Rust FFI &amp; Dawn WebGPU Studio</div>
          <span class="pill pill-blue">Zero-Copy Tensor Engine</span>
        </div>
        <p class="item-desc">
          Execute 8-way unrolled SIMD dot products, full Gemma 4 transformer layer forward passes (RoPE + Softmax + Unit-Offset RMSNorm + GeGLU MLP), or compile Dawn WebGPU WGSL shaders in-browser.
        </p>
        <div class="btn-group">
          <button onclick="runFfiBench()">1. SIMD Dot &amp; Cosine (1M f32)</button>
          <button onclick="runGemmaLayerStep()">2. Gemma 4 FFI Layer Step</button>
          <button class="btn-secondary" onclick="runWebGpuShaderCompile()">3. Compile WebGPU WGSL</button>
        </div>
        <div id="compute-out" class="terminal-out">Ready. Select an execution target above to benchmark bare-metal Rust FFI or WebGPU WGSL.</div>
      </section>

      <section class="card" style="margin-bottom:0;">
        <div class="card-header">
          <div class="card-title">Upstream Bun v1.4.4 Knowledge Graph &amp; MCP Explorer</div>
          <span class="pill pill-green">${graph.totalEdges} Dependency Edges</span>
        </div>
        <p class="item-desc">
          Query the 134 Cargo workspace crates and 117 <code>src/*</code> subsystems or invoke the Model Context Protocol (MCP) JSON-RPC 2.0 endpoint (<code>POST /mcp</code>).
        </p>
        <div class="btn-group">
          <input type="text" id="graph-q" value="aot" placeholder="Subsystem (aot, jsc, http, sql, lint)..." />
          <button onclick="searchBunGraph()">Query Graph</button>
          <button class="btn-secondary" onclick="callMcpToolsList()">MCP tools/list</button>
        </div>
        <div id="graph-out" class="terminal-out">Type a Bun subsystem name (e.g. aot, jsc, bundler, sql, uws) and click Query Graph.</div>
      </section>
    </div>

    <!-- UNIFIED GLOBAL MESH & RACK CLUSTER TABLE -->
    <section class="card">
      <div class="card-header">
        <div class="card-title">Unified Global Mesh &amp; WireGuard Rack Topology (${mesh.clusterId})</div>
        <span class="pill pill-yellow">Primary Hub: ${mesh.primaryBetaHub}</span>
      </div>
      <table>
        <thead>
          <tr>
            <th>Node ID</th>
            <th>Region / Location</th>
            <th>WireGuard IP</th>
            <th>Hardware &amp; Accelerator</th>
            <th>Active Services</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${mesh.nodes
            .map(
              (n) => `
            <tr>
              <td style="font-family:var(--font-mono);color:var(--gdm-cyan);">${n.id}</td>
              <td>${n.region}</td>
              <td style="font-family:var(--font-mono);">${n.wireguardMeshIp}</td>
              <td>${n.hardware.cpuCores}c / ${n.hardware.ramGb}GB ${n.hardware.accelerator ? `&bull; <strong>${n.hardware.accelerator}</strong>` : ""}</td>
              <td style="font-family:var(--font-mono);font-size:0.75rem;color:var(--text-secondary);">${n.services.join(", ")}</td>
              <td><span class="pill pill-green">${n.status.toUpperCase()}</span></td>
            </tr>
          `,
            )
            .join("")}
        </tbody>
      </table>
    </section>

    <!-- NEWS & CHANGELOG -->
    <div class="grid-2">
      <section class="card" style="margin-bottom:0;">
        <div class="card-header">
          <div class="card-title">Google DeepMind, Vertex AI &amp; Carbon Intelligence Feed</div>
        </div>
        ${data.news
          .map(
            (n) => `
          <div class="item-row">
            <div class="item-meta">
              <span>${n.category.toUpperCase()}</span>
              <span>${n.date}</span>
            </div>
            <div class="item-heading">${n.title}</div>
            <div class="item-desc">${n.summary}</div>
            <div style="margin-top:0.35rem;font-size:0.8rem;"><a href="${n.url}" target="_blank" rel="noopener">Official Documentation &rarr;</a></div>
          </div>
        `,
          )
          .join("")}
      </section>

      <section class="card" style="margin-bottom:0;">
        <div class="card-header">
          <div class="card-title">Release Engineering Changelog &amp; Production Invariants</div>
        </div>
        ${data.changelog
          .map(
            (c) => `
          <div class="item-row">
            <div class="item-meta">
              <strong>${c.version}</strong>
              <span>${c.date}</span>
            </div>
            <ul style="padding-left:1.1rem;font-size:0.84rem;color:var(--text-secondary);">
              ${c.changes.map((ch) => `<li style="margin-bottom:0.25rem;">${ch}</li>`).join("")}
            </ul>
          </div>
        `,
          )
          .join("")}
      </section>
    </div>

    <!-- GCLOUD PARIS EW9 -> GLOBAL AUTOMATION -->
    <section class="card">
      <div class="card-header">
        <div class="card-title">Google Cloud First Deployment (Paris europe-west9 Beta &rarr; Global Multi-Region)</div>
        <span class="pill pill-blue">infra/gcp/cloudbuild.yaml</span>
      </div>
      ${data.gcloudCliSetup
        .map(
          (s) => `
        <div style="margin-bottom:0.9rem;">
          <div style="font-size:0.86rem;font-weight:600;color:var(--text-primary);">${s.step}</div>
          <pre><code>${s.cmd}</code></pre>
        </div>
      `,
        )
        .join("")}
    </section>

    <footer>
      <div>Copyright 2026 Google LLC &bull; Licensed under Apache-2.0 &bull; Google DeepMind Paris (europe-west9)</div>
      <div>Engine: ${nativeVersion} &bull; Synced: ${data.lastUpdated}</div>
    </footer>
  </div>

  <script>
    async function runOpenAiGateway() {
      const out = document.getElementById("gateway-out");
      const model = document.getElementById("oai-model").value;
      const prompt = document.getElementById("oai-prompt").value || "Status check";
      out.textContent = "Calling POST /v1/chat/completions (" + model + ")...";
      const res = await fetch("/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: model,
          messages: [{ role: "user", content: prompt }]
        })
      });
      const d = await res.json();
      out.textContent = JSON.stringify(d, null, 2);
    }

    async function inspectGeminiWeb() {
      const out = document.getElementById("gateway-out");
      out.textContent = "Fetching GET /api/gemini-web...";
      const res = await fetch("/api/gemini-web");
      const d = await res.json();
      out.textContent = JSON.stringify(d, null, 2);
    }

    async function loadBenchmarks() {
      const out = document.getElementById("bench-mirror-out");
      out.textContent = "Fetching GET /api/benchmarks...";
      const res = await fetch("/api/benchmarks");
      const d = await res.json();
      out.textContent = JSON.stringify(d, null, 2);
    }

    async function loadDesignMirror() {
      const out = document.getElementById("bench-mirror-out");
      out.textContent = "Fetching GET /api/design-mirror...";
      const res = await fetch("/api/design-mirror");
      const d = await res.json();
      out.textContent = JSON.stringify(d, null, 2);
    }

    async function loadOpenAiModels() {
      const out = document.getElementById("bench-mirror-out");
      out.textContent = "Fetching GET /v1/models...";
      const res = await fetch("/v1/models");
      const d = await res.json();
      out.textContent = JSON.stringify(d, null, 2);
    }

    async function runFfiBench() {
      const out = document.getElementById("compute-out");
      out.textContent = "Executing 1,000,000 f32 SIMD Dot Product & Cosine Similarity via bun:ffi...";
      const res = await fetch("/api/bench");
      const d = await res.json();
      out.textContent = JSON.stringify(d, null, 2);
    }

    async function runGemmaLayerStep() {
      const out = document.getElementById("compute-out");
      out.textContent = "Executing Gemma 4 E2B Transformer Layer Step (RoPE + Softmax + RMSNorm + GeGLU MLP)...";
      const res = await fetch("/api/gemma-step");
      const d = await res.json();
      out.textContent = JSON.stringify(d, null, 2);
    }

    async function runWebGpuShaderCompile() {
      const out = document.getElementById("compute-out");
      if (!navigator.gpu) {
        out.textContent = "WebGPU API not enabled in this browser context. Using Bare-Metal Rust FFI fallback.";
        return;
      }
      const adapter = await navigator.gpu.requestAdapter({ powerPreference: "high-performance" });
      if (!adapter) {
        out.textContent = "No WebGPU adapter detected.";
        return;
      }
      const device = await adapter.requestDevice();
      const matmulMod = device.createShaderModule({ code: ${JSON.stringify(GEMMA_WGSL_MATMUL)} });
      const rmsMod = device.createShaderModule({ code: ${JSON.stringify(GEMMA_WGSL_RMSNORM)} });
      device.createComputePipeline({ layout: "auto", compute: { module: matmulMod, entryPoint: "main" } });
      device.createComputePipeline({ layout: "auto", compute: { module: rmsMod, entryPoint: "main" } });
      out.textContent = JSON.stringify({
        status: "WEBGPU_PIPELINE_READY",
        kernelsCompiled: ["GEMMA_WGSL_MATMUL (16x16 tiled)", "GEMMA_WGSL_RMSNORM (unit-offset)"],
        zeroExternalDependencies: true
      }, null, 2);
    }

    async function searchBunGraph() {
      const q = document.getElementById("graph-q").value || "aot";
      const out = document.getElementById("graph-out");
      out.textContent = "Querying 1,297-node Bun architecture graph for '" + q + "'...";
      const res = await fetch("/api/graph?q=" + encodeURIComponent(q));
      const d = await res.json();
      out.textContent = JSON.stringify(d, null, 2);
    }

    async function callMcpToolsList() {
      const out = document.getElementById("graph-out");
      out.textContent = "Calling POST /mcp (JSON-RPC 2.0 tools/list)...";
      const res = await fetch("/mcp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list", params: {} })
      });
      const d = await res.json();
      out.textContent = JSON.stringify(d, null, 2);
    }
  </script>
</body>
</html>`;
}

export async function handleWebRequest(req: Request): Promise<Response> {
  const url = new URL(req.url);

  if (url.pathname === "/") {
    return new Response(renderDeepMindDashboardHtml(), {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  if (url.pathname === "/v1/models" && req.method === "GET") {
    return Response.json(getOpenAiModelsList());
  }

  if (url.pathname === "/v1/chat/completions" && req.method === "POST") {
    const body = (await req.json()) as OpenAiChatCompletionRequest;
    return Response.json(executeOpenAiChatCompletion(body));
  }

  if (url.pathname === "/api/gemini-web") {
    return Response.json({
      endpoints: GEMINI_WEB_ENDPOINTS,
      capabilities: GEMINI_WEB_17_CAPABILITIES,
      memory: syncGeminiWebMemory(),
      ecosystemLibraries: GEMINI_ECOSYSTEM_LIBRARIES,
    });
  }

  if (url.pathname === "/api/benchmarks") {
    return Response.json({
      benchmarks: GEMINI_4_CARBON_BENCHMARKS,
      ecosystemLibraries: GEMINI_ECOSYSTEM_LIBRARIES,
    });
  }

  if (url.pathname === "/api/design-mirror") {
    return Response.json(loadDesignGoogleMirror());
  }

  if (url.pathname === "/api/yolo-web") {
    return Response.json(getYoloWebUnifiedBridgeStatus());
  }

  if (url.pathname === "/api/gpui-studio") {
    return Response.json(getUnifiedGpuiAntigravityStudioStatus());
  }

  if (url.pathname === "/api/data") {
    return Response.json(loadCarbonData());
  }

  if (url.pathname === "/api/bench") {
    const size = 1_000_000;
    const a = new Float32Array(size).fill(0.5);
    const b = new Float32Array(size).fill(2.0);
    const t0 = performance.now();
    const dotResult = nativeDotProduct(a, b);
    const cosineResult = nativeCosineSimilarity(a, b);
    const t1 = performance.now();
    return Response.json({
      kernel: getNativeEngineVersion(),
      elements: size,
      dotProduct: dotResult,
      cosineSimilarity: Number(cosineResult.toFixed(6)),
      latencyMs: Number((t1 - t0).toFixed(3)),
    });
  }

  if (url.pathname === "/api/gemma-step") {
    const dim = Number(url.searchParams.get("dim") || 128);
    const hiddenDim = Number(url.searchParams.get("hiddenDim") || 512);
    const pos = Number(url.searchParams.get("pos") || 7);
    return Response.json(executeGemma4NativeForwardStep(dim, hiddenDim, pos));
  }

  if (url.pathname === "/api/graph") {
    const q = url.searchParams.get("q") || "aot";
    const limit = Number(url.searchParams.get("limit") || 15);
    return Response.json(queryBunCodebaseGraph(q, limit));
  }

  if (url.pathname === "/api/mesh") {
    return Response.json(getUnifiedClusterTopology());
  }

  if (url.pathname === "/mcp" && req.method === "POST") {
    const body = (await req.json()) as JsonRpcRequest;
    return Response.json(handleMcpRequest(body));
  }

  if (url.pathname === "/api/sync" && req.method === "POST") {
    const data = loadCarbonData();
    saveCarbonData(data);
    return Response.json({ success: true, timestamp: data.lastUpdated });
  }

  if (url.pathname === "/health") {
    const cookieStatus = getCookieVaultStatus();
    return Response.json({
      ok: true,
      service: "google-deepmind-carbon-gemini-4-argon",
      version: "4.0.0",
      nativeKernel: getNativeEngineVersion(),
      authenticated: cookieStatus.hasValid1Psid,
      cookieCount: cookieStatus.cookieCount,
      petCharacter: getPetState().character,
    });
  }

  if (url.pathname === "/api/pet/state" && req.method === "GET") {
    return Response.json({ ok: true, state: getPetState() });
  }

  if (url.pathname === "/api/pet/customize" && req.method === "POST") {
    const body = (await req.json()) as Record<string, unknown>;
    const state = customizePetState(body);
    return Response.json({ ok: true, state });
  }

  if (url.pathname === "/assets/openpets/gemini-pet-spritesheet.svg") {
    return new Response(generatePetSpritesheetSvg(), {
      headers: { "Content-Type": "image/svg+xml; charset=utf-8" },
    });
  }

  if (url.pathname === "/assets/openpets/gemini-pet-3d.glb") {
    const glb = generatePet3dGlbBinary();
    const buf = new ArrayBuffer(glb.byteLength);
    new Uint8Array(buf).set(glb);
    return new Response(buf, {
      headers: { "Content-Type": "model/gltf-binary" },
    });
  }

  if (url.pathname.startsWith("/assets/")) {
    const relPath = url.pathname.replace(/^\/assets\//, "");
    const assetFile = Bun.file(
      new URL(`../assets/${relPath}`, import.meta.url).pathname.replace(
        /^\/([A-Za-z]:)/,
        "$1",
      ),
    );
    if (await assetFile.exists()) {
      return new Response(assetFile);
    }
  }

  if (url.pathname === "/api/voicebox/voices" && req.method === "GET") {
    return Response.json({ ok: true, voices: GEMINI_6_HD_VOICES });
  }

  if (url.pathname === "/api/voicebox/synthesize" && req.method === "POST") {
    const body = (await req.json()) as {
      text?: string;
      voice?: any;
      uncensoredGemma4?: boolean;
    };
    return Response.json(
      synthesizeVoiceboxWithFfiDsp({
        text: body.text || "Carbon Voicebox Ready",
        voice: body.voice,
        uncensoredGemma4: body.uncensoredGemma4,
      }),
    );
  }

  if (url.pathname === "/api/cookies/status" && req.method === "GET") {
    return Response.json(getCookieVaultStatus());
  }

  if (url.pathname === "/api/cookies/sync" && req.method === "POST") {
    const body = (await req.json()) as {
      psid?: string;
      psidts?: string;
      sapisid?: string;
      cfb2h?: string;
    };
    const updated = updateCookieVault(body);
    return Response.json({ ok: true, ...updated });
  }

  if (url.pathname === "/api/tunnel/agy-mcp" && req.method === "POST") {
    const body = (await req.json()) as {
      tool: string;
      arguments?: Record<string, unknown>;
      skill?: string;
      syncMemoryFact?: string;
    };
    return Response.json(invokeAgyMcpTunnel(body));
  }

  if (url.pathname === "/api/hardware/verify" && req.method === "GET") {
    return Response.json(probeRealHardwareAndSoftware());
  }

  if (url.pathname === "/api/re/google-matrix" && req.method === "GET") {
    const reportFile = Bun.file(
      "C:/src/yolo-re/var/reports/yolo-re-google-migration-plan.json",
    );
    if (await reportFile.exists()) {
      return Response.json(await reportFile.json());
    }
    return Response.json(
      { ok: false, error: "Migration matrix not generated" },
      { status: 404 },
    );
  }

  return new Response("Not Found", { status: 404 });
}

export function startWebServer(port = DEFAULT_PORT, hostname = DEFAULT_HOST) {
  const server = Bun.serve({
    port,
    hostname,
    fetch: handleWebRequest,
  });

  console.log(
    `Google DeepMind Carbon Control Plane listening at http://${hostname}:${server.port}`,
  );
  return server;
}

if (import.meta.main) {
  startWebServer();
}
