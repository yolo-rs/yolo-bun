# Copyright 2026 Google LLC
# SPDX-License-Identifier: Apache-2.0

from carbon_core import (
    get_native_engine_version,
    native_cosine_similarity,
    native_dot_product,
    native_geglu_mlp,
    native_gemma_layer_step,
    native_rmsnorm_gemma,
    native_softmax,
)


def test_engine_version():
    ver = get_native_engine_version()
    assert "4.0.0-deepmind-paris-argon" in ver


def test_dot_product_and_cosine():
    a = [1.0, 2.0, 3.0]
    b = [1.0, 2.0, 3.0]
    dot = native_dot_product(a, b)
    assert abs(dot - 14.0) < 1e-4
    cos = native_cosine_similarity(a, b)
    assert abs(cos - 1.0) < 1e-4


def test_rmsnorm_and_geglu():
    x = [1.0, -1.0, 1.0, -1.0]
    w = [0.0, 0.0, 0.5, 0.5]
    out = native_rmsnorm_gemma(x, w, 1e-6)
    assert len(out) == 4
    assert abs(out[0] - 1.0) < 1e-3

    gate = [0.0, 2.0]
    up = [5.0, 2.0]
    act = native_geglu_mlp(gate, up)
    assert len(act) == 2
    assert abs(act[0]) < 1e-5


def test_softmax():
    logits = [1.0, 2.0, 3.0]
    probs = native_softmax(logits, 1.0)
    assert abs(sum(probs) - 1.0) < 1e-4
    assert probs[2] > probs[1] > probs[0]


def test_gemma_layer_step():
    l2 = native_gemma_layer_step(64, 256, 3)
    assert l2 > 0.1
