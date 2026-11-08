// SPDX-License-Identifier: Apache-2.0
import { describe, expect, test } from "bun:test";
import {
  GOOGLE_STYLE_GUIDES_2026,
  OXC_AND_VERCEL_INTEGRATION_CATALOG,
  gts,
} from "../src/index.ts";

describe("@google-bun/gts-bun: 100% Native Bun Refactor of google/gts + zx + Oxc + Vercel Labs", () => {
  test("includes 2026 Google Style Guides across TS, Shell, Go, Python, Rust, Dart/Flutter, and Wiz/Angular", () => {
    expect(GOOGLE_STYLE_GUIDES_2026.length).toBeGreaterThanOrEqual(8);
    const langs = new Set(GOOGLE_STYLE_GUIDES_2026.map((r) => r.language));
    expect(langs.has("typescript")).toBe(true);
    expect(langs.has("shell")).toBe(true);
    expect(langs.has("go")).toBe(true);
    expect(langs.has("python")).toBe(true);
    expect(langs.has("rust")).toBe(true);
    expect(langs.has("dart-flutter")).toBe(true);
    expect(langs.has("angular-wiz")).toBe(true);
  });

  test("audits TypeScript and Shell code against Google Style Guide 2026 rules", () => {
    const cleanTs = "export const GOOGLE_PORT = 4040;\n";
    expect(gts.auditSourceCode(cleanTs, "typescript").compliant).toBe(true);

    const badTs = "var x = 1;\nexport default x;\n";
    const auditBad = gts.auditSourceCode(badTs, "typescript");
    expect(auditBad.compliant).toBe(false);
    expect(auditBad.violations.length).toBe(2);
  });

  test("catalogs forked Google, Oxc-Project, and Vercel-Labs repositories", () => {
    expect(
      OXC_AND_VERCEL_INTEGRATION_CATALOG.some(
        (r) => r.fullName === "google/gts",
      ),
    ).toBe(true);
    expect(
      OXC_AND_VERCEL_INTEGRATION_CATALOG.some(
        (r) => r.fullName === "oxc-project/oxc",
      ),
    ).toBe(true);
    expect(
      OXC_AND_VERCEL_INTEGRATION_CATALOG.some(
        (r) => r.fullName === "vercel-labs/agent-browser",
      ),
    ).toBe(true);
  });
});
