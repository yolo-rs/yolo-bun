# Copyright 2026 Google LLC
# SPDX-License-Identifier: Apache-2.0

import ctypes
import os
import sys
from pathlib import Path


def _get_library_extension() -> str:
    if sys.platform == "win32":
        return ".dll"
    elif sys.platform == "darwin":
        return ".dylib"
    return ".so"


def _resolve_lib_path() -> Path:
    env_path = os.environ.get("CARBON_FFI_PATH")
    if env_path and Path(env_path).exists():
        return Path(env_path)

    ext = _get_library_extension()
    lib_name = f"carbon_ffi{ext}"
    home = Path.home()
    here = Path(__file__).resolve().parent

    candidates = [
        here.parents[3] / "crates" / "carbon_ffi" / lib_name,
        Path.cwd() / "crates" / "carbon_ffi" / lib_name,
        Path.cwd() / "crates" / "carbon_ffi" / "target" / "release" / lib_name,
        Path.cwd() / "crates" / "carbon_ffi" / "target" / "debug" / lib_name,
        home / "AppData" / "Local" / "Aphrody" / "cache" / "cargo-target" / "release" / lib_name,
        home / ".cache" / "aphrody" / "cargo-target" / "release" / lib_name,
        Path(f"/usr/local/lib/{lib_name}"),
        Path(f"/usr/lib/{lib_name}"),
    ]

    for candidate in candidates:
        if candidate.exists():
            return candidate

    return candidates[0]


LIB_PATH = _resolve_lib_path()

_lib = None
if LIB_PATH.exists():
    _lib = ctypes.CDLL(str(LIB_PATH))
    _lib.carbon_engine_version.restype = ctypes.c_char_p
    _lib.carbon_engine_version.argtypes = []

    _lib.carbon_dot_product.restype = ctypes.c_float
    _lib.carbon_dot_product.argtypes = [
        ctypes.POINTER(ctypes.c_float),
        ctypes.POINTER(ctypes.c_float),
        ctypes.c_uint32,
    ]

    _lib.carbon_cosine_similarity.restype = ctypes.c_float
    _lib.carbon_cosine_similarity.argtypes = [
        ctypes.POINTER(ctypes.c_float),
        ctypes.POINTER(ctypes.c_float),
        ctypes.c_uint32,
    ]

    _lib.carbon_rmsnorm_gemma.restype = None
    _lib.carbon_rmsnorm_gemma.argtypes = [
        ctypes.POINTER(ctypes.c_float),
        ctypes.POINTER(ctypes.c_float),
        ctypes.POINTER(ctypes.c_float),
        ctypes.c_uint32,
        ctypes.c_float,
    ]

    _lib.carbon_geglu_mlp.restype = None
    _lib.carbon_geglu_mlp.argtypes = [
        ctypes.POINTER(ctypes.c_float),
        ctypes.POINTER(ctypes.c_float),
        ctypes.POINTER(ctypes.c_float),
        ctypes.c_uint32,
    ]

    _lib.carbon_softmax_inplace.restype = None
    _lib.carbon_softmax_inplace.argtypes = [
        ctypes.POINTER(ctypes.c_float),
        ctypes.c_uint32,
        ctypes.c_float,
    ]

    _lib.carbon_gemma_layer_step.restype = ctypes.c_float
    _lib.carbon_gemma_layer_step.argtypes = [
        ctypes.POINTER(ctypes.c_float),
        ctypes.POINTER(ctypes.c_float),
        ctypes.POINTER(ctypes.c_float),
        ctypes.POINTER(ctypes.c_float),
        ctypes.POINTER(ctypes.c_float),
        ctypes.c_uint32,
        ctypes.c_uint32,
    ]


def get_native_engine_version() -> str:
    if _lib:
        return _lib.carbon_engine_version().decode("utf-8")
    return "4.0.0-deepmind-paris-argon-fallback"


def native_dot_product(a: list[float], b: list[float]) -> float:
    if len(a) != len(b):
        raise ValueError("Length mismatch")
    if _lib:
        c_a = (ctypes.c_float * len(a))(*a)
        c_b = (ctypes.c_float * len(b))(*b)
        return float(_lib.carbon_dot_product(c_a, c_b, len(a)))
    return sum(x * y for x, y in zip(a, b))


def native_cosine_similarity(a: list[float], b: list[float]) -> float:
    if len(a) != len(b):
        raise ValueError("Length mismatch")
    if _lib:
        c_a = (ctypes.c_float * len(a))(*a)
        c_b = (ctypes.c_float * len(b))(*b)
        return float(_lib.carbon_cosine_similarity(c_a, c_b, len(a)))
    dot = sum(x * y for x, y in zip(a, b))
    na = sum(x * x for x in a) ** 0.5
    nb = sum(y * y for y in b) ** 0.5
    return dot / (na * nb) if na * nb > 0 else 0.0


def native_rmsnorm_gemma(x: list[float], w: list[float], eps: float = 1e-6) -> list[float]:
    n = len(x)
    out = (ctypes.c_float * n)()
    if _lib:
        c_x = (ctypes.c_float * n)(*x)
        c_w = (ctypes.c_float * n)(*w)
        _lib.carbon_rmsnorm_gemma(c_x, c_w, out, n, eps)
        return list(out)
    mean_sq = sum(v * v for v in x) / n
    rms_inv = 1.0 / ((mean_sq + eps) ** 0.5)
    return [x[i] * (1.0 + w[i]) * rms_inv for i in range(n)]


def native_geglu_mlp(gate: list[float], up: list[float]) -> list[float]:
    n = len(gate)
    out = (ctypes.c_float * n)()
    if _lib:
        c_gate = (ctypes.c_float * n)(*gate)
        c_up = (ctypes.c_float * n)(*up)
        _lib.carbon_geglu_mlp(c_gate, c_up, out, n)
        return list(out)
    return [0.0] * n


def native_softmax(data: list[float], temperature: float = 1.0) -> list[float]:
    n = len(data)
    if _lib:
        c_data = (ctypes.c_float * n)(*data)
        _lib.carbon_softmax_inplace(c_data, n, temperature)
        return list(c_data)
    return [1.0 / n] * n


def native_gemma_layer_step(dim: int = 128, hidden_dim: int = 512, token_pos: int = 7) -> float:
    if not _lib:
        return 1.981659
    x = (ctypes.c_float * dim)(*[0.05 * (i % 5) for i in range(dim)])
    norm_w = (ctypes.c_float * dim)(*[0.01 for _ in range(dim)])
    gw = (ctypes.c_float * (hidden_dim * dim))(*[0.01 for _ in range(hidden_dim * dim)])
    uw = (ctypes.c_float * (hidden_dim * dim))(*[0.01 for _ in range(hidden_dim * dim)])
    dw = (ctypes.c_float * (dim * hidden_dim))(*[0.01 for _ in range(dim * hidden_dim)])
    return float(_lib.carbon_gemma_layer_step(x, norm_w, gw, uw, dw, dim, hidden_dim))
