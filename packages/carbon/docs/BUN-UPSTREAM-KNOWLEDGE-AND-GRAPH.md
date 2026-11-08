# Upstream Bun Knowledge Base & Architecture Ground Truth (v1.4.4)

## 1. Fact-Checked Upstream Bun Reality

- **Runtime Architecture**: Upstream Bun v1.4.4 is a hybrid runtime combining **C++ JavaScriptCore (WebKit)** with an extensive subsystem of **over 117 native Rust crates and C++ bindings in `src/*`** and **TypeScript builtins in `src/js`**.
- **Internal Subsystems (117 Total Subsystems)**:
  - `src/bun_core`, `src/aot`, `src/bundler`, `src/http`, `src/jsc`, `src/sql`, `src/archive`, `src/io`
  - `src/lint`, `src/format`, `src/sema`, `src/runtime`, `src/uws`, `src/brotli`, `src/zstd`, `src/ast`
  - `src/boringssl_sys`, `src/mimalloc_sys`, `src/libuv_sys`, `src/lsquic_sys`
- **Native CLI Commands (Strictly Verified)**:
  - `bun run <file>`: High-performance execution.
  - `bun test`: Built-in Jest/Vitest-compatible test runner.
  - `bun check`: Built-in TypeScript 7 (`tsgo`) typechecker running in ~27ms.
  - `bun fmt`: Prettier-compatible native code formatter.
  - `bun lint`: 1,000+ native rules, zero config, ESLint/Oxlint compatible.
  - `bun compile <entry> --outfile <bin>`: Ahead-of-Time native compiler producing self-contained single executables (`--aot`, `--trim`, `--explain`).

---

## 2. Ingested Codebase Graph Statistics (`@carbon/graph-engine`)

- **Total Ingested Architecture Nodes**: 1,297
- **Total Dependency & Containment Edges**: 1,180
- **Total Verified Subsystems**: 117
- **Storage Location**: [`packages/graph-engine/src/bun-architecture-graph.json`](file:///C:/src/carbon/packages/graph-engine/src/bun-architecture-graph.json)
- **Python Bridge**: Accessible natively via `uv run --package carbon-graph carbon-graph-py`.

---

## 3. Usage in Carbon & Gemma 4 Tuning

1. **RAG Context Retrieval**: Query any subsystem (e.g. `aot`, `bundler`, `sql`) to inject exact C++/Rust internal function definitions and JSC safety invariants into Gemma prompt completions.
2. **Deterministic Grounding**: Prevents hallucinations by validating file paths against the 1,297 verified nodes in `bun-architecture-graph.json`.
