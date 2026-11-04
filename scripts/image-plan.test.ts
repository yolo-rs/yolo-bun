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
