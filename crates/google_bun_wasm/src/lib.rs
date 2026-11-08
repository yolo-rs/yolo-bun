// SPDX-License-Identifier: Apache-2.0
// Rust 2024 SIMD & WebAssembly Compute Kernel for Cloudflare Workers, Browser WebGPU & Native FFI

/// 8-way unrolled dot product for SIMD auto-vectorization on x86_64 AVX2, ARM64 NEON, and WASM SIMD128.
pub fn dot_product_8way(a: &[f32], b: &[f32]) -> f32 {
    let n = a.len().min(b.len());
    let chunks = n / 8;
    let mut s0 = 0.0f32;
    let mut s1 = 0.0f32;
    let mut s2 = 0.0f32;
    let mut s3 = 0.0f32;
    let mut s4 = 0.0f32;
    let mut s5 = 0.0f32;
    let mut s6 = 0.0f32;
    let mut s7 = 0.0f32;

    for i in 0..chunks {
        let base = i * 8;
        s0 += a[base] * b[base];
        s1 += a[base + 1] * b[base + 1];
        s2 += a[base + 2] * b[base + 2];
        s3 += a[base + 3] * b[base + 3];
        s4 += a[base + 4] * b[base + 4];
        s5 += a[base + 5] * b[base + 5];
        s6 += a[base + 6] * b[base + 6];
        s7 += a[base + 7] * b[base + 7];
    }

    let mut tail = 0.0f32;
    for i in (chunks * 8)..n {
        tail += a[i] * b[i];
    }

    (s0 + s1) + (s2 + s3) + (s4 + s5) + (s6 + s7) + tail
}

#[unsafe(no_mangle)]
pub unsafe extern "C" fn simd_dot_product_f32(a: *const f32, b: *const f32, len: usize) -> f32 {
    if a.is_null() || b.is_null() || len == 0 {
        return 0.0;
    }
    let a_slice = unsafe { std::slice::from_raw_parts(a, len) };
    let b_slice = unsafe { std::slice::from_raw_parts(b, len) };
    dot_product_8way(a_slice, b_slice)
}

/// Deterministic synthetic benchmark kernel executing `iterations` of 64-dim 8-way unrolled dot products in WASM/Native without FFI boundary copying overhead.
#[unsafe(no_mangle)]
pub extern "C" fn bench_simd_dot_64d(iterations: u32) -> f32 {
    let a = [1.05f32; 64];
    let b = [0.95f32; 64];
    let mut acc = 0.0f32;
    for i in 0..iterations {
        acc += dot_product_8way(&a, &b) * ((i & 1) as f32 + 0.5);
    }
    acc
}

/// Computes WCAG 2.2 relative luminance contrast ratio between foreground and background RGB in [0.0, 1.0].
#[unsafe(no_mangle)]
pub extern "C" fn stargardt_wcag_contrast_ratio(
    fg_r: f32,
    fg_g: f32,
    fg_b: f32,
    bg_r: f32,
    bg_g: f32,
    bg_b: f32,
) -> f32 {
    fn rel_channel(c: f32) -> f32 {
        if c <= 0.03928 {
            c / 12.92
        } else {
            ((c + 0.055) / 1.055).powf(2.4)
        }
    }
    let l1 = 0.2126 * rel_channel(fg_r) + 0.7152 * rel_channel(fg_g) + 0.0722 * rel_channel(fg_b);
    let l2 = 0.2126 * rel_channel(bg_r) + 0.7152 * rel_channel(bg_g) + 0.0722 * rel_channel(bg_b);
    let lighter = l1.max(l2);
    let darker = l1.min(l2);
    (lighter + 0.05) / (darker + 0.05)
}

/// Computes Stargardt peripheral scotoma radial smoothstep compensation in [0.0, 1.0].
#[unsafe(no_mangle)]
pub extern "C" fn scotoma_radial_compensation(uv_x: f32, uv_y: f32, zoom: f32) -> f32 {
    let dx = (uv_x - 0.5) * zoom;
    let dy = (uv_y - 0.5) * zoom;
    let dist = (dx * dx + dy * dy).sqrt();
    let t = ((dist - 0.08) / (0.35 - 0.08)).clamp(0.0, 1.0);
    t * t * (3.0 - 2.0 * t)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_dot_product_8way_accuracy() {
        let a = vec![2.0f32; 64];
        let b = vec![3.0f32; 64];
        assert_eq!(dot_product_8way(&a, &b), 384.0);
    }

    #[test]
    fn test_stargardt_contrast_ratio_wcag_aaa() {
        // Amber (#ffb74d) on OLED Black (#05080c)
        let ratio = stargardt_wcag_contrast_ratio(1.0, 0.718, 0.302, 0.0196, 0.0314, 0.0471);
        assert!(ratio > 11.0, "Expected WCAG AAA contrast > 7.0, got {ratio}");
    }

    #[test]
    fn test_scotoma_radial_compensation() {
        assert_eq!(scotoma_radial_compensation(0.5, 0.5, 1.85), 0.0);
        assert_eq!(scotoma_radial_compensation(1.0, 1.0, 1.85), 1.0);
    }
}
