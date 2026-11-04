// SPDX-License-Identifier: MIT OR Apache-2.0
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { makeImagePlan } from "./image-plan";

export async function verifyImagePlan(
  plan: ReturnType<typeof makeImagePlan>,
  files: Record<string, string>,
) {
  const expected = makeImagePlan(plan);
  if (plan.planSha256 !== expected.planSha256)
    throw new Error("Image plan digest mismatch");
  const results = [];
  for (const artifact of expected.artifacts) {
    const path = Object.hasOwn(files, artifact.id)
      ? files[artifact.id]
      : undefined;
    if (typeof path !== "string" || !path)
      throw new Error(`Missing file for ${artifact.id}`);
    const hash = createHash("sha256");
    for await (const chunk of createReadStream(path))
      hash.update(chunk as Buffer);
    const actual = hash.digest("hex");
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
  const args = process.argv.slice(2);
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
