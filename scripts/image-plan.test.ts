import { expect, test } from "bun:test";
import { makeImagePlan } from "./image-plan";

const sources = [
  {
    id: "bun-registry",
    backend: "bun",
    kind: "registry",
    ref: "https://registry.npmjs.org/",
  },
  {
    id: "arch-core",
    backend: "pacman",
    kind: "repository",
    ref: "configured-pacman-repository:core",
  },
];
const artifact = {
  id: "bun",
  package: "bun",
  backend: "bun",
  source: "bun-registry",
  version: "1.4.4",
  url: "https://example.org/bun",
  sha256: "a".repeat(64),
};
const profile = {
  schemaVersion: 2,
  profile: "arch-base",
  target: {
    os: "linux",
    arch: "x86_64",
    distribution: "archlinux",
    channel: "stable",
    cpuTier: "generic",
  },
  sources,
  artifacts: [artifact],
};

test("plans are deterministic and retain target, source and native package IDs", () => {
  const second = {
    ...artifact,
    id: "zlib",
    package: "zlib",
    backend: "pacman",
    source: "arch-core",
  };
  const plan = makeImagePlan({ ...profile, artifacts: [artifact, second] });
  const reversed = makeImagePlan({
    ...profile,
    sources: [...sources].reverse(),
    artifacts: [second, artifact],
  });
  expect(plan).toEqual(reversed);
  expect(plan.target.os).toBe("linux");
  expect(plan.target.distribution).toBe("archlinux");
  expect(plan.sources.map((source) => source.id)).toEqual([
    "arch-core",
    "bun-registry",
  ]);
  expect(plan.artifacts[1]?.package).toBe("zlib");
  expect(plan.artifacts[1]?.source).toBe("arch-core");
});

test("rejects floating versions, invalid hashes and duplicate artifact IDs", () => {
  expect(() =>
    makeImagePlan({
      ...profile,
      artifacts: [{ ...artifact, version: "^1.0" }],
    }),
  ).toThrow();
  expect(() =>
    makeImagePlan({
      ...profile,
      artifacts: [{ ...artifact, sha256: "bad" }],
    }),
  ).toThrow();
  expect(() =>
    makeImagePlan({ ...profile, artifacts: [artifact, artifact] }),
  ).toThrow();
});

test("requires explicit source ownership and a structured platform profile", () => {
  expect(() => makeImagePlan({ ...profile, schemaVersion: 1 })).toThrow();
  expect(() => makeImagePlan({ ...profile, target: "x86_64-linux" })).toThrow();
  expect(() => makeImagePlan({ ...profile, sources: [] })).toThrow();
  expect(() =>
    makeImagePlan({
      ...profile,
      artifacts: [{ ...artifact, source: "missing" }],
    }),
  ).toThrow();
  expect(() =>
    makeImagePlan({
      ...profile,
      artifacts: [{ ...artifact, source: "arch-core" }],
    }),
  ).toThrow("matching source");
  expect(() =>
    makeImagePlan({
      ...profile,
      artifacts: [{ ...artifact, package: "bun@latest" }],
    }),
  ).toThrow("native package ID");
});

test("rejects malformed and credential-bearing URLs and empty image plans", () => {
  for (const url of [
    "https://",
    "https://user:password@example.org/file",
    "http://example.org/file",
  ]) {
    expect(() =>
      makeImagePlan({ ...profile, artifacts: [{ ...artifact, url }] }),
    ).toThrow();
  }
  expect(() => makeImagePlan({ ...profile, artifacts: [] })).toThrow();
  expect(() => makeImagePlan({ ...profile, profile: " " })).toThrow();
});

test("supports GoogleBook 2026 (Android 17 x64 + ChromiumOS + Aluminium OS) play-store, fdroid and nix profiles", () => {
  const googlebookProfile = {
    schemaVersion: 2,
    profile: "googlebook-2026-android17-x64",
    target: {
      os: "android",
      arch: "x86_64",
      distribution: "googlebook-aluminiumos-chromiumos",
      release: "17",
      channel: "canary",
      cpuTier: "x86_64-v3",
    },
    sources: [
      {
        id: "play-store-google-sdk",
        backend: "play-store",
        kind: "sdk-repository",
        ref: "https://dl.google.com/android/repository/sys-img/android-desktop/sys-img2-3.xml",
      },
      {
        id: "fdroid-main",
        backend: "fdroid",
        kind: "repository",
        ref: "https://f-droid.org/repo",
      },
      {
        id: "nix-nixpkgs",
        backend: "nix",
        kind: "flake",
        ref: "github:NixOS/nixpkgs/nixos-unstable",
      },
    ],
    artifacts: [
      {
        id: "android-desktop-play-x64",
        package: "system-images;android-37.1;android-desktop;x86_64",
        backend: "play-store",
        source: "play-store-google-sdk",
        version: "37.1.0-r1",
        url: "https://dl.google.com/android/repository/sys-img/android-desktop/x86_64-37.1_r01.zip",
        sha256: "b".repeat(64),
      },
      {
        id: "fdroid-client",
        package: "org.fdroid.fdroid",
        backend: "fdroid",
        source: "fdroid-main",
        version: "1.21.1",
        url: "https://f-droid.org/repo/org.fdroid.fdroid_1021050.apk",
        sha256: "c".repeat(64),
      },
      {
        id: "nix-ripgrep",
        package: "nixpkgs#ripgrep",
        backend: "nix",
        source: "nix-nixpkgs",
        version: "14.1.1",
        url: "https://cache.nixos.org/nar/ripgrep.nar.xz",
        sha256: "d".repeat(64),
      },
    ],
  };
  const plan = makeImagePlan(googlebookProfile);
  expect(plan.profile).toBe("googlebook-2026-android17-x64");
  expect(plan.target.os).toBe("android");
  expect(plan.artifacts.map((a) => a.backend)).toEqual([
    "play-store",
    "fdroid",
    "nix",
  ]);
});
