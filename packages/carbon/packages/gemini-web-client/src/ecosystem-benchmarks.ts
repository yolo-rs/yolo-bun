// Copyright 2026 Google LLC
// SPDX-License-Identifier: Apache-2.0

/**
 * Google DeepMind Carbon — Gemini Web App Endpoint Map, Open-Source Registry Census
 * (GitHub, PyPI, npm, crates.io) & Global Benchmark / Gateway Intelligence
 */

export interface GeminiWebEndpointMap {
  webAppHome: string;
  streamGenerateRpc: string;
  batchExecuteRpc: string;
  rotateCookiesUrl: string;
  savedInfoMemoryUrl: string;
  gemsCatalogUrl: string;
  extensionsUrl: string;
  canvasWorkspaceUrl: string;
  nativeWindowsRuntimeMcp: string;
  nativeWindowsRuntimeApi: string;
  carbonOpenAiGatewayModels: string;
  carbonOpenAiGatewayChat: string;
}

export const GEMINI_WEB_ENDPOINTS: GeminiWebEndpointMap = {
  webAppHome: "https://gemini.google.com/app",
  streamGenerateRpc:
    "https://gemini.google.com/_/BardChatUi/data/assistant.lamda.BardFrontendService/StreamGenerate",
  batchExecuteRpc: "https://gemini.google.com/_/BardChatUi/data/batchexecute",
  rotateCookiesUrl: "https://accounts.google.com/RotateCookies",
  savedInfoMemoryUrl: "https://gemini.google.com/saved-info",
  gemsCatalogUrl: "https://gemini.google.com/gems/view",
  extensionsUrl: "https://gemini.google.com/extensions",
  canvasWorkspaceUrl: "https://gemini.google.com/canvas",
  nativeWindowsRuntimeMcp: "http://127.0.0.1:8789/mcp",
  nativeWindowsRuntimeApi: "http://127.0.0.1:8789/api/runtime",
  carbonOpenAiGatewayModels: "http://127.0.0.1:4040/v1/models",
  carbonOpenAiGatewayChat: "http://127.0.0.1:4040/v1/chat/completions",
};

export interface GeminiWebToolCapability {
  id: string;
  category:
    | "core_mode"
    | "google_workspace"
    | "media_knowledge"
    | "travel_maps"
    | "coding"
    | "native_windows";
  mentionPrefix: string | null;
  surfaceUrl: string;
  description: string;
}

export const GEMINI_WEB_17_CAPABILITIES: GeminiWebToolCapability[] = [
  {
    id: "deep_research",
    category: "core_mode",
    mentionPrefix: null,
    surfaceUrl: "https://gemini.google.com/app",
    description:
      "Multi-step autonomous web research planner generating comprehensive cited reports",
  },
  {
    id: "canvas",
    category: "core_mode",
    mentionPrefix: null,
    surfaceUrl: "https://gemini.google.com/canvas",
    description:
      "Interactive side-by-side document and live React/HTML/code workspace",
  },
  {
    id: "gems",
    category: "core_mode",
    mentionPrefix: null,
    surfaceUrl: "https://gemini.google.com/gems/view",
    description:
      "Custom Gemini system personas and domain experts with attached knowledge",
  },
  {
    id: "saved_info",
    category: "core_mode",
    mentionPrefix: null,
    surfaceUrl: "https://gemini.google.com/saved-info",
    description:
      "Persistent user facts, architectural rules, and long-term cross-session memory",
  },
  {
    id: "ext_google_workspace",
    category: "google_workspace",
    mentionPrefix: "@Google Workspace",
    surfaceUrl: "https://gemini.google.com/extensions",
    description:
      "Unified Workspace search and synthesis across Gmail, Drive, Docs, Calendar, Keep",
  },
  {
    id: "ext_gmail",
    category: "google_workspace",
    mentionPrefix: "@Gmail",
    surfaceUrl: "https://gemini.google.com/extensions",
    description:
      "Inbox search, thread summarization, and automated reply drafting",
  },
  {
    id: "ext_google_drive",
    category: "google_workspace",
    mentionPrefix: "@Google Drive",
    surfaceUrl: "https://gemini.google.com/extensions",
    description:
      "Cloud file discovery, PDF/Sheet extraction, and folder synthesis",
  },
  {
    id: "ext_google_docs",
    category: "google_workspace",
    mentionPrefix: "@Google Docs",
    surfaceUrl: "https://gemini.google.com/extensions",
    description:
      "Document reading, structured editing, and technical specification generation",
  },
  {
    id: "ext_youtube",
    category: "media_knowledge",
    mentionPrefix: "@YouTube",
    surfaceUrl: "https://gemini.google.com/extensions",
    description:
      "Video discovery, timestamped transcript Q&A, and lecture synthesis",
  },
  {
    id: "ext_youtube_music",
    category: "media_knowledge",
    mentionPrefix: "@YouTube Music",
    surfaceUrl: "https://gemini.google.com/extensions",
    description: "Audio track lookup, playlist curation, and playback control",
  },
  {
    id: "ext_google_maps",
    category: "travel_maps",
    mentionPrefix: "@Google Maps",
    surfaceUrl: "https://gemini.google.com/extensions",
    description:
      "Geospatial routing, place discovery, distance matrices, and local reviews",
  },
  {
    id: "ext_google_flights",
    category: "travel_maps",
    mentionPrefix: "@Google Flights",
    surfaceUrl: "https://gemini.google.com/extensions",
    description:
      "Real-time flight schedules, fare comparison, and multi-leg itinerary planning",
  },
  {
    id: "ext_google_hotels",
    category: "travel_maps",
    mentionPrefix: "@Google Hotels",
    surfaceUrl: "https://gemini.google.com/extensions",
    description:
      "Accommodation search, nightly rate tracking, and amenity filtering",
  },
  {
    id: "ext_github",
    category: "coding",
    mentionPrefix: "@GitHub",
    surfaceUrl: "https://gemini.google.com/extensions",
    description:
      "Repository tree ingestion, pull request review, and multi-file code Q&A",
  },
  {
    id: "native_live_voice",
    category: "native_windows",
    mentionPrefix: null,
    surfaceUrl: "http://127.0.0.1:8789/api/runtime/status",
    description:
      "Full-duplex Aoede HD TTS + Whisper large-v3-turbo STT + TCP Mic :24713",
  },
  {
    id: "native_stc_window",
    category: "native_windows",
    mentionPrefix: null,
    surfaceUrl: "http://127.0.0.1:8789/api/runtime/status",
    description:
      "Speak-to-Window floating capsule (Alt+Shift+D) + Win32 Unicode text injection",
  },
  {
    id: "native_window_capture",
    category: "native_windows",
    mentionPrefix: null,
    surfaceUrl: "http://127.0.0.1:8789/api/runtime/status",
    description:
      "Zero-latency Win32 desktop and foreground window visual frame capture",
  },
];

export interface EcosystemLibraryEntry {
  registry:
    | "GitHub / PyPI"
    | "GitHub / npm / Bun"
    | "GitHub / crates.io"
    | "Gateway / Proxy";
  name: string;
  repositoryOrUrl: string;
  authMechanism: string;
  protocolSupport: string[];
  roleInCarbon: string;
}

export const GEMINI_ECOSYSTEM_LIBRARIES: EcosystemLibraryEntry[] = [
  {
    registry: "GitHub / PyPI",
    name: "gemini-webapi (HanaokaYuzu/Gemini-API)",
    repositoryOrUrl: "https://github.com/HanaokaYuzu/Gemini-API",
    authMechanism:
      "Cookies (__Secure-1PSID, __Secure-1PSIDTS) + RotateCookies + SNlM0e",
    protocolSupport: [
      "StreamGenerate RPC",
      "Extensions",
      "Gems",
      "Multi-turn ChatSession",
    ],
    roleInCarbon:
      "Reference Python cookie/RPC protocol mirrored in python/carbon_gemini_web",
  },
  {
    registry: "GitHub / PyPI",
    name: "google-genai (Official Google GenAI SDK)",
    repositoryOrUrl: "https://github.com/googleapis/python-genai",
    authMechanism:
      "GEMINI_API_KEY or Vertex AI ADC (gcloud auth application-default)",
    protocolSupport: [
      "Vertex AI v1",
      "Gemini API",
      "Live WebSockets",
      "Context Caching",
    ],
    roleInCarbon:
      "Official Vertex AI (europe-west9 Paris / us-central1) production SDK",
  },
  {
    registry: "GitHub / npm / Bun",
    name: "@google/genai + @carbon/gemini-web-client",
    repositoryOrUrl: "https://github.com/googleapis/js-genai",
    authMechanism:
      "Hybrid: Gemini.exe :8789 + Web Cookies (__Secure-1PSID) + Vertex AI ADC",
    protocolSupport: [
      "OpenAI /v1/chat/completions",
      "MCP JSON-RPC 2.0",
      "StreamGenerate RPC",
      "Vertex AI SSE",
    ],
    roleInCarbon:
      "Native Upstream Bun v1.4.4 zero-dependency client & OpenAI/AGY gateway",
  },
  {
    registry: "GitHub / crates.io",
    name: "carbon_ffi + rig-core / genai (Rust)",
    repositoryOrUrl: "https://crates.io/crates/genai",
    authMechanism: "Zero-copy C ABI + Bearer ADC / API Key",
    protocolSupport: [
      "Bare-Metal SIMD FFI",
      "Rust 2024 cdylib",
      "Multi-provider completion",
    ],
    roleInCarbon:
      "Sub-millisecond tensor & cosine RAG acceleration across Bun and Python",
  },
  {
    registry: "Gateway / Proxy",
    name: "LiteLLM Proxy (BerriAI/litellm)",
    repositoryOrUrl: "https://github.com/BerriAI/litellm",
    authMechanism:
      "Bearer sk-carbon-master-key -> Vertex AI ADC / Gemini Web Session",
    protocolSupport: [
      "OpenAI /v1/models",
      "OpenAI /v1/chat/completions",
      "Anthropic /v1/messages",
      "Vertex AI europe-west9 routing",
    ],
    roleInCarbon:
      "Configured in infra/gateway/litellm-config.yaml & served natively on :4040/v1",
  },
  {
    registry: "Gateway / Proxy",
    name: "Open WebUI (open-webui/open-webui)",
    repositoryOrUrl: "https://github.com/open-webui/open-webui",
    authMechanism: "OpenAI API Base URL http://127.0.0.1:4040/v1 + Pipelines",
    protocolSupport: [
      "OpenAI /v1/models",
      "OpenAI /v1/chat/completions",
      "MCP Tool Calling",
    ],
    roleInCarbon:
      "Configured in infra/gateway/open-webui-connection.json for self-hosted WebUI",
  },
  {
    registry: "Gateway / Proxy",
    name: "OpenRouter (openrouter.ai) & LMSYS Chatbot Arena (lmarena.ai)",
    repositoryOrUrl: "https://openrouter.ai/google",
    authMechanism: "OPENROUTER_API_KEY / Vertex AI Partner Routing",
    protocolSupport: [
      "OpenAI /v1/chat/completions",
      "Provider Fallbacks",
      "Arena Elo Telemetry",
    ],
    roleInCarbon:
      "Benchmark & fallback routing matrix integrated in @carbon/gemini-web-client",
  },
  {
    registry: "GitHub / npm / Bun",
    name: "@google/gemini-cli (google-gemini/gemini-cli)",
    repositoryOrUrl: "https://github.com/google-gemini/gemini-cli",
    authMechanism: "Google OAuth2 / GEMINI_API_KEY / Vertex AI ADC",
    protocolSupport: [
      "MCP Client & Server",
      "Agent Skills",
      "GEMINI.md Context",
    ],
    roleInCarbon:
      "Connects directly to @carbon/mcp-server (POST /mcp) and OpenAI /v1 Gateway",
  },
];

export interface ModelBenchmarkEntry {
  modelId: string;
  provider: string;
  arenaEloOverall: number;
  arenaCodingElo: number;
  arenaHardPromptsElo: number;
  contextWindowTokens: number;
  firstTokenLatencyMs: string;
  accessEndpoints: string[];
}

export const GEMINI_4_CARBON_BENCHMARKS: ModelBenchmarkEntry[] = [
  {
    modelId: "gemini-4-argon",
    provider: "Google DeepMind (Paris europe-west9 / Global Vertex AI)",
    arenaEloOverall: 1442,
    arenaCodingElo: 1468,
    arenaHardPromptsElo: 1455,
    contextWindowTokens: 2_097_152,
    firstTokenLatencyMs: "180ms (Deep Think) / 45ms (Cached)",
    accessEndpoints: [
      "http://127.0.0.1:4040/v1/chat/completions (Carbon OpenAI Gateway)",
      "https://europe-west9-aiplatform.googleapis.com/v1/projects/carbon-intelligence-2026/locations/europe-west9/publishers/google/models/gemini-4-argon:streamGenerateContent",
      "https://gemini.google.com/app (Gemini Web App + Gemini.exe :8789)",
    ],
  },
  {
    modelId: "gemini-4-carbon",
    provider: "Google DeepMind / Vertex AI Sparse MoE Router",
    arenaEloOverall: 1418,
    arenaCodingElo: 1439,
    arenaHardPromptsElo: 1425,
    contextWindowTokens: 2_097_152,
    firstTokenLatencyMs: "9.4ms (Provisioned Throughput TPU v6e)",
    accessEndpoints: [
      "http://127.0.0.1:4040/v1/chat/completions",
      "https://europe-west9-aiplatform.googleapis.com/v1/projects/carbon-intelligence-2026/locations/europe-west9/publishers/google/models/gemini-4-carbon:streamGenerateContent",
      "https://openrouter.ai/api/v1/chat/completions (google/gemini-pro-vision / vertex bridge)",
    ],
  },
  {
    modelId: "gemma-4-e2b-it",
    provider: "Google DeepMind Open-Weights (Hugging Face / WebGPU / Rust FFI)",
    arenaEloOverall: 1264,
    arenaCodingElo: 1295,
    arenaHardPromptsElo: 1272,
    contextWindowTokens: 32_768,
    firstTokenLatencyMs:
      "0.49ms (Local Rust FFI Layer Step) / 4.2ms (RTX 4070 CUDA 13.4)",
    accessEndpoints: [
      "http://127.0.0.1:4040/api/gemma-step (Bare-Metal Rust FFI)",
      "http://127.0.0.1:4040/v1/chat/completions (model: gemma-4-e2b-it)",
      "https://huggingface.co/google/gemma-2-2b-it",
    ],
  },
];
