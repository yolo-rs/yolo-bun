// SPDX-License-Identifier: MIT OR Apache-2.0
// Assemble a deterministic image input plan from already resolved artifacts.
import { createHash } from "node:crypto";

type Artifact = {
  id: string;
  backend: string;
  version: string;
  url: string;
  sha256: string;
};
type Profile = {
  schemaVersion: number;
  profile: string;
  target: string;
  artifacts: Artifact[];
};

export function makeImagePlan(input: Profile) {
  if (
    input.schemaVersion !== 1 ||
    !input.profile ||
    !input.target ||
    !Array.isArray(input.artifacts)
  )
    throw new Error("Invalid image profile");
  const seen = new Set<string>();
  const artifacts = input.artifacts
    .map((item) => {
      if (!item || !/^[a-z0-9][a-z0-9._-]*$/.test(item.id) || seen.has(item.id))
        throw new Error("Invalid or duplicate artifact ID");
      seen.add(item.id);
      if (
        !/^(bun|pacman|flatpak|cargo|uv|vcpkg|winget|fdroid)$/.test(
          item.backend,
        ) ||
        !/^[0-9][a-zA-Z0-9._+~-]*$/.test(item.version) ||
        !/^https:\/\//.test(item.url) ||
        !/^[a-f0-9]{64}$/.test(item.sha256)
      )
        throw new Error(
          `Artifact ${item.id} must have a backend, pinned version, HTTPS URL and SHA-256`,
        );
      return {
        id: item.id,
        backend: item.backend,
        version: item.version,
        url: item.url,
        sha256: item.sha256,
      };
    })
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const plan = {
    schemaVersion: 1,
    profile: input.profile,
    target: input.target,
    artifacts,
  };
  const canonical = JSON.stringify(plan);
  return {
    ...plan,
    planSha256: createHash("sha256").update(canonical).digest("hex"),
  };
}

if (import.meta.main) {
  const args = process.argv.slice(2).filter((arg) => arg !== "--");
  if (args.length !== 1)
    throw new Error("Usage: bun run packages:image-plan <profile.json>");
  const input = (await Bun.file(args[0]!).json()) as Profile;
  console.log(JSON.stringify(makeImagePlan(input), null, 2));
}
