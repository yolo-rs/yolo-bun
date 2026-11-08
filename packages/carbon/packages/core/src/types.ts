// Copyright 2026 Google LLC
// SPDX-License-Identifier: Apache-2.0

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import fallbackData from "./data.json";

export interface NewsItem {
  id: string;
  date: string;
  category: "DeepMind" | "Vertex AI" | "gcloud" | "Gemini";
  title: string;
  summary: string;
  url: string;
}

export interface ChangelogItem {
  version: string;
  date: string;
  changes: string[];
}

export interface BestPracticeItem {
  category: string;
  rule: string;
  description: string;
}

export interface CliSetupStep {
  step: string;
  cmd: string;
}

export interface UpstreamCensus {
  ovenShRepos: string;
  bunRustCrates: string;
  googleRepos: string;
  googleDeepMindRepos: string;
  chromiumHeads: string;
  aospAndroid17: string;
}

export interface CarbonData {
  lastUpdated: string;
  version: string;
  engine: string;
  primaryRegion: string;
  globalRegions: string[];
  upstreamCensus: UpstreamCensus;
  news: NewsItem[];
  changelog: ChangelogItem[];
  bestPractices: BestPracticeItem[];
  gcloudCliSetup: CliSetupStep[];
}

const DATA_FILE = resolve(import.meta.dir, "data.json");

/* @__PURE__ */
export function loadCarbonData(): CarbonData {
  try {
    if (existsSync(DATA_FILE)) {
      const raw = readFileSync(DATA_FILE, "utf-8");
      return JSON.parse(raw) as CarbonData;
    }
    return fallbackData as CarbonData;
  } catch {
    return fallbackData as CarbonData;
  }
}

export function saveCarbonData(data: CarbonData): void {
  data.lastUpdated = new Date().toISOString();
  try {
    writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch {
    // Gracefully skip write when running inside read-only AoT binary
  }
}
