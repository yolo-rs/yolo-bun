// SPDX-License-Identifier: MIT OR Apache-2.0
import { makeImagePlan } from "./image-plan";
import { sha256File } from "./native-hash";

export async function verifyImagePlan(
  plan: ReturnType<typeof makeImagePlan>,
  files: Record<string, string>,
) {
  const planKeys = [
    "artifacts",
    "planSha256",
    "profile",
    "schemaVersion",
    "sources",
    "target",
  ];
  if (
    !plan ||
    typeof plan !== "object" ||
    Object.keys(plan).sort().join("\0") !== planKeys.join("\0") ||
    !Array.isArray(plan.artifacts) ||
    !/^[a-f0-9]{64}$/.test(plan.planSha256)
  ) {
    throw new Error("Invalid image plan shape");
  }
  for (const artifact of plan.artifacts) {
    if (
      !artifact ||
      typeof artifact !== "object" ||
      Object.keys(artifact).sort().join("\0") !==
        ["backend", "id", "package", "sha256", "source", "url", "version"].join(
          "\0",
        )
    ) {
      throw new Error("Invalid image plan artifact shape");
    }
  }
  const { planSha256, ...profile } = plan;
  const expected = makeImagePlan(profile);
  if (planSha256 !== expected.planSha256)
    throw new Error("Image plan digest mismatch");
  if (
    plan.artifacts.some(
      (artifact, index) => artifact.id !== expected.artifacts[index]?.id,
    )
  ) {
    throw new Error("Image plan artifacts are not in canonical order");
  }
  if (
    plan.sources.some(
      (source, index) => source.id !== expected.sources[index]?.id,
    )
  ) {
    throw new Error("Image plan sources are not in canonical order");
  }
  if (
    !files ||
    typeof files !== "object" ||
    Object.keys(files).sort().join("\0") !==
      expected.artifacts
        .map((artifact) => artifact.id)
        .sort()
        .join("\0")
  ) {
    throw new Error("Artifact file map must match the plan artifact IDs");
  }
  const results = [];
  for (const artifact of expected.artifacts) {
    const path = Object.hasOwn(files, artifact.id)
      ? files[artifact.id]
      : undefined;
    if (typeof path !== "string" || !path)
      throw new Error(`Missing file for ${artifact.id}`);
    const actual = await sha256File(path);
    results.push({
      id: artifact.id,
      sha256: actual,
      matches: actual === artifact.sha256,
    });
  }
  return {
    schemaVersion: 1,
    planSha256: expected.planSha256,
    verified: results.every((r) => r.matches),
    artifacts: results,
  };
}

if (import.meta.main) {
  const args = Bun.argv.slice(2);
  if (args[0] === "--") args.shift();
  if (args.length !== 2)
    throw new Error(
      "Usage: bun run packages:verify-image-plan <plan.json> <files.json>",
    );
  const plan = await Bun.file(args[0]!).json();
  const files = await Bun.file(args[1]!).json();
  const receipt = await verifyImagePlan(plan, files);
  console.log(JSON.stringify(receipt, null, 2));
  if (!receipt.verified) process.exitCode = 1;
}
