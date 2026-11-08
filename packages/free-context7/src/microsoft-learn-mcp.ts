// SPDX-License-Identifier: Apache-2.0
/**
 * Microsoft Learn MCP Server (Bun Native, Zero-Dependency, Direct Fetch & Parse).
 * Provides deep research access to Microsoft Learn documentation, .NET, Win32 APIs, Azure and WSL guides.
 */

async function searchMicrosoftLearn(query: string, locale: string = "en-us"): Promise<any[]> {
  try {
    const url = `https://learn.microsoft.com/api/search?search=${encodeURIComponent(query)}&locale=${locale}&$top=5`;
    const resp = await fetch(url, {
      headers: {
        "User-Agent": "Antigravity-Research/1.0",
        "Accept": "application/json",
      },
    });
    if (!resp.ok) {
      return [{ title: "Error", url: "", description: `Failed to query Microsoft Learn: ${resp.statusText}` }];
    }
    const data: any = await resp.json();
    return (data.results || []).map((r: any) => ({
      title: r.title,
      url: r.url,
      description: r.description,
      lastUpdated: r.lastUpdatedDate,
    }));
  } catch (err: any) {
    return [{ error: err?.message || String(err) }];
  }
}

async function fetchDocArticle(url: string): Promise<string> {
  try {
    const resp = await fetch(url, {
      headers: {
        "User-Agent": "Antigravity-Research/1.0",
        "Accept": "text/html,application/xhtml+xml",
      },
    });
    if (!resp.ok) return `Failed to fetch article: ${resp.statusText}`;
    const text = await resp.text();
    // Simple fast text extraction for LLM consumption
    return text.replace(/<[^>]*>?/gm, " ").replace(/\s+/g, " ").slice(0, 8000);
  } catch (err: any) {
    return `Error fetching doc: ${err?.message || String(err)}`;
  }
}

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
        serverInfo: { name: "microsoft-learn", version: "1.0.0" },
      },
    };
    process.stdout.write(JSON.stringify(res) + "\n");
    return;
  }

  if (method === "notifications/initialized") return;

  if (method === "tools/list") {
    const res = {
      jsonrpc: "2.0",
      id,
      result: {
        tools: [
          {
            name: "search_microsoft_learn",
            description: "Search official Microsoft Learn documentation (Win32, .NET, Azure, WSL, PowerShell, C#).",
            inputSchema: {
              type: "object",
              properties: {
                query: {
                  type: "string",
                  description: "Search keyword or topic.",
                },
                locale: {
                  type: "string",
                  description: "Locale (default: en-us).",
                  default: "en-us",
                },
              },
              required: ["query"],
            },
          },
          {
            name: "get_microsoft_learn_article",
            description: "Retrieve content of an official Microsoft Learn doc page.",
            inputSchema: {
              type: "object",
              properties: {
                url: {
                  type: "string",
                  description: "Exact Microsoft Learn URL.",
                },
              },
              required: ["url"],
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
    if (name === "search_microsoft_learn") {
      const results = await searchMicrosoftLearn(args?.query, args?.locale);
      const res = {
        jsonrpc: "2.0",
        id,
        result: {
          content: [{ type: "text", text: JSON.stringify(results, null, 2) }],
        },
      };
      process.stdout.write(JSON.stringify(res) + "\n");
      return;
    }

    if (name === "get_microsoft_learn_article") {
      const content = await fetchDocArticle(args?.url);
      const res = {
        jsonrpc: "2.0",
        id,
        result: {
          content: [{ type: "text", text: content }],
        },
      };
      process.stdout.write(JSON.stringify(res) + "\n");
      return;
    }
  }

  if (id !== undefined) {
    const res = { jsonrpc: "2.0", id, result: {} };
    process.stdout.write(JSON.stringify(res) + "\n");
  }
}

const readline = require("node:readline");
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false,
});

rl.on("line", (line: string) => {
  handleMessage(line).catch((err) => {
    console.error("[microsoft-learn-mcp] Error:", err);
  });
});
