// SPDX-License-Identifier: MIT OR Apache-2.0
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { BunPlugin } from "bun";

const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));
const depsPath = join(repoRoot, "DEPS");
const thirdPartyRoot = join(repoRoot, "third_party");

export interface ReadmeChromiumMetadata {
  readonly directory: string;
  readonly name: string;
  readonly shortName: string;
  readonly url: string;
  readonly license: string;
  readonly licenseFile: string;
  readonly version: string;
  readonly revision: string;
  readonly securityCritical: boolean;
  readonly shipped: boolean;
  readonly description: string;
  readonly localModifications: string;
}

export interface ThirdPartyVerificationReport {
  readonly depsFileExists: boolean;
  readonly depsCount: number;
  readonly packages: ReadmeChromiumMetadata[];
  readonly agplViolations: string[];
  readonly missingFields: Array<{ directory: string; missing: string[] }>;
  readonly valid: boolean;
}

export function parseReadmeChromium(
  rawText: string,
  directory: string,
): ReadmeChromiumMetadata {
  const getField = (label: string): string => {
    const regex = new RegExp(`^${label}:\\s*(.+)$`, "mi");
    const match = rawText.match(regex);
    return match ? (match[1]?.trim() ?? "") : "";
  };

  const getSection = (header: string, nextHeader?: string): string => {
    const startIdx = rawText.indexOf(`${header}:`);
    if (startIdx === -1) return "";
    const contentStart = startIdx + header.length + 1;
    if (!nextHeader) {
      return rawText.slice(contentStart).trim();
    }
    const endIdx = rawText.indexOf(`${nextHeader}:`, contentStart);
    return (
      endIdx === -1
        ? rawText.slice(contentStart)
        : rawText.slice(contentStart, endIdx)
    ).trim();
  };

  return {
    directory,
    name: getField("Name"),
    shortName: getField("Short Name"),
    url: getField("URL"),
    license: getField("License"),
    licenseFile: getField("License File") || "LICENSE",
    version: getField("Version"),
    revision: getField("Revision"),
    securityCritical: getField("Security Critical").toLowerCase() === "yes",
    shipped: getField("Shipped").toLowerCase() === "yes",
    description: getSection("Description", "Local Modifications"),
    localModifications: getSection("Local Modifications"),
  };
}

function collectReadmeChromiumDirs(dir: string, relBase = ""): string[] {
  const results: string[] = [];
  if (!existsSync(dir)) return results;

  const entries = readdirSync(dir);
  if (entries.includes("README.chromium")) {
    results.push(relBase || ".");
  }

  for (const entry of entries) {
    if (entry === "schemas" || entry.startsWith(".")) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      const childRel = relBase ? `${relBase}/${entry}` : entry;
      results.push(...collectReadmeChromiumDirs(full, childRel));
    }
  }
  return results;
}

export function verifyThirdPartyDeps(): ThirdPartyVerificationReport {
  const depsFileExists = existsSync(depsPath);
  const depsContent = depsFileExists ? readFileSync(depsPath, "utf8") : "";
  const depMatches = depsContent.match(/'(bun|third_party\/[^']+)':/g) ?? [];

  const relDirs = collectReadmeChromiumDirs(thirdPartyRoot);
  const packages: ReadmeChromiumMetadata[] = [];
  const agplViolations: string[] = [];
  const missingFields: Array<{ directory: string; missing: string[] }> = [];

  for (const relDir of relDirs) {
    const readmePath = join(thirdPartyRoot, relDir, "README.chromium");
    const raw = readFileSync(readmePath, "utf8");
    const meta = parseReadmeChromium(raw, `third_party/${relDir}`);
    packages.push(meta);

    if (meta.license.toUpperCase().includes("AGPL")) {
      agplViolations.push(meta.directory);
    }

    const missing: string[] = [];
    if (!meta.name) missing.push("Name");
    if (!meta.shortName) missing.push("Short Name");
    if (!meta.url) missing.push("URL");
    if (!meta.license) missing.push("License");
    if (!meta.version) missing.push("Version");
    if (!meta.revision) missing.push("Revision");
    if (!meta.description) missing.push("Description");
    if (missing.length > 0) {
      missingFields.push({ directory: meta.directory, missing });
    }
  }

  return {
    depsFileExists,
    depsCount: depMatches.length,
    packages,
    agplViolations,
    missingFields,
    valid:
      depsFileExists &&
      depMatches.length >= 12 &&
      packages.length >= 12 &&
      agplViolations.length === 0 &&
      missingFields.length === 0,
  };
}

export const thirdPartyPlugin: BunPlugin = {
  name: "yolo-bun-third-party-chromium",
  setup(build) {
    build.onResolve({ filter: /^yolo-bun:third-party$/ }, () => ({
      path: "third-party",
      namespace: "yolo-bun",
    }));
    build.onLoad({ filter: /^third-party$/, namespace: "yolo-bun" }, () => {
      const report = verifyThirdPartyDeps();
      return {
        contents: `export const thirdPartyReport = ${JSON.stringify(report)};\nexport default thirdPartyReport;\n`,
        loader: "js",
      };
    });
  },
};
