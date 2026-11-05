// SPDX-License-Identifier: MIT OR Apache-2.0
// Assemble a deterministic image input plan from already resolved artifacts.
import { sha256 } from "./native-hash";

const backends = [
  "bun",
  "pacman",
  "flatpak",
  "cargo",
  "uv",
  "vcpkg",
  "winget",
  "fdroid",
] as const;

type Backend = (typeof backends)[number];
type Source = {
  id: string;
  backend: Backend;
  kind: string;
  ref: string;
};
type Target = {
  os: "linux" | "windows" | "android";
  arch: string;
  distribution?: string;
  release?: string;
  channel?: string;
  cpuTier?: string;
};
type Artifact = {
  id: string;
  package: string;
  backend: Backend;
  source: string;
  version: string;
  url: string;
  sha256: string;
};
type Profile = {
  schemaVersion: 2;
  profile: string;
  target: Target;
  sources: Source[];
  artifacts: Artifact[];
};

const allowedBackends = new Set<string>(backends);
const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);
const hasExactKeys = (value: Record<string, unknown>, keys: string[]) =>
  Object.keys(value).sort().join("\0") === [...keys].sort().join("\0");
const isText = (value: unknown) =>
  typeof value === "string" && !!value.trim() && !/[\0\r\n]/.test(value);
function isNativePackageId(backend: string, value: string): boolean {
  switch (backend) {
    case "bun":
      return /^(?:@[A-Za-z0-9._-]+\/)?[A-Za-z0-9][A-Za-z0-9._-]*$/.test(value);
    case "flatpak":
      return /^[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+){2,}$/.test(value);
    case "winget":
      return /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(value);
    case "pacman":
      return /^[A-Za-z0-9][A-Za-z0-9@._+/-]*$/.test(value);
    case "vcpkg":
      return /^[a-z0-9][a-z0-9-]*(?:\[[a-z0-9-]+(?:,[a-z0-9-]+)*\])?(?::[a-z0-9][a-z0-9-]*)?$/.test(
        value,
      );
    case "fdroid":
      return /^[A-Za-z0-9_][A-Za-z0-9._]*$/.test(value);
    case "cargo":
    case "uv":
      return /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(value);
    default:
      return false;
  }
}

export function makeImagePlan(input: unknown) {
  if (
    !isRecord(input) ||
    !hasExactKeys(input, [
      "schemaVersion",
      "profile",
      "target",
      "sources",
      "artifacts",
    ]) ||
    input.schemaVersion !== 2 ||
    !isText(input.profile) ||
    !isRecord(input.target) ||
    !Array.isArray(input.sources) ||
    !Array.isArray(input.artifacts) ||
    input.artifacts.length === 0
  )
    throw new Error("Invalid image profile (expected schemaVersion 2)");

  const profileInput = input as Record<string, unknown>;
  const targetInput = profileInput.target as Record<string, unknown>;
  const targetKeys = [
    "os",
    "arch",
    "distribution",
    "release",
    "channel",
    "cpuTier",
  ];
  if (
    Object.keys(targetInput).some((key) => !targetKeys.includes(key)) ||
    !("os" in targetInput) ||
    !("arch" in targetInput) ||
    !["linux", "windows", "android"].includes(String(targetInput.os)) ||
    typeof targetInput.arch !== "string" ||
    !/^[A-Za-z0-9][A-Za-z0-9_.+-]*$/.test(targetInput.arch)
  )
    throw new Error("Invalid image target; expected OS and architecture");

  const target = Object.fromEntries(
    targetKeys
      .filter((key) => key in targetInput)
      .map((key) => [key, targetInput[key]]),
  ) as Target;
  for (const key of [
    "distribution",
    "release",
    "channel",
    "cpuTier",
  ] as const) {
    if (key in target && !isText(target[key]))
      throw new Error(`Invalid target ${key}`);
  }

  const sourceInput = profileInput.sources as unknown[];
  const artifactInput = profileInput.artifacts as unknown[];
  if (!sourceInput.length) throw new Error("Image profile requires sources");
  const sourceIds = new Map<string, Backend>();
  const sources = sourceInput
    .map((source) => {
      if (
        !isRecord(source) ||
        !hasExactKeys(source, ["id", "backend", "kind", "ref"]) ||
        typeof source.id !== "string" ||
        !/^[a-z0-9][a-z0-9._-]*$/.test(source.id) ||
        typeof source.backend !== "string" ||
        !allowedBackends.has(source.backend) ||
        !isText(source.kind) ||
        !isText(source.ref) ||
        sourceIds.has(source.id)
      )
        throw new Error("Invalid or duplicate package source");
      sourceIds.set(source.id, source.backend as Backend);
      return {
        id: source.id,
        backend: source.backend as Backend,
        kind: source.kind,
        ref: source.ref,
      };
    })
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

  const seen = new Set<string>();
  const artifacts = artifactInput
    .map((item) => {
      if (
        !isRecord(item) ||
        !hasExactKeys(item, [
          "id",
          "package",
          "backend",
          "source",
          "version",
          "url",
          "sha256",
        ]) ||
        typeof item.id !== "string" ||
        !/^[a-z0-9][a-z0-9._-]*$/.test(item.id) ||
        seen.has(item.id)
      )
        throw new Error("Invalid or duplicate artifact ID");
      seen.add(item.id);

      let url: URL;
      try {
        if (typeof item.url !== "string") throw new Error("not a string");
        url = new URL(item.url);
      } catch {
        throw new Error(`Artifact ${item.id} has an invalid URL`);
      }
      if (
        typeof item.package !== "string" ||
        !isNativePackageId(String(item.backend), item.package) ||
        typeof item.backend !== "string" ||
        !allowedBackends.has(item.backend) ||
        typeof item.source !== "string" ||
        !item.source.trim() ||
        sourceIds.get(item.source) !== item.backend ||
        typeof item.version !== "string" ||
        !/^[0-9][a-zA-Z0-9._+~-]*$/.test(item.version) ||
        typeof item.sha256 !== "string" ||
        url.protocol !== "https:" ||
        !url.hostname ||
        !!url.username ||
        !!url.password ||
        !/^[a-f0-9]{64}$/.test(item.sha256)
      )
        throw new Error(
          `Artifact ${item.id} must have a native package ID, matching source, pinned version, HTTPS URL and SHA-256`,
        );
      return {
        id: item.id,
        package: item.package,
        backend: item.backend as Backend,
        source: item.source,
        version: item.version,
        url: item.url,
        sha256: item.sha256,
      };
    })
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

  const plan = {
    schemaVersion: 2 as const,
    profile: profileInput.profile as string,
    target,
    sources,
    artifacts,
  };
  const canonical = JSON.stringify(plan);
  return {
    ...plan,
    planSha256: sha256(canonical),
  };
}

if (import.meta.main) {
  const args = Bun.argv.slice(2).filter((arg) => arg !== "--");
  if (args.length !== 1)
    throw new Error("Usage: bun run packages:image-plan <profile.json>");
  const input = (await Bun.file(args[0]!).json()) as Profile;
  console.log(JSON.stringify(makeImagePlan(input), null, 2));
}
