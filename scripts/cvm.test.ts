import { describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  auditWorkspaceChromiumAlignment,
  CHROMIUM_CHANNEL_PROFILES_2026,
  CHROMIUM_THIRD_PARTY_ALIGNMENT_MATRIX,
  resolveChromiumChannelForDirectory,
  switchChromiumChannel,
  UPSTREAM_ENGINES_MATRIX_2026,
} from "./cvm";

describe("CVM (Chromium Version Manager & 5-Engine Third-Party Alignment Matrix)", () => {
  test("analyzes all 5 upstream engines (Bun, Node.js, Electron, Chromium, CEF)", () => {
    expect(UPSTREAM_ENGINES_MATRIX_2026.map((e) => e.engine)).toEqual([
      "bun",
      "nodejs",
      "electron",
      "chromium",
      "cef",
    ]);

    const components = CHROMIUM_THIRD_PARTY_ALIGNMENT_MATRIX.map(
      (c) => c.component,
    );
    expect(components).toContain("v8");
    expect(components).toContain("dawn");
    expect(components).toContain("blink");
    expect(components).toContain("skia");
    expect(components).toContain("canvas");
    expect(components).toContain("cef");
    expect(components).toContain("harfbuzz");
    expect(components).toContain("boringssl");
  });

  test("switches cleanly between Chromium stable, dev, and canary channels and writes isolated manifests", () => {
    const tempCvm = mkdtempSync(join(tmpdir(), "yolo-cvm-test-"));
    const tempDir = mkdtempSync(join(tmpdir(), "yolo-cvm-dir-"));
    try {
      const stableRes = switchChromiumChannel("stable", { cvmRoot: tempCvm });
      expect(stableRes.state.activeChannel).toBe("stable");
      expect(stableRes.state.alignedBvmSlot).toBe("stable");
      expect(stableRes.profile.milestone).toBe(156);
      expect(
        existsSync(join(tempCvm, "channels", "stable", "channel-profile.json")),
      ).toBe(true);
      expect(
        existsSync(join(tempCvm, "channels", "dev", "channel-profile.json")),
      ).toBe(true);
      expect(
        existsSync(join(tempCvm, "channels", "canary", "channel-profile.json")),
      ).toBe(true);

      const devRes = switchChromiumChannel("dev", {
        cvmRoot: tempCvm,
        pinDirectory: tempDir,
      });
      expect(devRes.state.activeChannel).toBe("dev");
      expect(devRes.state.alignedBvmSlot).toBe("canary");
      expect(devRes.profile.milestone).toBe(157);
      expect(existsSync(join(tempDir, ".chromium-version"))).toBe(true);
      expect(resolveChromiumChannelForDirectory(tempDir, tempCvm).channel).toBe(
        "dev",
      );

      writeFileSync(join(tempDir, ".chromium-version"), "canary\n", "utf8");
      const canaryResolved = resolveChromiumChannelForDirectory(
        tempDir,
        tempCvm,
      );
      expect(canaryResolved.channel).toBe("canary");
      expect(canaryResolved.profile.milestone).toBe(158);
      expect(canaryResolved.profile.bunSlotMapping).toBe("custom-aot");
    } finally {
      rmSync(tempCvm, { recursive: true, force: true });
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test("audits all workspace crates and packages consuming V8, Dawn, Blink, Skia, Canvas, CEF, HarfBuzz, and BoringSSL", () => {
    for (const channel of ["stable", "dev", "canary"] as const) {
      const audit = auditWorkspaceChromiumAlignment(channel);
      expect(audit.channel).toBe(channel);
      expect(audit.profile).toEqual(CHROMIUM_CHANNEL_PROFILES_2026[channel]);
      expect(audit.totalComponents).toBeGreaterThanOrEqual(8);
      expect(audit.totalConsumersChecked).toBeGreaterThanOrEqual(14);
      expect(audit.alignedCount).toBe(audit.totalConsumersChecked);
    }
  });

  test("executes extracted Electron build-tools (`e` CLI), 3-way patch queue, DEPS roller, and CEF workflow", async () => {
    const {
      auditNodeBunV8BoringSslCoAbi,
      buildGitImportPatchesPlan,
      CEF_AUTOMATE_WORKFLOW_SPEC,
      ELECTRON_PATCH_CONFIG_TARGETS,
      executeElectronBuildToolsCommand,
      planChromiumRollerUpdate,
    } = await import("../packages/yolo-bun-plugin/src/index");

    expect(ELECTRON_PATCH_CONFIG_TARGETS.length).toBeGreaterThanOrEqual(4);
    const eSync = executeElectronBuildToolsCommand("sync", {
      profile: "testing",
    });
    expect(eSync.command).toBe("e sync");
    expect(eSync.threeWayMerge).toBe(true);

    const patchPlan = buildGitImportPatchesPlan({
      repo: "src/v8",
      patchDir: "src/electron/patches/v8",
      threeway: true,
    });
    expect(patchPlan.fastIndexFlags).toContain("index.skipHash=true");
    expect(patchPlan.gitAmArgs).toContain("--3way");

    const rollReport = planChromiumRollerUpdate({
      branch: "main",
      currentChromiumVersion: "156.0.7103.48",
      targetChannel: "canary",
      channels: {
        stable: "156.0.7103.48",
        beta: "157.0.7151.10",
        dev: "157.0.7151.14",
        canary: "158.0.7192.2",
      },
    });
    expect(rollReport.upgradeAvailable).toBe(true);
    expect(rollReport.targetChromiumVersion).toBe("158.0.7192.2");

    const coAbi = auditNodeBunV8BoringSslCoAbi();
    expect(coAbi.valid).toBe(true);
    expect(coAbi.v8EmbedderDataArraySize).toBe(40);
    expect(CEF_AUTOMATE_WORKFLOW_SPEC.orchestratorScript).toContain(
      "automate-git.py",
    );
  });
});
