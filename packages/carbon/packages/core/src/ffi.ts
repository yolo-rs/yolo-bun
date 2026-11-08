// Copyright 2026 Google LLC
// SPDX-License-Identifier: Apache-2.0

import { dlopen, FFIType, ptr } from "bun:ffi";
import { resolve } from "node:path";
import { existsSync } from "node:fs";
import { homedir } from "node:os";

function getLibraryExtension(): string {
  switch (process.platform) {
    case "win32":
      return ".dll";
    case "darwin":
      return ".dylib";
    default:
      return ".so";
  }
}

function resolveCarbonFfiPath(): string {
  if (process.env.CARBON_FFI_PATH && existsSync(process.env.CARBON_FFI_PATH)) {
    return process.env.CARBON_FFI_PATH;
  }

  const ext = getLibraryExtension();
  const libName = `carbon_ffi${ext}`;

  const candidates = [
    resolve(import.meta.dir, `../../../crates/carbon_ffi/${libName}`),
    resolve(process.cwd(), `crates/carbon_ffi/${libName}`),
    resolve(process.cwd(), `crates/carbon_ffi/target/release/${libName}`),
    resolve(process.cwd(), `crates/carbon_ffi/target/debug/${libName}`),
    resolve(
      homedir(),
      `AppData/Local/Aphrody/cache/cargo-target/release/${libName}`,
    ),
    resolve(homedir(), `.cache/aphrody/cargo-target/release/${libName}`),
    resolve(`/usr/local/lib/${libName}`),
    resolve(`/usr/lib/${libName}`),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  return candidates[0];
}

const libPath = resolveCarbonFfiPath();

export const libCarbon = dlopen(libPath, {
  carbon_engine_version: {
    args: [],
    returns: FFIType.cstring,
  },
  carbon_dot_product: {
    args: [FFIType.ptr, FFIType.ptr, FFIType.u32],
    returns: FFIType.f32,
  },
  carbon_cosine_similarity: {
    args: [FFIType.ptr, FFIType.ptr, FFIType.u32],
    returns: FFIType.f32,
  },
  carbon_softmax_inplace: {
    args: [FFIType.ptr, FFIType.u32, FFIType.f32],
    returns: FFIType.void,
  },
  carbon_rmsnorm_gemma: {
    args: [FFIType.ptr, FFIType.ptr, FFIType.ptr, FFIType.u32, FFIType.f32],
    returns: FFIType.void,
  },
  carbon_geglu_mlp: {
    args: [FFIType.ptr, FFIType.ptr, FFIType.ptr, FFIType.u32],
    returns: FFIType.void,
  },
  carbon_rope_inplace: {
    args: [FFIType.ptr, FFIType.u32, FFIType.u32, FFIType.u32, FFIType.f32],
    returns: FFIType.void,
  },
  carbon_matvec_f32: {
    args: [FFIType.ptr, FFIType.ptr, FFIType.ptr, FFIType.u32, FFIType.u32],
    returns: FFIType.void,
  },
  carbon_gemma_layer_step: {
    args: [
      FFIType.ptr,
      FFIType.ptr,
      FFIType.ptr,
      FFIType.ptr,
      FFIType.ptr,
      FFIType.u32,
      FFIType.u32,
    ],
    returns: FFIType.f32,
  },
  carbon_pcm16_rms: {
    args: [FFIType.ptr, FFIType.u32],
    returns: FFIType.f32,
  },
  carbon_spectrum_32_hann: {
    args: [FFIType.ptr, FFIType.u32, FFIType.ptr],
    returns: FFIType.u32,
  },
  carbon_resample_linear_f32: {
    args: [FFIType.ptr, FFIType.u32, FFIType.ptr, FFIType.u32],
    returns: FFIType.u32,
  },
});

export function getNativeEngineVersion(): string {
  const ver = libCarbon.symbols.carbon_engine_version();
  return ver ? ver.toString() : "4.0.0-deepmind-paris-argon";
}

export function nativeDotProduct(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length) {
    throw new Error(
      `Dimension mismatch: a.len=${a.length} != b.len=${b.length}`,
    );
  }
  return libCarbon.symbols.carbon_dot_product(ptr(a), ptr(b), a.length);
}

export function nativeCosineSimilarity(
  a: Float32Array,
  b: Float32Array,
): number {
  if (a.length !== b.length) {
    throw new Error(
      `Dimension mismatch: a.len=${a.length} != b.len=${b.length}`,
    );
  }
  return libCarbon.symbols.carbon_cosine_similarity(ptr(a), ptr(b), a.length);
}

export function nativeSoftmaxInplace(
  tensor: Float32Array,
  temperature = 1.0,
): void {
  libCarbon.symbols.carbon_softmax_inplace(
    ptr(tensor),
    tensor.length,
    temperature,
  );
}

export function nativeRmsNormGemma(
  input: Float32Array,
  weight: Float32Array,
  eps = 1e-6,
): Float32Array {
  const output = new Float32Array(input.length);
  libCarbon.symbols.carbon_rmsnorm_gemma(
    ptr(input),
    ptr(weight),
    ptr(output),
    input.length,
    eps,
  );
  return output;
}

export function nativeGegluMlp(
  gate: Float32Array,
  up: Float32Array,
): Float32Array {
  if (gate.length !== up.length) {
    throw new Error("Dimension mismatch between gate and up projections");
  }
  const output = new Float32Array(gate.length);
  libCarbon.symbols.carbon_geglu_mlp(
    ptr(gate),
    ptr(up),
    ptr(output),
    output.length,
  );
  return output;
}

export function nativeRopeInplace(
  tensor: Float32Array,
  headDim: number,
  numHeads: number,
  tokenPos: number,
  base = 10000.0,
): void {
  libCarbon.symbols.carbon_rope_inplace(
    ptr(tensor),
    headDim,
    numHeads,
    tokenPos,
    base,
  );
}

export function nativeMatVec(
  matrix: Float32Array,
  vector: Float32Array,
  rows: number,
  cols: number,
): Float32Array {
  const output = new Float32Array(rows);
  libCarbon.symbols.carbon_matvec_f32(
    ptr(matrix),
    ptr(vector),
    ptr(output),
    rows,
    cols,
  );
  return output;
}

export function nativeGemmaLayerStep(
  hidden: Float32Array,
  normW: Float32Array,
  gateW: Float32Array,
  upW: Float32Array,
  downW: Float32Array,
  dim: number,
  hiddenDim: number,
): { l2Norm: number } {
  const l2Norm = libCarbon.symbols.carbon_gemma_layer_step(
    ptr(hidden),
    ptr(normW),
    ptr(gateW),
    ptr(upW),
    ptr(downW),
    dim,
    hiddenDim,
  );
  return { l2Norm };
}

export const nativeSoftmax = nativeSoftmaxInplace;
export const nativeGeGluMlp = nativeGegluMlp;
export const nativeMatVecF32 = nativeMatVec;

export function nativePcm16Rms(pcm: Int16Array): number {
  if (pcm.length === 0) return 0;
  return libCarbon.symbols.carbon_pcm16_rms(ptr(pcm), pcm.length);
}

export function nativeSpectrum32Hann(samples: Float32Array): Float32Array {
  const bands = new Float32Array(32);
  if (samples.length === 0) return bands;
  libCarbon.symbols.carbon_spectrum_32_hann(
    ptr(samples),
    samples.length,
    ptr(bands),
  );
  return bands;
}

export function nativeResampleLinearF32(
  src: Float32Array,
  targetLength: number,
): Float32Array {
  const dst = new Float32Array(targetLength);
  if (src.length === 0 || targetLength <= 0) return dst;
  libCarbon.symbols.carbon_resample_linear_f32(
    ptr(src),
    src.length,
    ptr(dst),
    targetLength,
  );
  return dst;
}
