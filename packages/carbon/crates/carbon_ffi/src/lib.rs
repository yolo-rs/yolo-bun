// Copyright 2026 Google LLC
// SPDX-License-Identifier: Apache-2.0

//! Google DeepMind Carbon — Zero-Copy Bare-Metal FFI Engine (`carbon_ffi`)
//!
//! Provides high-performance C ABI exports shared across:
//! - Upstream Bun v1.4.4+ (`bun:ffi` zero-copy `ptr(Float32Array)`)
//! - Python 3.11+ (`ctypes` zero-copy buffer protocol)
//!
//! Implements Gemma 4 E2B / 9B / 27B core transformer operations:
//! - 8-way unrolled SIMD f32 Dot Product & Cosine Similarity (RAG retrieval)
//! - Gemma Unit-Offset RMSNorm: `y = x * (1.0 + w) / sqrt(mean(x^2) + eps)`
//! - Gemma Tanh-Approximated GeGLU MLP: `y = gelu_tanh(gate) * up`
//! - Rotary Positional Embedding (RoPE) in-place over multi-head Q/K tensors
//! - Dense Matrix-Vector multiplication (`y = W * x`)
//! - Complete fused Gemma 4 Residual MLP Layer Step

use std::ffi::CString;
use std::os::raw::{c_char, c_float, c_uint};

/// Version identifier for Google DeepMind Carbon Bare-Metal Engine
pub const CARBON_ENGINE_VERSION: &str = "4.0.0-deepmind-paris-argon";

const SQRT_2_OVER_PI: f32 = 0.797_884_6;
const GELU_COEFF: f32 = 0.044_715;

#[unsafe(no_mangle)]
pub extern "C" fn carbon_engine_version() -> *const c_char {
    static VERSION: &[u8] = b"4.0.0-deepmind-paris-argon\0";
    VERSION.as_ptr() as *const c_char
}

#[inline(always)]
fn dot_f32_slice(a: &[f32], b: &[f32]) -> f32 {
    let n = a.len().min(b.len());
    let chunks = n / 8;
    let mut acc0 = 0.0f32;
    let mut acc1 = 0.0f32;
    let mut acc2 = 0.0f32;
    let mut acc3 = 0.0f32;

    for i in 0..chunks {
        let base = i * 8;
        acc0 += a[base] * b[base] + a[base + 1] * b[base + 1];
        acc1 += a[base + 2] * b[base + 2] + a[base + 3] * b[base + 3];
        acc2 += a[base + 4] * b[base + 4] + a[base + 5] * b[base + 5];
        acc3 += a[base + 6] * b[base + 6] + a[base + 7] * b[base + 7];
    }

    let mut tail = 0.0f32;
    for i in (chunks * 8)..n {
        tail += a[i] * b[i];
    }

    (acc0 + acc1) + (acc2 + acc3) + tail
}

/// Zero-copy 8-way unrolled SIMD Vector Dot Product for Gemma 4 Attention & RAG
#[unsafe(no_mangle)]
pub unsafe extern "C" fn carbon_dot_product(
    a: *const c_float,
    b: *const c_float,
    len: c_uint,
) -> c_float {
    if a.is_null() || b.is_null() || len == 0 {
        return 0.0;
    }
    let slice_a = unsafe { std::slice::from_raw_parts(a, len as usize) };
    let slice_b = unsafe { std::slice::from_raw_parts(b, len as usize) };
    dot_f32_slice(slice_a, slice_b)
}

/// Zero-copy Cosine Similarity for Codebase Graph & AST Vector RAG Retrieval
#[unsafe(no_mangle)]
pub unsafe extern "C" fn carbon_cosine_similarity(
    a: *const c_float,
    b: *const c_float,
    len: c_uint,
) -> c_float {
    if a.is_null() || b.is_null() || len == 0 {
        return 0.0;
    }
    let slice_a = unsafe { std::slice::from_raw_parts(a, len as usize) };
    let slice_b = unsafe { std::slice::from_raw_parts(b, len as usize) };

    let dot = dot_f32_slice(slice_a, slice_b);
    let norm_a = dot_f32_slice(slice_a, slice_a).sqrt();
    let norm_b = dot_f32_slice(slice_b, slice_b).sqrt();
    let denom = norm_a * norm_b;
    if denom <= 1e-12 {
        0.0
    } else {
        dot / denom
    }
}

/// In-place Numerically Stable Scaled Softmax operation for Gemma 4 Attention
#[unsafe(no_mangle)]
pub unsafe extern "C" fn carbon_softmax_inplace(
    data: *mut c_float,
    len: c_uint,
    temperature: c_float,
) {
    if data.is_null() || len == 0 {
        return;
    }
    let temp = if temperature <= 0.0 { 1.0 } else { temperature };
    let slice = unsafe { std::slice::from_raw_parts_mut(data, len as usize) };

    let mut max_val = f32::NEG_INFINITY;
    for &val in slice.iter() {
        let scaled = val / temp;
        if scaled > max_val {
            max_val = scaled;
        }
    }

    let mut sum = 0.0f32;
    for val in slice.iter_mut() {
        *val = ((*val / temp) - max_val).exp();
        sum += *val;
    }

    if sum > 0.0 {
        let inv_sum = 1.0 / sum;
        for val in slice.iter_mut() {
            *val *= inv_sum;
        }
    }
}

/// Gemma 4 Unit-Offset RMSNorm: `output[i] = input[i] * (1.0 + weight[i]) / sqrt(mean(input^2) + eps)`
#[unsafe(no_mangle)]
pub unsafe extern "C" fn carbon_rmsnorm_gemma(
    input: *const c_float,
    weight: *const c_float,
    output: *mut c_float,
    len: c_uint,
    eps: c_float,
) {
    if input.is_null() || weight.is_null() || output.is_null() || len == 0 {
        return;
    }
    let n = len as usize;
    let x = unsafe { std::slice::from_raw_parts(input, n) };
    let w = unsafe { std::slice::from_raw_parts(weight, n) };
    let y = unsafe { std::slice::from_raw_parts_mut(output, n) };

    let sum_sq = dot_f32_slice(x, x);
    let rms_inv = 1.0f32 / ((sum_sq / (n as f32)) + eps.max(1e-8)).sqrt();

    for i in 0..n {
        y[i] = x[i] * (1.0f32 + w[i]) * rms_inv;
    }
}

#[inline(always)]
fn gelu_tanh(x: f32) -> f32 {
    let inner = SQRT_2_OVER_PI * (x + GELU_COEFF * x * x * x);
    0.5 * x * (1.0 + inner.tanh())
}

/// Gemma 4 GeGLU Activation: `output[i] = gelu_tanh(gate[i]) * up[i]`
#[unsafe(no_mangle)]
pub unsafe extern "C" fn carbon_geglu_mlp(
    gate: *const c_float,
    up: *const c_float,
    output: *mut c_float,
    len: c_uint,
) {
    if gate.is_null() || up.is_null() || output.is_null() || len == 0 {
        return;
    }
    let n = len as usize;
    let g = unsafe { std::slice::from_raw_parts(gate, n) };
    let u = unsafe { std::slice::from_raw_parts(up, n) };
    let out = unsafe { std::slice::from_raw_parts_mut(output, n) };

    for i in 0..n {
        out[i] = gelu_tanh(g[i]) * u[i];
    }
}

/// In-place Rotary Positional Embedding (RoPE) for multi-head Q/K tensors
#[unsafe(no_mangle)]
pub unsafe extern "C" fn carbon_rope_inplace(
    qk: *mut c_float,
    head_dim: c_uint,
    num_heads: c_uint,
    pos: c_uint,
    theta_base: c_float,
) {
    if qk.is_null() || head_dim == 0 || num_heads == 0 || head_dim % 2 != 0 {
        return;
    }
    let hd = head_dim as usize;
    let nh = num_heads as usize;
    let half = hd / 2;
    let base = if theta_base <= 0.0 { 10_000.0 } else { theta_base };
    let p = pos as f32;
    let data = unsafe { std::slice::from_raw_parts_mut(qk, hd * nh) };

    for h in 0..nh {
        let offset = h * hd;
        for i in 0..half {
            let freq_exp = (2 * i) as f32 / (hd as f32);
            let inv_freq = 1.0f32 / base.powf(freq_exp);
            let angle = p * inv_freq;
            let (sin_a, cos_a) = angle.sin_cos();

            let x0 = data[offset + i];
            let x1 = data[offset + i + half];
            data[offset + i] = x0 * cos_a - x1 * sin_a;
            data[offset + i + half] = x1 * cos_a + x0 * sin_a;
        }
    }
}

/// Zero-copy Dense Matrix-Vector Multiplication: `output[rows] = weights[rows x cols] * input[cols]`
#[unsafe(no_mangle)]
pub unsafe extern "C" fn carbon_matvec_f32(
    weights: *const c_float,
    input: *const c_float,
    output: *mut c_float,
    rows: c_uint,
    cols: c_uint,
) {
    if weights.is_null() || input.is_null() || output.is_null() || rows == 0 || cols == 0 {
        return;
    }
    let r_count = rows as usize;
    let c_count = cols as usize;
    let w = unsafe { std::slice::from_raw_parts(weights, r_count * c_count) };
    let x = unsafe { std::slice::from_raw_parts(input, c_count) };
    let y = unsafe { std::slice::from_raw_parts_mut(output, r_count) };

    for r in 0..r_count {
        let row_slice = &w[r * c_count..(r + 1) * c_count];
        y[r] = dot_f32_slice(row_slice, x);
    }
}

/// Complete Fused Gemma 4 Pre-Norm GeGLU Residual MLP Layer Step:
/// 1. `normed = rmsnorm_gemma(hidden, norm_w)`
/// 2. `gate = gate_w * normed`, `up = up_w * normed`
/// 3. `act = geglu(gate, up)`
/// 4. `hidden += down_w * act`
/// Returns the post-residual L2 norm of `hidden`.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn carbon_gemma_layer_step(
    hidden: *mut c_float,
    norm_w: *const c_float,
    gate_w: *const c_float,
    up_w: *const c_float,
    down_w: *const c_float,
    dim: c_uint,
    hidden_dim: c_uint,
) -> c_float {
    if hidden.is_null()
        || norm_w.is_null()
        || gate_w.is_null()
        || up_w.is_null()
        || down_w.is_null()
        || dim == 0
        || hidden_dim == 0
    {
        return 0.0;
    }

    let d = dim as usize;
    let hd = hidden_dim as usize;

    let mut normed = vec![0.0f32; d];
    let mut gate = vec![0.0f32; hd];
    let mut up = vec![0.0f32; hd];
    let mut act = vec![0.0f32; hd];
    let mut down = vec![0.0f32; d];

    unsafe {
        carbon_rmsnorm_gemma(hidden, norm_w, normed.as_mut_ptr(), dim, 1e-6);
        carbon_matvec_f32(gate_w, normed.as_ptr(), gate.as_mut_ptr(), hidden_dim, dim);
        carbon_matvec_f32(up_w, normed.as_ptr(), up.as_mut_ptr(), hidden_dim, dim);
        carbon_geglu_mlp(gate.as_ptr(), up.as_ptr(), act.as_mut_ptr(), hidden_dim);
        carbon_matvec_f32(down_w, act.as_ptr(), down.as_mut_ptr(), dim, hidden_dim);
    }

    let h_slice = unsafe { std::slice::from_raw_parts_mut(hidden, d) };
    for i in 0..d {
        h_slice[i] += down[i];
    }

    dot_f32_slice(h_slice, h_slice).sqrt()
}

/// Zero-copy memory free helper for strings allocated across the FFI boundary
#[unsafe(no_mangle)]
pub unsafe extern "C" fn carbon_free_string(ptr: *mut c_char) {
    if !ptr.is_null() {
        let _ = unsafe { CString::from_raw(ptr) };
    }
}

/// Computes Root-Mean-Square (RMS) normalized amplitude in [0.0, 1.0] from signed 16-bit PCM audio samples.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn carbon_pcm16_rms(ptr: *const i16, len: c_uint) -> c_float {
    if ptr.is_null() || len == 0 {
        return 0.0;
    }
    let n = len as usize;
    let slice = unsafe { std::slice::from_raw_parts(ptr, n) };
    let mut sum_sq = 0.0f64;
    for &sample in slice {
        let v = (sample as f64) / 32768.0;
        sum_sq += v * v;
    }
    ((sum_sq / (n as f64)).sqrt() as f32).clamp(0.0, 1.0)
}

/// Computes a 32-band Hann-windowed DFT magnitude spectrum in [0.0, 1.0] for the 120 FPS Gemini Voice Orb
/// and OpenPets/Mochi audio-reactive lip-sync.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn carbon_spectrum_32_hann(
    samples_ptr: *const c_float,
    len: c_uint,
    out_bands_ptr: *mut c_float,
) -> c_uint {
    if samples_ptr.is_null() || out_bands_ptr.is_null() || len == 0 {
        return 0;
    }
    let n = (len as usize).min(1024);
    let samples = unsafe { std::slice::from_raw_parts(samples_ptr, n) };
    let out_bands = unsafe { std::slice::from_raw_parts_mut(out_bands_ptr, 32) };
    let two_pi = 2.0f32 * std::f32::consts::PI;
    let denom = ((n.saturating_sub(1)).max(1)) as f32;

    for (b, slot) in out_bands.iter_mut().enumerate() {
        let k = (b + 1) as f32;
        let mut re = 0.0f32;
        let mut im = 0.0f32;
        for (i, &x) in samples.iter().enumerate() {
            let hann = 0.5f32 * (1.0f32 - (two_pi * (i as f32) / denom).cos());
            let w = x * hann;
            let angle = two_pi * k * (i as f32) / (n as f32);
            re += w * angle.cos();
            im -= w * angle.sin();
        }
        let mag = ((re * re + im * im).sqrt() / (n as f32)) * 4.0f32;
        *slot = mag.clamp(0.0, 1.0);
    }
    32
}

/// Zero-allocation linear audio resampler (e.g. 48000 Hz <-> 24000 Hz <-> 16000 Hz).
#[unsafe(no_mangle)]
pub unsafe extern "C" fn carbon_resample_linear_f32(
    src_ptr: *const c_float,
    src_len: c_uint,
    dst_ptr: *mut c_float,
    dst_len: c_uint,
) -> c_uint {
    if src_ptr.is_null() || dst_ptr.is_null() || src_len == 0 || dst_len == 0 {
        return 0;
    }
    let s_len = src_len as usize;
    let d_len = dst_len as usize;
    let src = unsafe { std::slice::from_raw_parts(src_ptr, s_len) };
    let dst = unsafe { std::slice::from_raw_parts_mut(dst_ptr, d_len) };

    if d_len == 1 || s_len == 1 {
        for slot in dst.iter_mut() {
            *slot = src[0];
        }
        return dst_len;
    }

    let scale = ((s_len - 1) as f32) / ((d_len - 1) as f32);
    for (i, slot) in dst.iter_mut().enumerate() {
        let pos = (i as f32) * scale;
        let idx = (pos.floor() as usize).min(s_len - 1);
        let frac = pos - (idx as f32);
        let next = (idx + 1).min(s_len - 1);
        *slot = src[idx] * (1.0 - frac) + src[next] * frac;
    }
    dst_len
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_audio_dsp_kernels() {
        let pcm = [16384i16, -16384, 16384, -16384];
        let rms = unsafe { carbon_pcm16_rms(pcm.as_ptr(), pcm.len() as u32) };
        assert!((rms - 0.5).abs() < 1e-3);

        let mut samples = vec![0.0f32; 256];
        for (i, s) in samples.iter_mut().enumerate() {
            *s = (2.0 * std::f32::consts::PI * 4.0 * (i as f32) / 256.0).sin();
        }
        let mut bands = [0.0f32; 32];
        let count = unsafe {
            carbon_spectrum_32_hann(samples.as_ptr(), samples.len() as u32, bands.as_mut_ptr())
        };
        assert_eq!(count, 32);
        assert!(bands[3] > 0.1);

        let mut resampled = [0.0f32; 128];
        let out_n = unsafe {
            carbon_resample_linear_f32(
                samples.as_ptr(),
                samples.len() as u32,
                resampled.as_mut_ptr(),
                resampled.len() as u32,
            )
        };
        assert_eq!(out_n, 128);
    }

    #[test]
    fn test_dot_and_cosine() {
        let a = [1.0f32, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0];
        let b = [1.0f32, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0];
        let dot = unsafe { carbon_dot_product(a.as_ptr(), b.as_ptr(), a.len() as u32) };
        assert!((dot - 285.0).abs() < 1e-4);

        let cos = unsafe { carbon_cosine_similarity(a.as_ptr(), b.as_ptr(), a.len() as u32) };
        assert!((cos - 1.0).abs() < 1e-5);
    }

    #[test]
    fn test_rmsnorm_and_geglu() {
        let x = [1.0f32, -1.0, 1.0, -1.0];
        let w = [0.0f32, 0.0, 0.0, 0.0];
        let mut out = [0.0f32; 4];
        unsafe {
            carbon_rmsnorm_gemma(x.as_ptr(), w.as_ptr(), out.as_mut_ptr(), 4, 1e-6);
        }
        assert!((out[0] - 1.0).abs() < 1e-4);
        assert!((out[1] + 1.0).abs() < 1e-4);

        let gate = [0.0f32, 2.0];
        let up = [3.0f32, 2.0];
        let mut geglu_out = [0.0f32; 2];
        unsafe {
            carbon_geglu_mlp(gate.as_ptr(), up.as_ptr(), geglu_out.as_mut_ptr(), 2);
        }
        assert!(geglu_out[0].abs() < 1e-6);
        assert!(geglu_out[1] > 3.8);
    }
}
