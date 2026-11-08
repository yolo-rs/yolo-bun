// Copyright 2026 Google LLC
// SPDX-License-Identifier: Apache-2.0

/**
 * Google DeepMind Carbon — Model Context Protocol (MCP) JSON-RPC 2.0 Server
 * Exposes Carbon's Rust FFI kernels, Upstream Bun Knowledge Graph, Gemma 4 WebGPU/FFI
 * forward pass, Gemini Web App / OpenAI Gateway, Google Design Mirror, and Global Mesh.
 */

import { loadCarbonData, getNativeEngineVersion } from "../../core/src/index.ts";
import {
  queryBunCodebaseGraph,
  loadBunCodebaseGraph,
} from "../../graph-engine/src/index.ts";
import { getUnifiedClusterTopology } from "../../mesh-cluster/src/index.ts";
import { executeGemma4NativeForwardStep } from "../../webgpu-gemma/src/index.ts";
import { crawlSourceTree, rankCodeChunksWithRustRag } from "../../dataset/src/index.ts";
import {
  executeOpenAiChatCompletion,
  GEMINI_4_CARBON_BENCHMARKS,
  GEMINI_ECOSYSTEM_LIBRARIES,
  GEMINI_WEB_17_CAPABILITIES,
  GEMINI_WEB_ENDPOINTS,
  getUnifiedGpuiAntigravityStudioStatus,
  getYoloWebUnifiedBridgeStatus,
  syncGeminiWebMemory,
} from "../../gemini-web-client/src/index.ts";
import { loadDesignGoogleMirror } from "../../design-crawler/src/index.ts";

export interface JsonRpcRequest {
  jsonrpc: "2.0";
  id?: string | number | null;
  method: string;
  params?: Record<string, unknown>;
}

export interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: string | number | null;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

export interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export const CARBON_MCP_TOOLS: McpToolDefinition[] = [
  {
    name: "carbon_status",
    description:
      "Return Google DeepMind Carbon Paris (europe-west9) Beta -> Global status, Rust FFI kernel version, and upstream census.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "carbon_ffi_gemma_step",
    description:
      "Execute a zero-copy Gemma 4 transformer layer step (RoPE + Softmax + Unit-Offset RMSNorm + GeGLU MLP) on the bare-metal Rust FFI engine.",
    inputSchema: {
      type: "object",
      properties: {
        dim: { type: "number", description: "Model dimension (default 128)" },
        hiddenDim: {
          type: "number",
          description: "MLP hidden dimension (default 512)",
        },
        tokenPosition: {
          type: "number",
          description: "RoPE token index (default 7)",
        },
      },
    },
  },
  {
    name: "carbon_graph_query",
    description:
      "Query the 1,297-node Upstream Bun v1.4.4 architecture knowledge graph across 134 Cargo crates and 117 src/* subsystems.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Subsystem or file query (e.g. aot, jsc, http, sql)",
        },
        limit: {
          type: "number",
          description: "Max nodes to return (default 15)",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "carbon_mesh_topology",
    description:
      "Inspect the Unified Global Rack & WireGuard 10.66.0.0/24 mesh across Paris Cloud Run (europe-west9), TPU v6e (europe-west4), US-Central1 Crawler, OVH France, and Local RTX 4070.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "carbon_rag_search",
    description:
      "Rank Upstream Bun source files against a natural-language or code query using bare-metal Rust cosine similarity.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Code or architectural query" },
        topK: {
          type: "number",
          description: "Number of top ranked files (default 5)",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "carbon_gcloud_recipes",
    description:
      "Retrieve Google Cloud CLI, Cloud Build, Cloud Run (europe-west9 Paris), and Vertex AI Custom Job deployment commands.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "carbon_gemini_web_gateway",
    description:
      "Invoke the Gemini Web App & OpenAI-compatible Gateway (/v1/chat/completions), inspect the 17 Web capabilities, or sync /saved-info Web Memory.",
    inputSchema: {
      type: "object",
      properties: {
        prompt: {
          type: "string",
          description: "Prompt to execute via the Carbon Gemini Gateway",
        },
        model: {
          type: "string",
          description:
            "Model ID (gemini-4-argon, gemini-4-carbon, gemini-web-deep-research, gemma-4-e2b-it)",
        },
        saveMemoryFact: {
          type: "string",
          description: "Optional fact to persist to /saved-info",
        },
      },
    },
  },
  {
    name: "carbon_design_google_mirror",
    description:
      "Retrieve the local mirror of design.google & Evolving the Google Identity along with 4-color brand & HCT surface tokens.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "carbon_yolo_web_vault_sync",
    description:
      "Inspect the consolidated yolo-web Obscura/Brave/Servo engine, encrypted SQLite/Postgres/Redis vault, Passkey/TOTP 2FA, Chrome yohanpierre15 -> aphrody-yolo sync, and 5-registry index.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "carbon_gpui_antigravity_studio",
    description:
      "Inspect the Pure Rust GPUI (Zed Fork) replacing Electron in Antigravity 2.0 & Gemini Desktop, Keyless Google AI Ultra Subscription Bridge, Unified Token Usage Tracker, and Local Uncensored Creative Suite (Image, Video, 3D, Music + Craft + OpenCode + yolo-ai).",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
];

export function handleMcpRequest(req: JsonRpcRequest): JsonRpcResponse {
  const id = req.id ?? null;

  try {
    switch (req.method) {
      case "initialize": {
        return {
          jsonrpc: "2.0",
          id,
          result: {
            protocolVersion: "2024-11-05",
            serverInfo: {
              name: "google-deepmind-carbon-mcp",
              version: "4.0.0",
              nativeKernel: getNativeEngineVersion(),
              region: "europe-west9",
            },
            capabilities: {
              tools: { listChanged: false },
              resources: { listChanged: false },
            },
          },
        };
      }

      case "tools/list": {
        return {
          jsonrpc: "2.0",
          id,
          result: {
            tools: CARBON_MCP_TOOLS,
          },
        };
      }

      case "resources/list": {
        return {
          jsonrpc: "2.0",
          id,
          result: {
            resources: [
              {
                uri: "carbon://telemetry/upstream-census",
                name: "Google DeepMind Carbon Upstream Source-of-Truth Census",
                mimeType: "application/json",
              },
              {
                uri: "carbon://graph/bun-architecture",
                name: "Upstream Bun v1.4.4 134-Crate Architecture Knowledge Graph",
                mimeType: "application/json",
              },
              {
                uri: "carbon://mesh/global-topology",
                name: "Paris europe-west9 -> Global WireGuard & Cloud Run Mesh Topology",
                mimeType: "application/json",
              },
              {
                uri: "carbon://gemini-web/endpoints-and-benchmarks",
                name: "Gemini Web App Endpoints, 17 Tools, LMSYS Arena & OpenRouter Benchmarks",
                mimeType: "application/json",
              },
            ],
          },
        };
      }

      case "resources/read": {
        const uri = String(req.params?.uri || "");
        let payload: unknown = {};
        if (uri === "carbon://telemetry/upstream-census") {
          payload = loadCarbonData();
        } else if (uri === "carbon://graph/bun-architecture") {
          const g = loadBunCodebaseGraph();
          payload = {
            bunVersion: g.bunVersion,
            totalNodes: g.totalNodes,
            totalEdges: g.totalEdges,
            workspaceCrateCount: g.workspaceCrateCount,
            subsystems: g.subsystems,
          };
        } else if (uri === "carbon://mesh/global-topology") {
          payload = getUnifiedClusterTopology();
        } else if (uri === "carbon://gemini-web/endpoints-and-benchmarks") {
          payload = {
            endpoints: GEMINI_WEB_ENDPOINTS,
            capabilities: GEMINI_WEB_17_CAPABILITIES,
            libraries: GEMINI_ECOSYSTEM_LIBRARIES,
            benchmarks: GEMINI_4_CARBON_BENCHMARKS,
          };
        } else {
          return {
            jsonrpc: "2.0",
            id,
            error: { code: -32602, message: `Unknown resource URI: ${uri}` },
          };
        }
        return {
          jsonrpc: "2.0",
          id,
          result: {
            contents: [
              {
                uri,
                mimeType: "application/json",
                text: JSON.stringify(payload, null, 2),
              },
            ],
          },
        };
      }

      case "tools/call": {
        const toolName = String(req.params?.name || "");
        const args = (req.params?.arguments || {}) as Record<string, unknown>;

        let output: unknown;
        switch (toolName) {
          case "carbon_status": {
            const d = loadCarbonData();
            output = {
              engine: d.engine,
              version: d.version,
              nativeKernel: getNativeEngineVersion(),
              primaryRegion: d.primaryRegion,
              globalRegions: d.globalRegions,
              upstreamCensus: d.upstreamCensus,
            };
            break;
          }
          case "carbon_ffi_gemma_step": {
            const dim = Number(args.dim || 128);
            const hiddenDim = Number(args.hiddenDim || 512);
            const tokenPosition = Number(args.tokenPosition || 7);
            output = executeGemma4NativeForwardStep(
              dim,
              hiddenDim,
              tokenPosition,
            );
            break;
          }
          case "carbon_graph_query": {
            const q = String(args.query || "aot");
            const limit = Number(args.limit || 15);
            output = queryBunCodebaseGraph(q, limit);
            break;
          }
          case "carbon_mesh_topology": {
            output = getUnifiedClusterTopology();
            break;
          }
          case "carbon_rag_search": {
            const query = String(args.query || "aot compiler");
            const topK = Number(args.topK || 5);
            const { chunks } = crawlSourceTree(
              process.env.BUN_SRC_ROOT ||
                (process.platform === "win32"
                  ? "C:/src/yolo-bun/upstream/bun/src"
                  : "/src/yolo-bun/upstream/bun/src"),
              300,
            );
            output = {
              query,
              scannedFiles: chunks.length,
              results: rankCodeChunksWithRustRag(query, chunks, topK),
            };
            break;
          }
          case "carbon_gcloud_recipes": {
            output = loadCarbonData().gcloudCliSetup;
            break;
          }
          case "carbon_gemini_web_gateway": {
            if (typeof args.saveMemoryFact === "string") {
              syncGeminiWebMemory(args.saveMemoryFact);
            }
            const prompt = String(
              args.prompt || "Synthesize Gemini 4 Carbon architecture",
            );
            const model = String(args.model || "gemini-4-argon");
            output = executeOpenAiChatCompletion({
              model,
              messages: [{ role: "user", content: prompt }],
            });
            break;
          }
          case "carbon_design_google_mirror": {
            output = loadDesignGoogleMirror();
            break;
          }
          case "carbon_yolo_web_vault_sync": {
            output = getYoloWebUnifiedBridgeStatus();
            break;
          }
          case "carbon_gpui_antigravity_studio": {
            output = getUnifiedGpuiAntigravityStudioStatus();
            break;
          }
          default:
            return {
              jsonrpc: "2.0",
              id,
              error: { code: -32601, message: `Unknown MCP tool: ${toolName}` },
            };
        }

        return {
          jsonrpc: "2.0",
          id,
          result: {
            content: [
              {
                type: "text",
                text: JSON.stringify(output, null, 2),
              },
            ],
          },
        };
      }

      default:
        return {
          jsonrpc: "2.0",
          id,
          error: {
            code: -32601,
            message: `Method not found: ${req.method}`,
          },
        };
    }
  } catch (err) {
    return {
      jsonrpc: "2.0",
      id,
      error: {
        code: -32603,
        message: err instanceof Error ? err.message : "Internal MCP error",
      },
    };
  }
}
