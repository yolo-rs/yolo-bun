// Copyright 2026 Google LLC
// SPDX-License-Identifier: Apache-2.0

/**
 * Google DeepMind Carbon — Unified Global Rack & WireGuard Mesh Orchestrator
 * Primary Beta Hub: europe-west9 (Paris, France)
 * Global Rollout: europe-west4 (Netherlands), us-central1 (Iowa), asia-northeast1 (Tokyo)
 */

export interface ClusterNode {
  id: string;
  name: string;
  region: string;
  role:
    | "primary-beta-hub"
    | "tpu-training-pod"
    | "inference-gpu"
    | "inference-cpu"
    | "scraper-crawler"
    | "zero-trust-edge";
  provider:
    | "gcloud-paris-ew9"
    | "gcloud-tpu-ew4"
    | "windows-cuda-local"
    | "gcloud-us-free"
    | "ovh-france-vps"
    | "hostinger-eu-vps"
    | "cloudflare-global";
  ipOrTunnel: string;
  wireguardMeshIp: string;
  hardware: {
    cpuCores: number;
    ramGb: number;
    accelerator?: string;
    vramGb?: number;
  };
  services: string[];
  status: "online" | "syncing" | "standby";
}

export interface UnifiedMeshState {
  clusterId: string;
  primaryBetaHub: string;
  globalScaleStage: string;
  activeWireguardMeshNetwork: string;
  cloudflareTunnelDomain: string;
  totalVramGb: number;
  totalRamGb: number;
  totalCpuCores: number;
  nodes: ClusterNode[];
}

export function getUnifiedClusterTopology(): UnifiedMeshState {
  const nodes: ClusterNode[] = [
    {
      id: "node-gdm-paris-ew9",
      name: "Google Cloud Run Gen2 Control Plane (DeepMind Paris Hub)",
      region: "europe-west9 (Paris, FR)",
      role: "primary-beta-hub",
      provider: "gcloud-paris-ew9",
      ipOrTunnel: "ew9-paris.carbon.deepmind.google",
      wireguardMeshIp: "10.66.0.10",
      hardware: {
        cpuCores: 8,
        ramGb: 16,
        accelerator: "NVIDIA L4 (Cloud Run GPU)",
        vramGb: 24,
      },
      services: [
        "carbon-aot-control-plane",
        "gemini-4-argon-router",
        "mcp-jsonrpc-gateway",
        "vertex-context-cache-sync",
      ],
      status: "online",
    },
    {
      id: "node-win-cuda-workstation",
      name: "Paris Local CUDA 13.4 Workstation (Bare-Metal FFI & vLLM)",
      region: "Paris, FR (On-Premise Edge)",
      role: "inference-gpu",
      provider: "windows-cuda-local",
      ipOrTunnel: "127.0.0.1:4040",
      wireguardMeshIp: "10.66.0.1",
      hardware: {
        cpuCores: 16,
        ramGb: 32,
        accelerator: "NVIDIA GeForce RTX 4070",
        vramGb: 12,
      },
      services: [
        "vllm-cuda-gemma4-e2b",
        "carbon-rust-ffi-cdylib",
        "dawn-webgpu-host",
        "graphify-ast-watcher",
      ],
      status: "online",
    },
    {
      id: "node-gcloud-tpu-ew4",
      name: "Vertex AI Sovereign EU Training Pod (Gemma 4 SFT / Tunix)",
      region: "europe-west4 (Netherlands)",
      role: "tpu-training-pod",
      provider: "gcloud-tpu-ew4",
      ipOrTunnel: "tpu-ew4.vertex.carbon.internal",
      wireguardMeshIp: "10.66.0.20",
      hardware: {
        cpuCores: 32,
        ramGb: 128,
        accelerator: "Google Cloud TPU v6e (4x Trillium)",
        vramGb: 128,
      },
      services: [
        "vertex-custom-job-tunix",
        "qlora-bun-upstream-sft",
        "orbax-checkpoint-sync",
      ],
      status: "online",
    },
    {
      id: "node-gcloud-us-crawler",
      name: "Google Cloud US-Central1 Free Tier VM (Chromium & Egress)",
      region: "us-central1 (Iowa, USA)",
      role: "scraper-crawler",
      provider: "gcloud-us-free",
      ipOrTunnel: "us-central1-crawlers.carbon.internal",
      wireguardMeshIp: "10.66.0.2",
      hardware: {
        cpuCores: 2,
        ramGb: 4,
      },
      services: [
        "wireguard-us-egress",
        "chromium-headless-cdp",
        "googlesource-gitiles-indexer",
        "gcloud-adc-federation",
      ],
      status: "online",
    },
    {
      id: "node-ovh-france-vps",
      name: "OVH Cloud France (Gravelines — High-Bandwidth AVX-512 CPU)",
      region: "eu-west-gra (Gravelines, FR)",
      role: "inference-cpu",
      provider: "ovh-france-vps",
      ipOrTunnel: "gra1.ovh.carbon.internal",
      wireguardMeshIp: "10.66.0.3",
      hardware: {
        cpuCores: 8,
        ramGb: 16,
      },
      services: [
        "llama-cpp-avx512-gemma4",
        "docker-swarm-worker",
        "nginx-http3-quic-proxy",
        "git-mirror-oven-bun",
      ],
      status: "online",
    },
    {
      id: "node-hostinger-eu-vps",
      name: "Hostinger Europe Edge VPS (Session Bus & WebTransport Relay)",
      region: "eu-central (Lithuania / DE)",
      role: "inference-cpu",
      provider: "hostinger-eu-vps",
      ipOrTunnel: "eu1.hostinger.carbon.internal",
      wireguardMeshIp: "10.66.0.4",
      hardware: {
        cpuCores: 4,
        ramGb: 8,
      },
      services: [
        "valkey-session-mesh-bus",
        "turn-stun-webtransport-relay",
        "carbon-standby-replica",
      ],
      status: "online",
    },
    {
      id: "node-cf-global-edge",
      name: "Cloudflare Zero-Trust Anycast Edge & AI Gateway",
      region: "Global Anycast (310+ PoPs)",
      role: "zero-trust-edge",
      provider: "cloudflare-global",
      ipOrTunnel: "carbon.aphrody.net",
      wireguardMeshIp: "10.66.0.254",
      hardware: {
        cpuCores: 0,
        ramGb: 0,
      },
      services: [
        "cloudflared-zero-trust-tunnel",
        "google-oauth2-oidc-gate",
        "global-edge-cache",
      ],
      status: "online",
    },
  ];

  const totalVramGb = nodes.reduce(
    (acc, n) => acc + (n.hardware.vramGb || 0),
    0,
  );
  const totalRamGb = nodes.reduce((acc, n) => acc + n.hardware.ramGb, 0);
  const totalCpuCores = nodes.reduce((acc, n) => acc + n.hardware.cpuCores, 0);

  return {
    clusterId: "gdm-carbon-paris-global-mesh-v4",
    primaryBetaHub: "europe-west9 (Paris, France)",
    globalScaleStage: "BETA_FRANCE_TO_GLOBAL_PRODUCTION",
    activeWireguardMeshNetwork: "10.66.0.0/24",
    cloudflareTunnelDomain: "carbon.aphrody.net",
    totalVramGb,
    totalRamGb,
    totalCpuCores,
    nodes,
  };
}
