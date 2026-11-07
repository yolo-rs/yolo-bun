import { describe, expect, test } from "bun:test";
import {
  executePlan,
  GOOGLEBOOK_2026_ANDROID_17_X64_PACKAGES,
  planFdroidCommand,
  planInstall,
  planManageCommand,
} from "./package-install";
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
    expect(planInstall("nix", "ripgrep").args).toEqual([
      "profile",
      "install",
      "nixpkgs#ripgrep",
    ]);
    expect(planInstall("nix", "nixpkgs#hello").args).toEqual([
      "profile",
      "install",
      "nixpkgs#hello",
    ]);
    expect(planInstall("vcpkg", "curl[ssl,http2]:x64-windows").args).toEqual([
      "install",
      "--classic",
      "curl[ssl,http2]:x64-windows",
    ]);
    expect(planInstall("fdroid", "org.adaway").args).toEqual([
      "install",
      "org.adaway",
    ]);
    expect(
      planInstall(
        "play-store",
        GOOGLEBOOK_2026_ANDROID_17_X64_PACKAGES.desktopPlay,
      ).args,
    ).toEqual([
      "--channel=3",
      "--install",
      "system-images;android-37.1;android-desktop;x86_64",
    ]);
    expect(
      planInstall(
        "play-store",
        GOOGLEBOOK_2026_ANDROID_17_X64_PACKAGES.playstoreTablet,
      ).args,
    ).toEqual([
      "--channel=0",
      "--install",
      "system-images;android-37.0;google_apis_playstore;x86_64",
    ]);
  });
  test("rejects options, shell syntax and unsupported backends", () => {
    expect(() => planInstall("cargo", "--force")).toThrow();
    expect(() => planInstall("bun", "name;other")).toThrow();
    expect(() => planInstall("flatpak", "--system")).toThrow();
    expect(() => planInstall("winget", "Git.Git@latest")).toThrow();
    expect(() => planInstall("nix", "--impure")).toThrow();
    expect(() => planInstall("vcpkg", "zlib:--triplet")).toThrow();
    expect(() => planInstall("fdroid", "--system")).toThrow();
    expect(() => planInstall("fdroid", "org.example.App;other")).toThrow();
    expect(() => planInstall("play-store", "--install")).toThrow();
    expect(() => planInstall("play-store", "bad;cmd")).toThrow();
  });
  test("maps F-Droid lifecycle commands to fdroidcl native operations", () => {
    expect(planFdroidCommand("search", ["adaway"]).args).toEqual([
      "search",
      "adaway",
    ]);
    expect(planFdroidCommand("show", ["org.adaway"]).args).toEqual([
      "show",
      "org.adaway",
    ]);
    expect(planFdroidCommand("update", []).args).toEqual(["update"]);
    expect(planFdroidCommand("install", ["org.adaway:105"]).args).toEqual([
      "install",
      "org.adaway:105",
    ]);
    expect(planFdroidCommand("upgrade", []).args).toEqual(["install", "-u"]);
    expect(planFdroidCommand("remove", ["org.adaway"]).args).toEqual([
      "uninstall",
      "org.adaway",
    ]);
    expect(planFdroidCommand("devices", []).args).toEqual(["devices"]);
    expect(planFdroidCommand("repos", []).args).toEqual(["repo"]);
  });
  test("keeps F-Droid inputs in literal argv slots and rejects options", () => {
    expect(planFdroidCommand("search", ["foo; echo unsafe"]).args).toEqual([
      "search",
      "foo; echo unsafe",
    ]);
    expect(() => planFdroidCommand("search", ["--config"])).toThrow();
    expect(() => planFdroidCommand("install", ["--system"])).toThrow();
    expect(() => planFdroidCommand("remove", ["org.example;echo"])).toThrow();
    expect(() => planFdroidCommand("upgrade", ["org.adaway"])).toThrow();
    expect(() =>
      planFdroidCommand("repo-add", ["evil", "https://example"]),
    ).toThrow();
  });
  test("maps native search and installed-list commands where supported", () => {
    expect(planManageCommand("cargo", "search", "serde").args).toEqual([
      "search",
      "serde",
    ]);
    expect(planManageCommand("flatpak", "search", "image editor").args).toEqual(
      ["search", "image editor"],
    );
    expect(planManageCommand("winget", "search", "Git.Git").args).toEqual([
      "search",
      "Git.Git",
      "--source",
      "winget",
    ]);
    expect(planManageCommand("pacman", "search", "^vim").args).toEqual([
      "-Ss",
      "^vim",
    ]);
    expect(planManageCommand("nix", "search", "ripgrep").args).toEqual([
      "search",
      "nixpkgs",
      "ripgrep",
    ]);
    expect(planManageCommand("vcpkg", "search", "zlib").args).toEqual([
      "search",
      "zlib",
    ]);
    expect(
      planManageCommand("cargo", "search", "serde; echo unsafe").args,
    ).toEqual(["search", "serde; echo unsafe"]);

    expect(planManageCommand("bun", "list").args).toEqual([
      "pm",
      "ls",
      "--global",
    ]);
    expect(planManageCommand("uv", "installed").args).toEqual(["tool", "list"]);
    expect(planManageCommand("cargo", "list").args).toEqual([
      "install",
      "--list",
    ]);
    expect(planManageCommand("flatpak", "list").args).toEqual([
      "list",
      "--user",
    ]);
    expect(planManageCommand("winget", "list").args).toEqual(["list"]);
    expect(planManageCommand("pacman", "list").args).toEqual(["-Q"]);
    expect(planManageCommand("nix", "list").args).toEqual(["profile", "list"]);
    expect(planManageCommand("vcpkg", "list").args).toEqual(["list"]);
    expect(planManageCommand("play-store", "list").args).toEqual([
      "--list_installed",
    ]);
  });
  test("maps package upgrades and removals with backend-native scope", () => {
    expect(planManageCommand("bun", "upgrade", "@scope/tool").args).toEqual([
      "update",
      "--global",
      "@scope/tool",
    ]);
    expect(planManageCommand("bun", "upgrade").args).toEqual([
      "update",
      "--global",
    ]);
    expect(planManageCommand("uv", "upgrade").args).toEqual([
      "tool",
      "upgrade",
      "--all",
    ]);
    expect(planManageCommand("cargo", "upgrade", "ripgrep").args).toEqual([
      "install",
      "--locked",
      "--force",
      "ripgrep",
    ]);
    expect(planManageCommand("flatpak", "upgrade").args).toEqual([
      "update",
      "--user",
    ]);
    expect(planManageCommand("winget", "upgrade").args).toEqual([
      "upgrade",
      "--all",
      "--source",
      "winget",
    ]);
    expect(planManageCommand("pacman", "upgrade").args).toEqual(["-Syu"]);
    expect(planManageCommand("nix", "upgrade").args).toEqual([
      "profile",
      "upgrade",
      "--all",
    ]);
    expect(planManageCommand("nix", "upgrade", "nixpkgs#ripgrep").args).toEqual(
      ["profile", "upgrade", "ripgrep"],
    );
    expect(planManageCommand("vcpkg", "upgrade").args).toEqual([
      "upgrade",
      "--no-dry-run",
    ]);
    expect(planManageCommand("play-store", "upgrade").args).toEqual([
      "--update",
    ]);

    expect(planManageCommand("bun", "remove", "@scope/tool").args).toEqual([
      "remove",
      "--global",
      "@scope/tool",
    ]);
    expect(planManageCommand("uv", "remove", "ruff").args).toEqual([
      "tool",
      "uninstall",
      "ruff",
    ]);
    expect(planManageCommand("cargo", "remove", "ripgrep").args).toEqual([
      "uninstall",
      "ripgrep",
    ]);
    expect(
      planManageCommand("flatpak", "remove", "org.gimp.GIMP").args,
    ).toEqual(["uninstall", "--user", "org.gimp.GIMP"]);
    expect(planManageCommand("winget", "remove", "Git.Git").args).toEqual([
      "uninstall",
      "--id",
      "Git.Git",
      "--exact",
      "--source",
      "winget",
    ]);
    expect(planManageCommand("pacman", "remove", "vim").args).toEqual([
      "-R",
      "vim",
    ]);
    expect(planManageCommand("nix", "remove", "ripgrep").args).toEqual([
      "profile",
      "remove",
      "ripgrep",
    ]);
    expect(planManageCommand("vcpkg", "remove", "zlib").args).toEqual([
      "remove",
      "zlib",
    ]);
    expect(
      planManageCommand(
        "play-store",
        "remove",
        GOOGLEBOOK_2026_ANDROID_17_X64_PACKAGES.desktopPlay,
      ).args,
    ).toEqual([
      "--uninstall",
      "system-images;android-37.1;android-desktop;x86_64",
    ]);
  });
  test("rejects unsupported queries, unsafe IDs, and misleading partial upgrades", () => {
    expect(() => planManageCommand("bun", "search", "react")).toThrow(
      "no package search command",
    );
    expect(() => planManageCommand("uv", "search", "ruff")).toThrow(
      "no package search command",
    );
    expect(() =>
      planManageCommand("play-store", "search", "android-37"),
    ).toThrow("no package search command");
    expect(() => planManageCommand("pacman", "upgrade", "vim")).toThrow(
      "system-wide",
    );
    expect(() =>
      planManageCommand(
        "play-store",
        "upgrade",
        GOOGLEBOOK_2026_ANDROID_17_X64_PACKAGES.desktopPlay,
      ),
    ).toThrow("all installed");
    expect(() => planManageCommand("vcpkg", "upgrade", "zlib")).toThrow(
      "all outdated",
    );
    expect(() => planManageCommand("winget", "remove", "--source")).toThrow();
    expect(() =>
      planManageCommand("cargo", "remove", "ripgrep;exit"),
    ).toThrow();
    expect(() => planManageCommand("flatpak", "search", "-system")).toThrow();
    expect(() => planManageCommand("fdroid", "upgrade")).toThrow(
      "yolo pkg fdroid",
    );
  });
  test("the CLI prints mutation plans without executing them by default", async () => {
    const child = Bun.spawn(
      [
        process.execPath,
        `${import.meta.dir}/yolo.ts`,
        "pkg",
        "manage",
        "pacman",
        "upgrade",
      ],
      { stdout: "pipe", stderr: "pipe" },
    );
    const output = await new Response(child.stdout).text();
    expect(await child.exited).toBe(0);
    expect(JSON.parse(output)).toMatchObject({
      action: "plan",
      backend: "pacman",
      args: ["-Syu"],
    });
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
    expect(planResolution("nix", "ripgrep").args).toEqual([
      "eval",
      "--raw",
      "nixpkgs#ripgrep.outPath",
    ]);
    expect(
      planResolution(
        "play-store",
        GOOGLEBOOK_2026_ANDROID_17_X64_PACKAGES.desktopPlay,
      ).args,
    ).toEqual([
      "--channel=3",
      "--list",
      "system-images;android-37.1;android-desktop;x86_64",
    ]);
  });
});
