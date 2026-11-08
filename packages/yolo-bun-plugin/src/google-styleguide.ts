// SPDX-License-Identifier: MIT OR Apache-2.0
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { BunPlugin } from "bun";

const styleguideSchemaPath = fileURLToPath(
  new URL(
    "../../../third_party/google/styleguide/google-styleguide-2026.current.json",
    import.meta.url,
  ),
);

export interface GoogleStyleguide2026Schema {
  readonly version: string;
  readonly upstreams: Record<string, string>;
  readonly rust: {
    readonly edition: string;
    readonly comprehensiveRustUrl: string;
    readonly chromiumFfiSafety: {
      readonly requireCxxOrCrubit: boolean;
      readonly prohibitCatchUnwind: boolean;
      readonly panicStrategy: string;
      readonly forbidUncheckedUnsafe: boolean;
      readonly gtestInterop: string;
    };
    readonly linter: string;
    readonly formatter: string;
    readonly rules: readonly string[];
  };
  readonly typescript: {
    readonly styleguideUrl: string;
    readonly runtime: string;
    readonly minBunVersion: string;
    readonly commands: {
      readonly format: string;
      readonly lint: string;
      readonly check: string;
    };
    readonly rules: readonly string[];
  };
  readonly cppChromium: {
    readonly styleguideUrl: string;
    readonly stdVersion: string;
    readonly subsystems: readonly string[];
    readonly buildTools: readonly string[];
    readonly rules: readonly string[];
  };
  readonly aospAndroid17: {
    readonly apiLevel: number;
    readonly releaseName: string;
    readonly buildSystems: readonly string[];
    readonly rules: readonly string[];
  };
}

export interface GtsAuditResult {
  readonly valid: boolean;
  readonly violations: string[];
  readonly rulesChecked: number;
}

export function loadGoogleStyleguide2026(): GoogleStyleguide2026Schema {
  return JSON.parse(
    readFileSync(styleguideSchemaPath, "utf8"),
  ) as GoogleStyleguide2026Schema;
}

/**
 * Audits a TypeScript source snippet against Google TypeScript Style (GTS 2026) rules:
 * - No `var` declarations
 * - No explicit `: any` or `<any>`
 * - No `namespace` or `const enum`
 * - No `eval(`
 */
export function auditTypeScriptSourceForGts(source: string): GtsAuditResult {
  const violations: string[] = [];

  if (/\bvar\s+[A-Za-z_$]/.test(source)) {
    violations.push("GTS-01: Use const or let instead of var");
  }
  if (/:\s*any\b|<any>|\bas\s+any\b/.test(source)) {
    violations.push(
      "GTS-02: Do not use explicit 'any'; use 'unknown' or strict types",
    );
  }
  if (/\bnamespace\s+[A-Za-z_$]/.test(source)) {
    violations.push("GTS-03: Do not use TypeScript namespaces; use ES modules");
  }
  if (/\bconst\s+enum\s+/.test(source)) {
    violations.push(
      "GTS-04: Do not use const enum; use union types or standard enum",
    );
  }
  if (/\beval\s*\(/.test(source)) {
    violations.push("GTS-05: Dynamic code evaluation via eval() is prohibited");
  }

  return {
    valid: violations.length === 0,
    violations,
    rulesChecked: 5,
  };
}

export const googleStyleguidePlugin: BunPlugin = {
  name: "yolo-bun-google-styleguide",
  setup(build) {
    build.onResolve({ filter: /^yolo-bun:google-styleguide$/ }, () => ({
      path: "google-styleguide",
      namespace: "yolo-bun",
    }));
    build.onLoad(
      { filter: /^google-styleguide$/, namespace: "yolo-bun" },
      () => {
        const schema = loadGoogleStyleguide2026();
        return {
          contents: `export const googleStyleguide = ${JSON.stringify(schema)};\nexport default googleStyleguide;\n`,
          loader: "js",
        };
      },
    );
  },
};
