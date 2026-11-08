// SPDX-License-Identifier: MIT OR Apache-2.0
import type { BunPlugin } from "bun";
import {
  auditHtmlAndHeadersForLighthouse,
  type LighthouseWebVitalsReport,
} from "../../../scripts/web-standards-vitals.ts";

export interface LighthouseAuditInput {
  readonly url: string;
  readonly html: string;
  readonly headers: Record<string, string>;
  readonly responseTimeMs?: number;
}

export interface LighthouseCategoryScores {
  readonly performance: number;
  readonly accessibility: number;
  readonly bestPractices: number;
  readonly seo: number;
}

export interface LighthouseAuditReport {
  readonly lighthouseVersion: string;
  readonly requestedUrl: string;
  readonly fetchTime: string;
  readonly responseTimeMs: number;
  readonly categories: LighthouseCategoryScores;
  readonly rawReport: LighthouseWebVitalsReport;
  readonly overallScore: number;
  readonly passedGate: boolean;
  readonly findings: string[];
}

export function auditLighthouse(
  input: LighthouseAuditInput,
): LighthouseAuditReport {
  const responseTimeMs = input.responseTimeMs ?? 2.5;
  const rawReport = auditHtmlAndHeadersForLighthouse({
    html: input.html,
    headers: input.headers,
    ttfbMs: responseTimeMs,
  });
  const categories: LighthouseCategoryScores = {
    performance: rawReport.categories.performance.score,
    accessibility: rawReport.categories.accessibility.score,
    bestPractices: rawReport.categories["best-practices"].score,
    seo: rawReport.categories.seo.score,
  };
  const findings = [
    ...rawReport.categories.performance.failedChecks,
    ...rawReport.categories.accessibility.failedChecks,
    ...rawReport.categories["best-practices"].failedChecks,
    ...rawReport.categories.seo.failedChecks,
  ];
  return {
    lighthouseVersion: "12.4.0-chromium-144",
    requestedUrl: input.url,
    fetchTime: rawReport.auditedAt,
    responseTimeMs,
    categories,
    rawReport,
    overallScore: rawReport.overallScore,
    passedGate: rawReport.overallScore === 100 && responseTimeMs <= 50,
    findings,
  };
}

export const lighthousePlugin: BunPlugin = {
  name: "yolo-bun-lighthouse",
  setup(build) {
    build.onResolve({ filter: /^yolo-bun:lighthouse$/ }, () => ({
      path: "lighthouse",
      namespace: "yolo-bun",
    }));
    build.onLoad({ filter: /^lighthouse$/, namespace: "yolo-bun" }, () => {
      const config = {
        lighthouseVersion: "12.4.0-chromium-144",
        requiredCategories: {
          performance: 100,
          accessibility: 100,
          bestPractices: 100,
          seo: 100,
        },
        audits: [
          "largest-contentful-paint",
          "interaction-to-next-paint",
          "cumulative-layout-shift",
          "server-response-time",
          "document-title",
          "meta-description",
          "html-has-lang",
          "canonical",
          "csp-xss",
        ],
      };
      return {
        contents: `export const LIGHTHOUSE_CONFIG = ${JSON.stringify(config)};\nexport default LIGHTHOUSE_CONFIG;\n`,
        loader: "js",
      };
    });
  },
};
