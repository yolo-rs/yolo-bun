import { expect, test } from "bun:test";
import { makeImagePlan } from "./image-plan";

const artifact = {
  id: "bun",
  backend: "bun",
  version: "1.4.4",
  url: "https://example.org/bun",
  sha256: "a".repeat(64),
};
test("plans are deterministic independent of input order", () => {
  const second = { ...artifact, id: "zlib", backend: "pacman" };
  const profile = {
    schemaVersion: 1,
    profile: "base",
    target: "x86_64-linux",
    artifacts: [artifact, second],
  };
  expect(makeImagePlan(profile)).toEqual(
    makeImagePlan({ ...profile, artifacts: [second, artifact] }),
  );
});
test("rejects floating versions, invalid hashes and duplicate IDs", () => {
  const profile = {
    schemaVersion: 1,
    profile: "base",
    target: "x86_64-linux",
    artifacts: [artifact],
  };
  expect(() =>
    makeImagePlan({
      ...profile,
      artifacts: [{ ...artifact, version: "^1.0" }],
    }),
  ).toThrow();
  expect(() =>
    makeImagePlan({ ...profile, artifacts: [{ ...artifact, sha256: "bad" }] }),
  ).toThrow();
  expect(() =>
    makeImagePlan({ ...profile, artifacts: [artifact, artifact] }),
  ).toThrow();
});
