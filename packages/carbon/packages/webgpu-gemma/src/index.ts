// Copyright 2026 Google LLC
// SPDX-License-Identifier: Apache-2.0

/**
 * Google DeepMind Gemma 4 WebGPU WGSL Compute Shaders & Bare-Metal Hybrid Executor
 * Compatible with Google Dawn WebGPU (`google/dawn`) and W3C WebGPU browsers.
 */

import {
  nativeGemmaLayerStep,
  nativeRopeInplace,
  nativeSoftmax,
  getNativeEngineVersion,
} from "../../core/src/index.ts";

export const GEMMA_WGSL_MATMUL = `
@group(0) @binding(0) var<storage, read> A : array<f32>;
@group(0) @binding(1) var<storage, read> B : array<f32>;
@group(0) @binding(2) var<storage, read_write> C : array<f32>;

struct Uniforms {
  M : u32,
  K : u32,
  N : u32,
};
@group(0) @binding(3) var<uniform> uniforms : Uniforms;

@compute @workgroup_size(16, 16)
fn main(@builtin(global_invocation_id) global_id : vec3<u32>) {
  let row = global_id.x;
  let col = global_id.y;
  if (row >= uniforms.M || col >= uniforms.N) { return; }

  var sum : f32 = 0.0;
  for (var k : u32 = 0u; k < uniforms.K; k = k + 1u) {
    sum = sum + A[row * uniforms.K + k] * B[k * uniforms.N + col];
  }
  C[row * uniforms.N + col] = sum;
}
`;

export const GEMMA_WGSL_RMSNORM = `
@group(0) @binding(0) var<storage, read> input : array<f32>;
@group(0) @binding(1) var<storage, read> weight : array<f32>;
@group(0) @binding(2) var<storage, read_write> output : array<f32>;

struct RMSParams {
  dim : u32,
  eps : f32,
};
@group(0) @binding(3) var<uniform> params : RMSParams;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id : vec3<u32>) {
  let idx = global_id.x;
  if (idx >= params.dim) { return; }

  var ss : f32 = 0.0;
  for (var i : u32 = 0u; i < params.dim; i = i + 1u) {
    ss = ss + input[i] * input[i];
  }
  let rms = 1.0 / sqrt(ss / f32(params.dim) + params.eps);
  output[idx] = input[idx] * (1.0 + weight[idx]) * rms;
}
`;

export const GEMMA_WGSL_GEGLU = `
@group(0) @binding(0) var<storage, read> gate : array<f32>;
@group(0) @binding(1) var<storage, read> up : array<f32>;
@group(0) @binding(2) var<storage, read_write> output : array<f32>;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id : vec3<u32>) {
  let idx = global_id.x;
  let g = gate[idx];
  let inner = 0.7978846 * (g + 0.044715 * g * g * g);
  let gelu = 0.5 * g * (1.0 + tanh(inner));
  output[idx] = gelu * up[idx];
}
`;

export const GEMMA_WGSL_ROPE = `
@group(0) @binding(0) var<storage, read_write> qk : array<f32>;

struct RopeParams {
  head_dim : u32,
  pos : u32,
  theta_base : f32,
};
@group(0) @binding(1) var<uniform> params : RopeParams;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id : vec3<u32>) {
  let i = global_id.x;
  let half = params.head_dim / 2u;
  if (i >= half) { return; }

  let freq_exp = f32(2u * i) / f32(params.head_dim);
  let angle = f32(params.pos) / pow(params.theta_base, freq_exp);
  let c = cos(angle);
  let s = sin(angle);

  let x0 = qk[i];
  let x1 = qk[i + half];
  qk[i] = x0 * c - x1 * s;
  qk[i + half] = x1 * c + x0 * s;
}
`;

export interface GemmaConfig {
  modelId: string;
  vocabSize: number;
  dim: number;
  hiddenDim: number;
  numLayers: number;
  numHeads: number;
  numKVHeads: number;
  headDim: number;
  contextLen: number;
}

export const GEMMA_2B_CONFIG: GemmaConfig = {
  modelId: "google/gemma-2-2b-it",
  vocabSize: 256000,
  dim: 2048,
  hiddenDim: 16384,
  numLayers: 18,
  numHeads: 8,
  numKVHeads: 1,
  headDim: 256,
  contextLen: 8192,
};

export const GEMMA_4_E2B_CONFIG: GemmaConfig = {
  modelId: "google/gemma-4-e2b-it",
  vocabSize: 256000,
  dim: 2560,
  hiddenDim: 20480,
  numLayers: 26,
  numHeads: 10,
  numKVHeads: 2,
  headDim: 256,
  contextLen: 32768,
};

export interface GemmaForwardPassResult {
  modelId: string;
  engineVersion: string;
  dim: number;
  hiddenDim: number;
  tokenPosition: number;
  postResidualL2Norm: number;
  topAttentionProbs: number[];
  firstHiddenActivations: number[];
  latencyMs: number;
}

/**
 * Execute a deterministic Gemma 4 Transformer Layer Step (RoPE + Attention Softmax + RMSNorm + GeGLU MLP)
 * directly on the Bare-Metal Rust 2024 FFI Engine (`carbon_ffi`).
 */
export function executeGemma4NativeForwardStep(
  dim = 128,
  hiddenDim = 512,
  tokenPosition = 7,
): GemmaForwardPassResult {
  const t0 = performance.now();

  const hidden = new Float32Array(dim);
  const normW = new Float32Array(dim);
  for (let i = 0; i < dim; i++) {
    hidden[i] = Math.sin(i * 0.13 + 0.5) * 0.5;
    normW[i] = 0.05 * Math.cos(i * 0.07);
  }

  // Apply Rotary Positional Embedding (RoPE) across 4 heads of headDim = dim / 4
  const headDim = Math.floor(dim / 4);
  nativeRopeInplace(hidden, headDim, 4, tokenPosition, 10_000.0);

  // Compute attention score distribution over 8 context positions
  const attnLogits = new Float32Array([
    1.2, 0.4, -0.3, 2.5, 0.8, 1.9, 0.1, 3.1,
  ]);
  nativeSoftmax(attnLogits, 0.8);

  // Initialize deterministic compact projection matrices for GeGLU MLP step
  const gateW = new Float32Array(hiddenDim * dim);
  const upW = new Float32Array(hiddenDim * dim);
  const downW = new Float32Array(dim * hiddenDim);

  const scale = 1.0 / Math.sqrt(dim);
  for (let i = 0; i < gateW.length; i++) {
    gateW[i] =
      (((i * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff - 0.5) * scale;
    upW[i] = (((i * 214013 + 2531011) & 0x7fffffff) / 0x7fffffff - 0.5) * scale;
    downW[i] =
      (((i * 1664525 + 1013904223) & 0x7fffffff) / 0x7fffffff - 0.5) * scale;
  }

  const { l2Norm } = nativeGemmaLayerStep(
    hidden,
    normW,
    gateW,
    upW,
    downW,
    dim,
    hiddenDim,
  );

  const t1 = performance.now();

  return {
    modelId: GEMMA_4_E2B_CONFIG.modelId,
    engineVersion: getNativeEngineVersion(),
    dim,
    hiddenDim,
    tokenPosition,
    postResidualL2Norm: Number(l2Norm.toFixed(6)),
    topAttentionProbs: Array.from(attnLogits).map((v) => Number(v.toFixed(5))),
    firstHiddenActivations: Array.from(hidden.slice(0, 8)).map((v) =>
      Number(v.toFixed(5)),
    ),
    latencyMs: Number((t1 - t0).toFixed(3)),
  };
}
