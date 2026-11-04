import { expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { makeImagePlan } from "./image-plan";
import { verifyImagePlan } from "./verify-image-plan";

test("verifies bytes and rejects modified plans and missing files", async () => {
  const dir = await mkdtemp(join(tmpdir(), "yolo-plan-"));
  try {
    const path = join(dir, "artifact");
    await writeFile(path, "hello");
    const plan = makeImagePlan({
      schemaVersion: 2,
      profile: "base",
      target: { os: "linux", arch: "x86_64" },
      sources: [
        {
          id: "bun-registry",
          backend: "bun",
          kind: "registry",
          ref: "https://registry.npmjs.org/",
        },
        {
          id: "z-registry",
          backend: "bun",
          kind: "registry",
          ref: "https://registry.example.org/",
        },
      ],
      artifacts: [
        {
          id: "bun",
          package: "bun",
          backend: "bun",
          source: "bun-registry",
          version: "1.4.4",
          url: "https://example.org/bun",
          sha256: createHash("sha256").update("hello").digest("hex"),
        },
      ],
    });
    expect((await verifyImagePlan(plan, { bun: path })).verified).toBe(true);
    await writeFile(path, "changed");
    expect((await verifyImagePlan(plan, { bun: path })).verified).toBe(false);
    await expect(
      verifyImagePlan(
        { ...plan, target: { ...plan.target, os: "windows" } },
        { bun: path },
      ),
    ).rejects.toThrow("digest mismatch");
    await expect(
      verifyImagePlan(
        { ...plan, sources: [...plan.sources].reverse() },
        {
          bun: path,
        },
      ),
    ).rejects.toThrow("sources are not in canonical order");
    await expect(verifyImagePlan(plan, {})).rejects.toThrow(
      "Artifact file map must match",
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
