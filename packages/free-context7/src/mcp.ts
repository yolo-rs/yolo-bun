// SPDX-License-Identifier: Apache-2.0
/**
 * Free-Context7 MCP Server (Bun Native, Zero-Dependency, SQLite WAL).
 * Deep documentation, AST resolution & code search without third-party API keys.
 */

import { FreeContext7Engine, OFFICIAL_LIBRARIES } from "../src/index.ts";

const engine = new FreeContext7Engine();

async function handleMessage(line: string) {
  if (!line.trim()) return;
  let req: any;
  try {
    req = JSON.parse(line);
  } catch {
    return;
  }

  const { id, method, params } = req;

  if (method === "initialize") {
    const res = {
      jsonrpc: "2.0",
      id,
      result: {
        protocolVersion: "2024-11-05",
        capabilities: { tools: {} },
        serverInfo: { name: "free-context7", version: "2026.11.0" },
      },
    };
    process.stdout.write(JSON.stringify(res) + "\n");
    return;
  }

  if (method === "notifications/initialized") {
    return;
  }

  if (method === "tools/list") {
    const res = {
      jsonrpc: "2.0",
      id,
      result: {
        tools: [
          {
            name: "resolve_library_docs",
            description:
              "Query documentation, APIs, symbols and code examples from official sources (Bun, Google, Rust, Chromium, Web APIs).",
            inputSchema: {
              type: "object",
              properties: {
                library: {
                  type: "string",
                  description: "Name of the library or ecosystem (e.g. bun, google-genai, rust-simd).",
                },
                query: {
                  type: "string",
                  description: "Search keywords, function or symbol name.",
                },
              },
              required: ["query"],
            },
          },
          {
            name: "list_catalog",
            description: "List all indexed official libraries and versions.",
            inputSchema: {
              type: "object",
              properties: {},
            },
          },
        ],
      },
    };
    process.stdout.write(JSON.stringify(res) + "\n");
    return;
  }

  if (method === "tools/call") {
    const { name, arguments: args } = params;
    if (name === "list_catalog") {
      const res = {
        jsonrpc: "2.0",
        id,
        result: {
          content: [
            {
              type: "text",
              text: JSON.stringify(OFFICIAL_LIBRARIES, null, 2),
            },
          ],
        },
      };
      process.stdout.write(JSON.stringify(res) + "\n");
      return;
    }

    if (name === "resolve_library_docs") {
      const q = args?.query || "";
      const lib = args?.library;
      const docs = engine.queryDocs({ query: q, library: lib });
      const res = {
        jsonrpc: "2.0",
        id,
        result: {
          content: [
            {
              type: "text",
              text: JSON.stringify(docs, null, 2),
            },
          ],
        },
      };
      process.stdout.write(JSON.stringify(res) + "\n");
      return;
    }
  }

  // Fallback response for unhandled RPC
  if (id !== undefined) {
    const res = {
      jsonrpc: "2.0",
      id,
      result: {},
    };
    process.stdout.write(JSON.stringify(res) + "\n");
  }
}

// Stdio JSON-RPC Loop
const readline = require("node:readline");
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false,
});

rl.on("line", (line: string) => {
  handleMessage(line).catch((err) => {
    console.error("[free-context7-mcp] Error:", err);
  });
});
