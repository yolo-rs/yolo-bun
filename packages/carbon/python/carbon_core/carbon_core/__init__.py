# Copyright 2026 Google LLC
# SPDX-License-Identifier: Apache-2.0

import json
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from .ffi import (
    get_native_engine_version,
    native_cosine_similarity,
    native_dot_product,
    native_geglu_mlp,
    native_gemma_layer_step,
    native_rmsnorm_gemma,
    native_softmax,
)

DATA_PATH = Path(__file__).resolve().parents[3] / "packages" / "core" / "src" / "data.json"


def load_carbon_data() -> dict[str, Any]:
    if DATA_PATH.exists():
        with open(DATA_PATH, encoding="utf-8") as f:
            return json.load(f)
    return {
        "lastUpdated": datetime.now(UTC).isoformat(),
        "version": "4.0.0-deepmind-paris-argon",
        "engine": "Google DeepMind Carbon // Paris (europe-west9) Beta -> Global Scale Architecture",
        "news": [],
        "changelog": [],
        "bestPractices": [],
        "gcloudCliSetup": [],
    }


def save_carbon_data(data: dict[str, Any]) -> None:
    data["lastUpdated"] = datetime.now(UTC).isoformat()
    with open(DATA_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)


__all__ = [
    "get_native_engine_version",
    "load_carbon_data",
    "native_cosine_similarity",
    "native_dot_product",
    "native_geglu_mlp",
    "native_gemma_layer_step",
    "native_rmsnorm_gemma",
    "native_softmax",
    "save_carbon_data",
]
