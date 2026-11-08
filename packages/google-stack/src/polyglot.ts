// SPDX-License-Identifier: Apache-2.0
/**
 * Google-First Polyglot Stack & Zed / Antigravity IDE Workspace Generator
 * Bridges Upstream Bun v1.4.4+, TypeScript 7 (tsgo/tsrs), Python (uv),
 * Go 1.27 (google-cloud-go / go-github), Rust 2024 (oxc / gpui), and Dart / Flutter.
 */

export interface PolyglotLanguageTarget {
  readonly id:
    "bun-ts7" | "rust-2024" | "go-1.27" | "python-uv" | "dart-flutter";
  readonly runtime: string;
  readonly compilerOrChecker: string;
  readonly googleFramework: string;
  readonly zedLanguageServer: string;
}

export const GOOGLE_POLYGLOT_MATRIX: readonly PolyglotLanguageTarget[] = [
  {
    id: "bun-ts7",
    runtime: "Upstream Bun v1.4.4+ (JavaScriptCore + Rust Crates)",
    compilerOrChecker:
      "bun check (tsgo / oxc-project/tsrs) + bun compile --aot",
    googleFramework:
      "Google Wiz + Angular Signals + BOQ + @google-bun/zx-bun + @google-bun/gts-bun",
    zedLanguageServer: "tsgo + oxc-zed",
  },
  {
    id: "rust-2024",
    runtime: "Bare-Metal Rust 2024 (LTO Fat, codegen-units=1)",
    compilerOrChecker: "cargo check + clippy + rustfmt --edition 2024",
    googleFramework:
      "Zed GPUI 0.8 + WGPU DirectX12/Metal/Vulkan + carbon_ffi SIMD/Gemma4",
    zedLanguageServer: "rust-analyzer",
  },
  {
    id: "go-1.27",
    runtime: "Go 1.27 Runtime",
    compilerOrChecker: "go build + go vet",
    googleFramework:
      "googleapis/google-cloud-go + google/go-github + gVisor Sentry",
    zedLanguageServer: "gopls",
  },
  {
    id: "python-uv",
    runtime: "Astral uv v0.13.7 + Python 3.13",
    compilerOrChecker: "uv run ruff check + pytest",
    googleFramework: "JAX + Gemma 4 QLoRA + Vertex AI + BigFrames",
    zedLanguageServer: "pyright + ruff-lsp",
  },
  {
    id: "dart-flutter",
    runtime: "Dart 3.8 VM / Impeller AOT",
    compilerOrChecker: "dart analyze + flutter build",
    googleFramework: "Flutter Material 3 + Android Jetpack Compose Interop",
    zedLanguageServer: "dart-analysis-server",
  },
] as const;

export function generateZedIdeSettingsJson(): Record<string, unknown> {
  return {
    theme: "Google DeepMind Dark",
    buffer_font_family: "Google Sans Mono",
    buffer_font_size: 13,
    ui_font_family: "Google Sans",
    tab_size: 2,
    format_on_save: "on",
    lsp: {
      "rust-analyzer": {
        initialization_options: {
          checkOnSave: { command: "clippy" },
        },
      },
      oxc: {
        initialization_options: {
          flags: { type_aware: "true" },
        },
      },
    },
    languages: {
      TypeScript: {
        tab_size: 2,
        formatter: {
          external: {
            command: "bun",
            arguments: ["fmt", "--stdin-filepath", "{buffer_path}"],
          },
        },
      },
      Rust: {
        tab_size: 4,
      },
      Go: {
        tab_size: 4,
      },
      Python: {
        tab_size: 4,
      },
      Dart: {
        tab_size: 2,
      },
    },
  };
}

export function generateZedIdeTasksJson(): ReadonlyArray<
  Record<string, unknown>
> {
  return [
    {
      label: "Google-Bun: Full Pipeline (GTS + Oxc + Tests + Crawler)",
      command: "bun",
      args: ["run", "scripts/pipeline.ts"],
      use_new_terminal: false,
    },
    {
      label:
        "Google-Bun: Compile Multi-Surface UI (Web/Compose/Flutter/GPUI/TV)",
      command: "bun",
      args: ["run", "packages/google-stack/src/cli.ts"],
      use_new_terminal: false,
    },
    {
      label: "Google-Bun: GTS 2026 + Oxc Audit",
      command: "bun",
      args: ["run", "packages/gts-bun/src/cli.ts"],
      use_new_terminal: false,
    },
  ];
}
