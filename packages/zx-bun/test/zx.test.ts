// SPDX-License-Identifier: Apache-2.0
import { describe, expect, test } from "bun:test";
import { zx, GoogleShell } from "../src/index.ts";

describe("zx-bun: Native Google zx for Upstream Bun", () => {
  test("GoogleShell provides official 4-color ANSI formatting", () => {
    expect(GoogleShell.COLORS.blue).toBe("\x1b[38;2;66;133;244m");
    expect(GoogleShell.COLORS.red).toBe("\x1b[38;2;234;67;53m");
    expect(GoogleShell.COLORS.yellow).toBe("\x1b[38;2;251;188;4m");
    expect(GoogleShell.COLORS.green).toBe("\x1b[38;2;52;168;83m");

    const header = zx.formatHeader("GOOGLE INFRA");
    expect(header).toContain("GOOGLE INFRA");
    expect(header).toContain("\x1b[38;2;66;133;244m");

    const success = zx.formatSuccess("Connected");
    expect(success).toContain("✓ Connected");
  });

  test("runs local commands cleanly via Bun native shell", async () => {
    zx.setQuiet(true);
    const out = await zx.run("echo hello google bun");
    expect(out.exitCode).toBe(0);
    expect(out.stdout.trim()).toBe("hello google bun");
  });
});
