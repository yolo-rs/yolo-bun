import { expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { makeImagePlan } from "./image-plan";
import { verifyImagePlan } from "./verify-image-plan";

test("verifies the actual bytes of a local artifact and rejects a mismatch", async () => {
  const path = fileURLToPath(new URL("./native-hash.ts", import.meta.url));
  const hash = createHash("sha256")
    .update(new Uint8Array(await Bun.file(path).arrayBuffer()))
    .digest("hex");
  const artifact = {
    id: "artifact",
    package: "bun",
    backend: "bun",
    source: "bun-registry",
    version: "1.0.0",
    url: "https://example.org/artifact",
    sha256: hash,
  };
  const profile = {
    schemaVersion: 2,
    profile: "test",
    target: { os: "linux", arch: "x86_64" },
    sources: [
      {
        id: "bun-registry",
        backend: "bun",
        kind: "registry",
        ref: "https://registry.npmjs.org/",
      },
    ],
    artifacts: [artifact],
  };
  const valid = await verifyImagePlan(makeImagePlan(profile), {
    artifact: path,
  });
  expect(valid.verified).toBe(true);
  expect(valid.artifacts[0]?.sha256).toBe(hash);
  const invalid = makeImagePlan({
    ...profile,
    artifacts: [{ ...artifact, sha256: "0".repeat(64) }],
  });
  expect((await verifyImagePlan(invalid, { artifact: path })).verified).toBe(
    false,
  );
  await expect(verifyImagePlan(makeImagePlan(profile), {})).rejects.toThrow(
    "Artifact file map must match",
  );
});
