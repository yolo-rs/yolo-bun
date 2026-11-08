# Copyright 2026 Google LLC
# SPDX-License-Identifier: Apache-2.0

import sys
import time
from datetime import UTC, datetime

from carbon_core import (
    get_native_engine_version,
    load_carbon_data,
    native_cosine_similarity,
    native_dot_product,
    save_carbon_data,
)


def cli_entry() -> None:
    args = sys.argv[1:]
    command = args[0] if args else "status"
    data = load_carbon_data()

    if command == "status":
        print("=== GOOGLE DEEPMIND CARBON // PYTHON UV CONTROL PLANE ===")
        print(f"Engine:             {data.get('engine')}")
        print(f"Native Rust Kernel: {get_native_engine_version()}")
        print(f"Version:            {data.get('version')}")
        print(f"Primary Region:     {data.get('primaryRegion')}")
        print(f"Last Synced:        {data.get('lastUpdated')}")
        print(
            f"Tracked Items:      {len(data.get('news', []))} News | {len(data.get('changelog', []))} Releases | {len(data.get('bestPractices', []))} Best Practices"
        )

    elif command == "news":
        print("=== GOOGLE DEEPMIND, VERTEX AI & CARBON INTELLIGENCE FEED ===")
        for item in data.get("news", []):
            print(f"\n[{item['date']}] [{item['category'].upper()}] {item['title']}")
            print(f"Summary: {item['summary']}")
            print(f"URL: {item['url']}")

    elif command == "changelog":
        print("=== GOOGLE DEEPMIND CARBON CHANGELOG ===")
        for release in data.get("changelog", []):
            print(f"\nVersion: {release['version']} ({release['date']})")
            for change in release.get("changes", []):
                print(f"  - {change}")

    elif command == "practices":
        print("=== VERTEX AI & CARBON PRODUCTION BEST PRACTICES ===")
        for bp in data.get("bestPractices", []):
            print(f"\n[{bp['category']}] {bp['rule']}")
            print(f"  {bp['description']}")

    elif command == "gcloud":
        print("=== GOOGLE CLOUD FIRST DEPLOYMENT (PARIS EUROPE-WEST9 -> GLOBAL) ===")
        for s in data.get("gcloudCliSetup", []):
            print(f"\n{s['step']}:")
            print("----------------------------------------")
            print(s["cmd"])
            print("----------------------------------------")

    elif command == "sync":
        save_carbon_data(data)
        print(f"Synchronized telemetry at {datetime.now(UTC).isoformat()}")

    elif command == "ffi-benchmark":
        size = 100_000
        a = [0.5] * size
        b = [2.0] * size
        t0 = time.perf_counter()
        dot = native_dot_product(a, b)
        cos = native_cosine_similarity(a, b)
        t1 = time.perf_counter()
        print(f"Dot Product:       {dot} (Expected: {size * 0.5 * 2.0})")
        print(f"Cosine Similarity: {cos:.6f}")
        print(f"Python FFI Time:   {(t1 - t0) * 1000:.3f} ms")

    else:
        print(f"Unknown command: {command}")
        sys.exit(1)


if __name__ == "__main__":
    cli_entry()
