// Copyright 2026 Google LLC
// SPDX-License-Identifier: Apache-2.0

import { readdirSync, statSync, readFileSync, existsSync } from "node:fs";
import { join, extname, relative } from "node:path";
import { nativeCosineSimilarity } from "../../core/src/index.ts";

export interface CodeChunk {
  filePath: string;
  extension: string;
  sizeBytes: number;
  content: string;
}

export interface DatasetStats {
  totalFiles: number;
  totalBytes: number;
  byExtension: Record<string, number>;
}

const SUPPORTED_EXTS = new Set([
  ".rs",
  ".zig",
  ".cpp",
  ".cc",
  ".c",
  ".h",
  ".hpp",
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".toml",
  ".md",
  ".json",
]);

const IGNORED_DIRS = new Set([
  ".git",
  "node_modules",
  "target",
  "build",
  "dist",
  ".cache",
  "vendor",
]);

export function crawlSourceTree(
  rootDir: string,
  maxFiles = 50000,
  maxFileSizeBytes = 512 * 1024,
): { chunks: CodeChunk[]; stats: DatasetStats } {
  const chunks: CodeChunk[] = [];
  const stats: DatasetStats = {
    totalFiles: 0,
    totalBytes: 0,
    byExtension: {},
  };

  if (!existsSync(rootDir)) {
    return { chunks, stats };
  }

  function walk(currentDir: string): void {
    if (chunks.length >= maxFiles) return;

    let entries: string[];
    try {
      entries = readdirSync(currentDir);
    } catch {
      return;
    }

    for (const entry of entries) {
      if (IGNORED_DIRS.has(entry)) continue;
      const fullPath = join(currentDir, entry);

      let s;
      try {
        s = statSync(fullPath);
      } catch {
        continue;
      }

      if (s.isDirectory()) {
        walk(fullPath);
      } else if (s.isFile()) {
        const ext = extname(entry).toLowerCase();
        if (SUPPORTED_EXTS.has(ext) && s.size <= maxFileSizeBytes) {
          try {
            const content = readFileSync(fullPath, "utf-8");
            chunks.push({
              filePath: relative(rootDir, fullPath).replace(/\\/g, "/"),
              extension: ext,
              sizeBytes: s.size,
              content,
            });
            stats.totalFiles += 1;
            stats.totalBytes += s.size;
            stats.byExtension[ext] = (stats.byExtension[ext] || 0) + 1;
          } catch {
            // Skip unreadable or binary file
          }
        }
      }
    }
  }

  walk(rootDir);
  return { chunks, stats };
}

/**
 * Compute deterministic 64-dimensional character n-gram embedding for zero-copy Rust RAG scoring
 */
export function computeTextEmbedding64(text: string): Float32Array {
  const vec = new Float32Array(64);
  const clean = text.toLowerCase();
  for (let i = 0; i < clean.length - 2; i++) {
    const c0 = clean.charCodeAt(i);
    const c1 = clean.charCodeAt(i + 1);
    const c2 = clean.charCodeAt(i + 2);
    const bucket = ((c0 * 31 + c1) * 31 + c2) & 63;
    vec[bucket] += 1.0;
  }
  return vec;
}

/**
 * Rank code chunks against a query using bare-metal Rust `carbon_cosine_similarity`
 */
export function rankCodeChunksWithRustRag(
  query: string,
  chunks: CodeChunk[],
  topK = 5,
): Array<{
  filePath: string;
  score: number;
  extension: string;
  sizeBytes: number;
}> {
  const qVec = computeTextEmbedding64(query);
  const scored = chunks.map((c) => {
    const cVec = computeTextEmbedding64(
      `${c.filePath}\n${c.content.slice(0, 2048)}`,
    );
    const score = nativeCosineSimilarity(qVec, cVec);
    return {
      filePath: c.filePath,
      score,
      extension: c.extension,
      sizeBytes: c.sizeBytes,
    };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
}

export function formatGemmaInstructionPair(chunk: CodeChunk): {
  instruction: string;
  input: string;
  output: string;
} {
  return {
    instruction: `Analyze, explain, or refactor the following Upstream Bun source file (${chunk.filePath}):`,
    input: chunk.content.slice(0, 4096),
    output: `File: ${chunk.filePath} (${chunk.extension})\nLanguage: ${chunk.extension.slice(1).toUpperCase()}\nSize: ${chunk.sizeBytes} bytes.\nArchitecture context: Part of high-performance Bun v1.4.4+ runtime and zero-copy bare-metal execution pipeline.`,
  };
}
