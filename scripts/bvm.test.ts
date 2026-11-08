import { describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  discoverHostBunCandidates,
  resolveSlotForDirectory,
  setupBvmAndAliases,
  switchBunVersion,
} from "./bvm.ts";

describe("BVM (Bun Version Manager & Unified Alias System)", () => {
  test("discovers stable, canary, and custom-aot Bun slots on host", () => {
    const candidates = discoverHostBunCandidates();
    expect(Object.keys(candidates)).toEqual(["canary", "stable", "custom-aot"]);

    expect(existsSync(candidates.stable.path)).toBe(true);
    expect(existsSync(candidates.canary.path)).toBe(true);
    expect(existsSync(candidates["custom-aot"].path)).toBe(true);
  });

  test("sets up isolated BVM version slots and switches cleanly between stable and canary", () => {
    const tempRoot = mkdtempSync(join(tmpdir(), "yolo-bvm-test-"));
    const tempRepo = mkdtempSync(join(tmpdir(), "yolo-repo-test-"));
    try {
      const state = setupBvmAndAliases({
        bvmRoot: tempRoot,
        yoloRepoRoot: tempRepo,
      });

      expect(state.activeSlot).toBe("canary");
      expect(existsSync(join(tempRoot, "state.json"))).toBe(true);
      expect(existsSync(join(tempRepo, "bin", "yolo.cmd"))).toBe(true);
      expect(existsSync(join(tempRepo, "bin", "bun.cmd"))).toBe(true);
      expect(existsSync(join(tempRepo, "bin", ".bun.cmd"))).toBe(true);

      const switchedStable = switchBunVersion("stable", {
        bvmRoot: tempRoot,
        yoloRepoRoot: tempRepo,
      });
      expect(switchedStable.activeSlot).toBe("stable");
      expect(switchedStable.slots.stable.version).toContain("1.4.4");

      const switchedCanary = switchBunVersion("canary", {
        bvmRoot: tempRoot,
        yoloRepoRoot: tempRepo,
      });
      expect(switchedCanary.activeSlot).toBe("canary");
      expect(switchedCanary.slots.canary.version).toContain("canary");
    } finally {
      rmSync(tempRoot, { recursive: true, force: true });
      rmSync(tempRepo, { recursive: true, force: true });
    }
  });

  test("resolves directory-specific version overrides (.bun-version and packageManager)", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "yolo-bvm-dir-"));
    const tempBvm = mkdtempSync(join(tmpdir(), "yolo-bvm-state-"));
    const tempRepo = mkdtempSync(join(tmpdir(), "yolo-repo-state-"));
    try {
      setupBvmAndAliases({
        bvmRoot: tempBvm,
        yoloRepoRoot: tempRepo,
      });

      // package.json with stable packageManager
      writeFileSync(
        join(tempDir, "package.json"),
        JSON.stringify({ name: "test-pkg", packageManager: "bun@1.4.4" }),
        "utf8",
      );
      expect(resolveSlotForDirectory(tempDir, tempBvm).slot).toBe("stable");

      // .bun-version overrides package.json
      writeFileSync(join(tempDir, ".bun-version"), "custom-aot\n", "utf8");
      expect(resolveSlotForDirectory(tempDir, tempBvm).slot).toBe("custom-aot");

      // .bun-version canary
      writeFileSync(join(tempDir, ".bun-version"), "canary\n", "utf8");
      expect(resolveSlotForDirectory(tempDir, tempBvm).slot).toBe("canary");
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
      rmSync(tempBvm, { recursive: true, force: true });
      rmSync(tempRepo, { recursive: true, force: true });
    }
  });

  test("unified yolo.ts CLI handles bvm, --as-bun, and pkg subcommands", () => {
    const bvmStatus = Bun.spawnSync(
      [process.execPath, "run", "C:/src/yolo/scripts/yolo.ts", "bvm", "list"],
      { cwd: "C:/src/yolo", stdout: "pipe", stderr: "pipe" },
    );
    expect(bvmStatus.exitCode).toBe(0);
    const out = JSON.parse(bvmStatus.stdout.toString());
    expect(out.activeSlot).toBeDefined();
    expect(out.slots.stable).toBeDefined();
    expect(out.slots.canary).toBeDefined();
    expect(out.slots["custom-aot"]).toBeDefined();

    const asBunRev = Bun.spawnSync(
      [
        process.execPath,
        "run",
        "C:/src/yolo/scripts/yolo.ts",
        "--as-bun",
        "--revision",
      ],
      { cwd: "C:/src/yolo", stdout: "pipe", stderr: "pipe" },
    );
    expect(asBunRev.exitCode).toBe(0);
    expect(asBunRev.stdout.toString().trim()).toContain("1.4.4");
  });
});
