// Copyright 2026 Google LLC
// SPDX-License-Identifier: Apache-2.0

import {
  readdirSync,
  statSync,
  readFileSync,
  existsSync,
  writeFileSync,
} from "node:fs";
import { join, extname, relative, resolve } from "node:path";
import cachedGraph from "./bun-architecture-graph.json";

export interface CodebaseNode {
  id: string;
  name: string;
  kind: "crate" | "module" | "file" | "api" | "kernel";
  subsystem: string;
  path: string;
  language: string;
  sizeBytes: number;
  dependencies: string[];
}

export interface CodebaseEdge {
  source: string;
  target: string;
  relation: "imports" | "links" | "subsystem_of" | "calls_kernel";
}

export interface BunCodebaseGraph {
  generatedAt: string;
  bunVersion: string;
  totalNodes: number;
  totalEdges: number;
  workspaceCrateCount: number;
  subsystems: string[];
  nodes: CodebaseNode[];
  edges: CodebaseEdge[];
}

const DEFAULT_GRAPH_PATH = resolve(
  import.meta.dir,
  "bun-architecture-graph.json",
);

function parseCargoDependencies(cargoTomlPath: string): string[] {
  if (!existsSync(cargoTomlPath)) return [];
  try {
    const raw = readFileSync(cargoTomlPath, "utf-8");
    const deps: string[] = [];
    const lines = raw.split(/\r?\n/);
    let inDeps = false;
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("[")) {
        inDeps =
          trimmed === "[dependencies]" ||
          trimmed === "[build-dependencies]" ||
          trimmed.endsWith(".dependencies]");
        continue;
      }
      if (inDeps && trimmed && !trimmed.startsWith("#")) {
        const match = /^([a-zA-Z0-9_-]+)\s*=/.exec(trimmed);
        if (match && match[1]) {
          deps.push(match[1]);
        }
      }
    }
    return Array.from(new Set(deps));
  } catch {
    return [];
  }
}

function parseWorkspaceMembers(rootCargoToml: string): string[] {
  if (!existsSync(rootCargoToml)) return [];
  try {
    const raw = readFileSync(rootCargoToml, "utf-8");
    const membersBlock = /members\s*=\s*\[([\s\S]*?)\]/.exec(raw);
    if (!membersBlock || !membersBlock[1]) return [];
    const matches = membersBlock[1].matchAll(/"([^"]+)"/g);
    const list: string[] = [];
    for (const m of matches) {
      if (m[1]) list.push(m[1]);
    }
    return list;
  } catch {
    return [];
  }
}

export function buildBunCodebaseGraph(
  upstreamSrcDir: string,
): BunCodebaseGraph {
  const nodes: CodebaseNode[] = [];
  const edges: CodebaseEdge[] = [];

  if (!existsSync(upstreamSrcDir)) {
    return cachedGraph as unknown as BunCodebaseGraph;
  }

  const rootCargoToml = resolve(upstreamSrcDir, "..", "Cargo.toml");
  const workspaceMembers = parseWorkspaceMembers(rootCargoToml);

  const entries = readdirSync(upstreamSrcDir);

  for (const entry of entries) {
    const fullPath = join(upstreamSrcDir, entry);
    let s;
    try {
      s = statSync(fullPath);
    } catch {
      continue;
    }

    if (s.isDirectory()) {
      const cargoToml = join(fullPath, "Cargo.toml");
      const crateDeps = parseCargoDependencies(cargoToml);

      let subsystemBytes = 0;
      const subFileNodes: CodebaseNode[] = [];

      try {
        const subFiles = readdirSync(fullPath);
        for (const f of subFiles) {
          const filePath = join(fullPath, f);
          const fsStat = statSync(filePath);
          if (fsStat.isFile()) {
            subsystemBytes += fsStat.size;
            const ext = extname(f).toLowerCase();
            const fileId = `file:${entry}/${f}`;
            subFileNodes.push({
              id: fileId,
              name: f,
              kind: "file",
              subsystem: entry,
              path: relative(upstreamSrcDir, filePath).replace(/\\/g, "/"),
              language:
                ext === ".rs"
                  ? "Rust"
                  : ext === ".cpp" || ext === ".h" || ext === ".c"
                    ? "C/C++ JSC"
                    : ext === ".ts" || ext === ".js"
                      ? "TypeScript"
                      : ext === ".toml"
                        ? "TOML"
                        : ext || "text",
              sizeBytes: fsStat.size,
              dependencies: [],
            });
          }
        }
      } catch {
        // Ignore inaccessible subdirectory
      }

      const subsystemId = `subsystem:${entry}`;
      const subsystemNode: CodebaseNode = {
        id: subsystemId,
        name: entry,
        kind: "crate",
        subsystem: entry,
        path: relative(upstreamSrcDir, fullPath).replace(/\\/g, "/"),
        language: existsSync(cargoToml)
          ? "Rust Crate"
          : "C++ JSC / TS Subsystem",
        sizeBytes: subsystemBytes,
        dependencies: crateDeps,
      };
      nodes.push(subsystemNode);

      for (const dep of crateDeps) {
        const normalizedDep = dep.replace(/^bun_/, "");
        edges.push({
          source: subsystemId,
          target: `subsystem:${normalizedDep}`,
          relation: "links",
        });
      }

      for (const fn of subFileNodes) {
        nodes.push(fn);
        edges.push({
          source: fn.id,
          target: subsystemId,
          relation: "subsystem_of",
        });
      }
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    bunVersion: "1.4.4",
    totalNodes: nodes.length,
    totalEdges: edges.length,
    workspaceCrateCount: workspaceMembers.length || 134,
    subsystems: Array.from(new Set(nodes.map((n) => n.subsystem))),
    nodes,
    edges,
  };
}

export function loadBunCodebaseGraph(): BunCodebaseGraph {
  try {
    if (existsSync(DEFAULT_GRAPH_PATH)) {
      const raw = readFileSync(DEFAULT_GRAPH_PATH, "utf-8");
      return JSON.parse(raw) as BunCodebaseGraph;
    }
    return cachedGraph as unknown as BunCodebaseGraph;
  } catch {
    return cachedGraph as unknown as BunCodebaseGraph;
  }
}

export function queryBunCodebaseGraph(
  query: string,
  limit = 25,
): {
  query: string;
  matchedNodes: CodebaseNode[];
  relatedEdges: CodebaseEdge[];
} {
  const graph = loadBunCodebaseGraph();
  const q = query.trim().toLowerCase();
  const matchedNodes = graph.nodes
    .filter(
      (n) =>
        n.name.toLowerCase().includes(q) ||
        n.subsystem.toLowerCase().includes(q) ||
        n.path.toLowerCase().includes(q) ||
        n.dependencies.some((d) => d.toLowerCase().includes(q)),
    )
    .slice(0, limit);

  const matchedIds = new Set(matchedNodes.map((n) => n.id));
  const relatedEdges = graph.edges
    .filter((e) => matchedIds.has(e.source) || matchedIds.has(e.target))
    .slice(0, limit * 2);

  return {
    query,
    matchedNodes,
    relatedEdges,
  };
}

export function exportGraphJson(
  graph: BunCodebaseGraph,
  destPath = DEFAULT_GRAPH_PATH,
): void {
  writeFileSync(destPath, JSON.stringify(graph, null, 2), "utf-8");
}
