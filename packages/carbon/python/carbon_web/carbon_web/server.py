# Copyright 2026 Google LLC
# SPDX-License-Identifier: Apache-2.0

import json
import os
from http.server import BaseHTTPRequestHandler, HTTPServer

from carbon_core import get_native_engine_version, load_carbon_data, save_carbon_data

PORT = int(os.environ.get("PY_PORT", "4041"))
HOST = os.environ.get("PY_HOST", "127.0.0.1")


class CarbonHandler(BaseHTTPRequestHandler):
    def do_GET(self) -> None:
        if self.path in ("/", "/api/data"):
            data = load_carbon_data()
            data["nativeKernel"] = get_native_engine_version()
            payload = json.dumps(data, indent=2).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)
        else:
            self.send_response(404)
            self.end_headers()
            self.wfile.write(b"Not Found")

    def do_POST(self) -> None:
        if self.path == "/api/sync":
            data = load_carbon_data()
            save_carbon_data(data)
            res = json.dumps({"success": True, "timestamp": data.get("lastUpdated")}).encode(
                "utf-8"
            )
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(res)))
            self.end_headers()
            self.wfile.write(res)
        else:
            self.send_response(404)
            self.end_headers()
            self.wfile.write(b"Not Found")

    def log_message(self, format: str, *args: object) -> None:
        pass


def run_server() -> None:
    server = HTTPServer((HOST, PORT), CarbonHandler)
    print(f"Google DeepMind Carbon Python API listening at http://{HOST}:{PORT}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        server.server_close()


if __name__ == "__main__":
    run_server()
