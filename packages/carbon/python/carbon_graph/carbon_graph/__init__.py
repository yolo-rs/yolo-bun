# Copyright 2026 Google LLC
# SPDX-License-Identifier: Apache-2.0

import json
from pathlib import Path
from typing import Any

GRAPH_JSON_PATH = (
    Path(__file__).resolve().parents[3]
    / "packages"
    / "graph-engine"
    / "src"
    / "bun-architecture-graph.json"
)


def load_codebase_graph() -> dict[str, Any]:
    if GRAPH_JSON_PATH.exists():
        with open(GRAPH_JSON_PATH, encoding="utf-8") as f:
            return json.load(f)
    return {
        "generatedAt": "",
        "bunVersion": "1.4.4",
        "totalNodes": 0,
        "totalEdges": 0,
        "workspaceCrateCount": 134,
        "subsystems": [],
        "nodes": [],
        "edges": [],
    }


def query_subsystems(subsystem_name: str) -> list[dict[str, Any]]:
    graph = load_codebase_graph()
    q = subsystem_name.lower()
    return [
        node
        for node in graph.get("nodes", [])
        if q in node.get("subsystem", "").lower() or q in node.get("name", "").lower()
    ]


def get_graph_summary() -> None:
    graph = load_codebase_graph()
    print("=== GOOGLE DEEPMIND CARBON // BUN UPSTREAM ARCHITECTURE GRAPH ===")
    print(f"Bun Version:      {graph.get('bunVersion')}")
    print(f"Workspace Crates: {graph.get('workspaceCrateCount', 134)}")
    print(f"Total Nodes:      {graph.get('totalNodes')}")
    print(f"Total Subsystems: {len(graph.get('subsystems', []))}")
    print(f"Total Edges:      {graph.get('totalEdges')}")
    print("Sample Subsystems:", ", ".join(graph.get("subsystems", [])[:12]))


if __name__ == "__main__":
    get_graph_summary()
