#!/usr/bin/env bun
import { resolve } from "node:path";
import { McpServer, serveStdio } from "@modelcontextprotocol/server";
import * as z from "zod/v4";

const root = resolve(import.meta.dir, "../../..");

function createServer() {
  const server = new McpServer({ name: "yolo-bun", version: "0.1.0" });

  server.registerTool(
    "list_bun_projects",
    {
      description: "List source-linked Bun runtime, integration, and target projects from the local catalog.",
      inputSchema: z.object({ kind: z.string().optional() }),
    },
    async ({ kind }) => {
      const catalog = await Bun.file(resolve(root, "catalog/projects.json")).json();
      const projects = Array.isArray(catalog.projects)
        ? catalog.projects.filter((project: { kind?: string }) => !kind || project.kind === kind)
        : [];
      return { content: [{ type: "text", text: JSON.stringify(projects, null, 2) }] };
    },
  );

  server.registerTool(
    "get_bun_upstream",
    {
      description: "Return the exact upstream Bun commit and source roles pinned by yolo-bun.",
      inputSchema: z.object({}),
    },
    async () => {
      const lock = await Bun.file(resolve(root, "source-lock.json")).json();
      return { content: [{ type: "text", text: JSON.stringify(lock, null, 2) }] };
    },
  );

  return server;
}

void serveStdio(createServer);
console.error("yolo-bun MCP server ready on stdio");
