// Copyright 2026 Google LLC
// SPDX-License-Identifier: Apache-2.0

<!-- Copyright 2026 Google LLC. SPDX-License-Identifier: Apache-2.0 -->

# Native GPUI Gemini Web App & Antigravity 2.0 Zed Fork Roadmap

This document outlines the consolidation of **Carbon**, **YOLO-Web**, **YOLO-UI**, and **YOLO-AI** into a unified, high-performance, keyless native desktop and CLI ecosystem.

---

## 1. Core Architectural Tenets

1. **Pure GPUI Desktop Engine (Zed Fork)**:
   - Migration of Antigravity IDE and Google Gemini Windows App away from Electron to a **Zed fork written in 100% Rust** using the GPUI rendering engine (`yolo-ui/packages/yolo-gpui` and `yolo-dashboard`).
   - Hardware-accelerated GPU layout computation via Taffy 0.15 and direct DirectX 12 / Metal / Vulkan rendering.

2. **Keyless Google AI Ultra Sub Token Bridge**:
   - Zero hardcoded or third-party API keys required.
   - Leverages active Google session cookies (`__Secure-1PSID`, `__Secure-1PSIDTS`, `RotateCookies`, and `SNlM0e` XSRF tokens) synchronized via `@yolo-web/auth` and Carbon's Gemini Web Client.
   - Direct execution via Google Lamda RPC (`BardFrontendService/StreamGenerate`) and local OpenAI-compatible gateway (`http://127.0.0.1:4040/v1/chat/completions`).

3. **Built-in Creative Suite & Uncensored Local Media**:
   - Native integration of local WebGPU/CUDA image generation (SDXL/Flux), video interpolation (Veo 2/SVD), and audio synthesis.
   - Local fallback running uncensored weights via `yolo-ai` and `carbon_ffi` tensor kernels.

4. **Multi-Language Keyless SDK Ecosystem**:
   - **Rust**: `crates/yolo-model-client` & `crates/carbon_ffi`
   - **Bun / TS**: `@carbon/gemini-web-client` & `@yolo-web/auth`
   - **Python**: `python/carbon_gemini_web` & `python/carbon_core`
   - **Go**: Native goroutine stream client

---

## 2. Autonomous Pipeline & Registry Release

Both monorepos are managed by autonomous pipelines:

- **Carbon**: `bun run scripts/pipeline.ts`
- **YOLO-Web**: `bun run scripts/pipeline.ts`
- **CI/CD**: `.github/workflows/ci-cd-publish.yml` with multi-OS support (Linux, macOS, Windows) and automated releases to NPM, Crates.io, and PyPI.
