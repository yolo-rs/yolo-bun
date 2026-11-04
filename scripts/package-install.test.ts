import { describe, expect, test } from "bun:test";
import { executePlan, planInstall } from "./package-install";
import { planResolution } from "./package-resolve";

describe("package install adapters", () => {
  test("preserves native package syntax and scope", () => {
    expect(planInstall("bun", "@scope/tool@1.2.3").args).toEqual([
      "add",
      "--global",
      "@scope/tool@1.2.3",
    ]);
    expect(planInstall("uv", "ruff==0.12.0").args).toEqual([
      "tool",
      "install",
      "ruff==0.12.0",
    ]);
    expect(planInstall("cargo", "ripgrep@14.1.1").args).toEqual([
      "install",
      "--locked",
      "ripgrep@14.1.1",
    ]);
    expect(planInstall("flatpak", "org.gimp.GIMP").args).toEqual([
      "install",
      "--user",
      "flathub",
      "org.gimp.GIMP",
    ]);
    expect(planInstall("winget", "Git.Git").args).toEqual([
      "install",
      "--id",
      "Git.Git",
      "--exact",
      "--source",
      "winget",
    ]);
    expect(planInstall("pacman", "core/openssh").args).toEqual([
      "-S",
      "--needed",
      "core/openssh",
    ]);
    expect(planInstall("vcpkg", "curl[ssl,http2]:x64-windows").args).toEqual([
      "install",
      "--classic",
      "curl[ssl,http2]:x64-windows",
    ]);
  });
  test("rejects options, shell syntax and unsupported backends", () => {
    expect(() => planInstall("cargo", "--force")).toThrow();
    expect(() => planInstall("bun", "name;other")).toThrow();
    expect(() => planInstall("flatpak", "--system")).toThrow();
    expect(() => planInstall("winget", "Git.Git@latest")).toThrow();
    expect(() => planInstall("vcpkg", "zlib:--triplet")).toThrow();
    expect(() => planInstall("fdroid", "org.example.App")).toThrow();
  });
  test("executes an argument literally and propagates the child exit code", async () => {
    expect(
      await executePlan({
        executable: process.execPath,
        args: [
          "-e",
          "process.exit(process.argv[1] === 'a; b' ? 0 : 7)",
          "--",
          "a; b",
        ],
      }),
    ).toBe(0);
    expect(
      await executePlan({
        executable: process.execPath,
        args: ["-e", "process.exit(23)"],
      }),
    ).toBe(23);
  });
  test("reports an unavailable executable", async () => {
    await expect(
      executePlan({
        executable: "yolo-test-nonexistent-backend-48207",
        args: [],
      }),
    ).rejects.toThrow("Backend executable not found");
  });
  test("resolution delegates to the native vcpkg dry-run", () => {
    expect(planResolution("vcpkg", "zlib:x64-windows").args).toEqual([
      "install",
      "--classic",
      "--dry-run",
      "zlib:x64-windows",
    ]);
    expect(() => planResolution("cargo", "ripgrep")).toThrow("not implemented");
    expect(() => planResolution("vcpkg", "--recurse")).toThrow();
    expect(planResolution("bun", "cowsay@1.6.0").args).toEqual([
      "add",
      "--global",
      "--dry-run",
      "cowsay@1.6.0",
    ]);
  });
});
