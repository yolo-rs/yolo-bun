// Copyright 2026 Google LLC
// SPDX-License-Identifier: Apache-2.0

import { runCliCommand } from "../packages/cli/src/index.ts";
import { startWebServer } from "../packages/web/src/index.ts";

const args = process.argv.slice(2);
const command = args[0] || "status";

if (command === "server" || command === "web") {
  startWebServer();
} else {
  runCliCommand(args);
}
