// SPDX-License-Identifier: Apache-2.0
import { describe, expect, test } from "bun:test";
import { reEngine, GOOGLE_RE_TARGETS } from "../src/index.ts";

describe("google-replica-skills: REA, Replica M3 Parity & Binary Reverse Engineering for Google", () => {
  test("catalogs exact Google Windows binaries, Web stacks, and gVisor kernel", () => {
    expect(GOOGLE_RE_TARGETS.length).toBeGreaterThanOrEqual(4);
    const gemini = reEngine.analyzeTarget("Gemini Desktop");
    expect(gemini).toBeDefined();
    expect(gemini?.framework).toContain("Electron");
    expect(gemini?.reconFeatures.some((f) => f.includes("DPAPI"))).toBe(true);

    const agy = reEngine.analyzeTarget("Antigravity CLI");
    expect(agy).toBeDefined();
    expect(agy?.framework).toContain("Rust");

    const gvisor = reEngine.analyzeTarget("gVisor");
    expect(gvisor).toBeDefined();
    expect(gvisor?.type).toBe("kernel_sandbox");
  });

  test("executes 5-stage REA reverse engineering pipeline and Replica M3 parity audit", () => {
    const stages = reEngine.runReaPipeline("Gemini Desktop");
    expect(stages.length).toBe(5);
    expect(stages[0].stage).toBe("magika_identify");
    expect(stages[4].stage).toBe("gpui_migration_plan");

    const parity = reEngine.evaluateReplicaM3Parity("Gemini Web App");
    expect(parity.wcagLevel).toBe("AAA");
    expect(parity.m3TokenParityPercent).toBeGreaterThan(99);
    expect(parity.obscuraPixelDiffRatio).toBeLessThan(0.01);
  });

  test("generates comprehensive RE triage report", () => {
    const report = reEngine.generateReReport();
    expect(report.engine).toContain("yolo-re-core");
    expect(report.targetsAnalyzed).toBe(GOOGLE_RE_TARGETS.length);
    expect(report.reaPipelineStages.length).toBe(5);
  });
});
