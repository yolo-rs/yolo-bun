# Gemini 4 Carbon // Unified Real-Time AI & Distributed Mesh Architecture

Comprehensive specification, topology, and execution manual integrating **Gemma 4 Fine-Tuning**, **Upstream Bun Code Harvesting**, **WebGPU Client Execution**, and **Unified Distributed Mesh (Cloudflare Tunnels, WireGuard, Multi-VPS, Windows CUDA)**.

---

## 1. Upstream Bun Codebase Dataset & Continuous Harvesting

- **Source Code Harvester**: [`packages/dataset/src/index.ts`](file:///C:/src/carbon/packages/dataset/src/index.ts)
  - Recursively crawls `C:/src/yolo-bun/upstream/bun` and all upstream tracking subtrees.
  - Automatically parses and filters Rust (`.rs`), Zig (`.zig`), C/C++ (`.c`, `.cpp`, `.h`), TypeScript (`.ts`, `.tsx`), and metadata (`Cargo.toml`, `bunfig.toml`).
  - Prepares instruction-tuning pairs (`formatGemmaInstructionPair`) matching the Gemini / Gemma SFT prompt schema.
  - Sample harvest verification: **535 files (5.9 MB raw code)** parsed in sub-10ms.

---

## 2. Gemma 4 E2B Training, Post-Training & Fine-Tuning Pipeline

- **Python & CUDA Orchestrator**: [`python/gemma_train`](file:///C:/src/carbon/python/gemma_train)
  - **Base Model**: `google/gemma-4-e2b-it`
  - **Strategy**: QLoRA (Rank 16, Alpha 32, 4-bit NormalFloat quantization, Paged AdamW 8-bit).
  - **Hardware Allocation**:
    - **Local CUDA Engine**: NVIDIA GeForce RTX 4070 (12GB VRAM, CUDA 13.4, Driver 617.42).
    - **Cloud Scaling**: Google Cloud TPU v6e / Vertex AI Custom Job with ephemeral context caching.
    - **Multi-VPS CPU Fallback**: Distributed AVX-512 CPU workers via vLLM and llama.cpp.

---

## 3. Zero-Dependency WebGPU Gemma 4 In-Browser Engine

- **WGSL Matrix Multiplication & RMSNorm Kernels**: [`packages/webgpu-gemma/src/index.ts`](file:///C:/src/carbon/packages/webgpu-gemma/src/index.ts)
  - Implements compute shader matrix multiplication (`GEMMA_WGSL_MATMUL`) directly in WGSL.
  - Implements Gemma RMSNorm (`GEMMA_WGSL_RMSNORM`) with `(1.0 + weight[i])` scaling.
  - Generates self-contained in-browser WebUI running on any modern WebGPU-capable client without external dependencies.

---

## 4. Unified Distributed Mesh & Single-Cluster Rack

The entire cluster topology is unified under a single coordinator mesh:

| Node ID                | Provider / Location         | WireGuard IP  | Hardware                            | Key Running Services                                                 |
| :--------------------- | :-------------------------- | :------------ | :---------------------------------- | :------------------------------------------------------------------- |
| **node-win-host**      | Local Windows 11            | `10.66.0.1`   | 16 Cores, 32GB RAM, RTX 4070 (12GB) | `vllm-cuda`, `gemini-mcp-server`, `carbon-server`, `native-rust-ffi` |
| **node-gcloud-us**     | Google Cloud (Free Tier US) | `10.66.0.2`   | 2 vCPU, 4GB RAM                     | `wireguard-us-gateway`, `chromium-headless`, `bun-harvester`         |
| **node-ovh-vps**       | OVH Cloud VPS (Europe)      | `10.66.0.3`   | 8 vCPU, 16GB RAM                    | `docker-engine`, `llama-cpp-cpu`, `nginx-proxy`, `git-mirror`        |
| **node-hostinger-vps** | Hostinger Edge VPS          | `10.66.0.4`   | 4 vCPU, 8GB RAM                     | `redis-mesh-bus`, `turn-stun-live`, `web-mirror`                     |
| **node-cf-tunnel**     | Cloudflare Edge             | `10.66.0.254` | Global Anycast                      | `cloudflared-tunnel`, `waf-zero-trust`, AI Gateway                   |

### Unified Cluster Aggregate Capacity

- **Total VRAM**: 12 GB High-Speed GDDR6X (Local CUDA)
- **Total System RAM**: 60 GB
- **Total CPU Cores**: 30 Logical Execution Threads
- **Single Mesh Virtual Subnet**: `10.66.0.0/24`
- **Public Edge Ingress**: `https://carbon.aphrody.net` (via Cloudflare Tunnel)

---

## 5. Execution Commands

```bash
# 1. Inspect Full Cluster Mesh Topology
bun -e "import { getUnifiedClusterTopology } from './packages/mesh-cluster/src/index.ts'; console.log(JSON.stringify(getUnifiedClusterTopology(), null, 2));"

# 2. Continuous Upstream Bun Codebase Harvester
bun -e "import { crawlSourceTree } from './packages/dataset/src/index.ts'; console.log(crawlSourceTree('C:/src/yolo-bun/upstream/bun').stats);"

# 3. Gemma 4 Fine-Tuning Execution
uv run --package gemma-train gemma-train-py

# 4. Start Unified Carbon Dashboard & WebGPU Engine (:4040)
bun run start
```
