// SPDX-License-Identifier: MIT OR Apache-2.0
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { BunPlugin } from "bun";
import {
  buildModernWebSecurityHeaders,
  CORE_WEB_VITALS_BUDGET_2026,
  VERCEL_CACHE_POLICIES,
} from "../../../scripts/web-standards-vitals.ts";

const schemasDir = fileURLToPath(
  new URL(
    "../../../third_party/google/chrome-standards/schemas",
    import.meta.url,
  ),
);

export const MODERN_WEB_GUIDELINES_2026 = {
  version: "2026.1.0",
  wcagLevel: "2.2 AA/AAA",
  minTouchTargetPx: 24,
  securityIsolation: {
    coop: "same-origin",
    coep: "require-corp",
    corp: "same-origin",
    cspLevel: 3,
  },
  coreWebVitalsBudget: CORE_WEB_VITALS_BUDGET_2026,
  vercelEdgePolicies: VERCEL_CACHE_POLICIES,
} as const;

export interface WebGuidelineEntry {
  readonly id: string;
  readonly domain:
    "W3C" | "WHATWG" | "Chromium" | "GoogleStyle" | "Vercel" | "OWASP";
  readonly title: string;
  readonly requirement: string;
  readonly verificationMethod: string;
}

export const WEB_GUIDELINES_CATALOG_2026: readonly WebGuidelineEntry[] = [
  {
    id: "WG-01",
    domain: "Chromium",
    title: "Core Web Vitals 2026 Thresholds",
    requirement:
      "LCP <= 2500ms, INP <= 150ms (strict) / 200ms (W3C), CLS <= 0.1, TTFB <= 50ms edge",
    verificationMethod: "W3C PerformanceObserver + Server-Timing header",
  },
  {
    id: "WG-02",
    domain: "W3C",
    title: "WCAG 2.2 AA/AAA Semantic Landmarks & Skip Links",
    requirement:
      "Mandatory <main>, <nav>, <header>, <footer> landmarks, skip-to-content link, and >= 4.5:1 / 7:1 contrast",
    verificationMethod: "Lighthouse Accessibility 100/100 gate",
  },
  {
    id: "WG-03",
    domain: "WHATWG",
    title: "Speculation Rules API Prefetch & Prerender",
    requirement:
      'Inject <script type="speculationrules"> for instant document navigation in Chromium 144+',
    verificationMethod: "Document head inspection",
  },
  {
    id: "WG-04",
    domain: "OWASP",
    title: "Cross-Origin Isolation & Strict CSP Level 3",
    requirement:
      "COOP: same-origin, COEP: require-corp, HSTS preload, X-Content-Type-Options: nosniff, CSP3",
    verificationMethod: "HTTP response header verification",
  },
  {
    id: "WG-05",
    domain: "Vercel",
    title: "Edge Stale-While-Revalidate & ETag Conditional Requests",
    requirement:
      "Cache-Control s-maxage + stale-while-revalidate and deterministic SHA-256 ETag 304 responses",
    verificationMethod: "If-None-Match 304 roundtrip test",
  },
  {
    id: "WG-06",
    domain: "W3C",
    title: "CSS View Transitions Level 2 & Color-Scheme Dark/Light",
    requirement:
      "@view-transition { navigation: auto; } and color-scheme: dark light for zero-flash rendering",
    verificationMethod: "Stylesheet & meta tag audit",
  },
];

export function loadMergedStandardsSchemas(): {
  googleChrome: unknown;
  mdnCompat: unknown;
  tc39: unknown;
  webassembly: unknown;
  mcp2026: unknown;
} {
  const readJson = (rel: string): unknown =>
    JSON.parse(readFileSync(join(schemasDir, rel), "utf8"));
  return {
    googleChrome: readJson("google-chrome/google-chrome-repos.current.json"),
    mdnCompat: readJson("mdn/mdn-compat.current.json"),
    tc39: readJson("tc39/tc39.current.json"),
    webassembly: readJson("webassembly/webassembly.current.json"),
    mcp2026: readJson("mcp/mcp-2026.current.json"),
  };
}

export { buildModernWebSecurityHeaders };

export const modernWebGuidelinesPlugin: BunPlugin = {
  name: "yolo-bun-modern-web-guidelines",
  setup(build) {
    build.onResolve({ filter: /^yolo-bun:web-guidelines$/ }, () => ({
      path: "web-guidelines",
      namespace: "yolo-bun",
    }));
    build.onLoad({ filter: /^web-guidelines$/, namespace: "yolo-bun" }, () => {
      const payload = {
        guidelines: MODERN_WEB_GUIDELINES_2026,
        catalog: WEB_GUIDELINES_CATALOG_2026,
        schemas: loadMergedStandardsSchemas(),
      };
      return {
        contents: `export const webGuidelines = ${JSON.stringify(payload)};\nexport default webGuidelines;\n`,
        loader: "js",
      };
    });
  },
};
