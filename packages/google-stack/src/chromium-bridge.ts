// SPDX-License-Identifier: Apache-2.0
/**
 * Pont d'orchestration direct pour Chromium Upstream (C:/src/chromium/src)
 * et Google depot_tools (C:/src/depot_tools)
 */

import { existsSync } from "node:fs";
import { $ } from "bun";

export interface ChromiumUpstreamConfig {
  sourceRoot: string;
  depotToolsPath: string;
  isSourcePresent: boolean;
  isDepotToolsPresent: boolean;
  gnPath: string;
  ninjaPath: string;
}

export class ChromiumUpstreamBridge {
  public static getConfig(): ChromiumUpstreamConfig {
    const sourceRoot = "C:/src/chromium/src";
    const depotToolsPath = "C:/src/depot_tools";

    return {
      sourceRoot,
      depotToolsPath,
      isSourcePresent: existsSync(sourceRoot),
      isDepotToolsPresent: existsSync(depotToolsPath),
      gnPath: `${depotToolsPath}/gn.bat`,
      ninjaPath: `${depotToolsPath}/autoninja.bat`,
    };
  }

  public static async getChromiumStatus(): Promise<Record<string, unknown>> {
    const config = this.getConfig();
    let lastCommit = "UNKNOWN";

    if (config.isSourcePresent) {
      try {
        const out = await $`git -C ${config.sourceRoot} log -n 1 --oneline`
          .quiet()
          .text();
        lastCommit = out.trim();
      } catch {
        lastCommit = "SOURCE_TREE_AVAILABLE";
      }
    }

    return {
      source: "Chromium Upstream (C:/src/chromium/src)",
      depotTools: "Google depot_tools (C:/src/depot_tools)",
      ready: config.isSourcePresent && config.isDepotToolsPresent,
      lastCommit,
      targets: ["chrome", "blink", "v8", "content_shell", "headless_shell"],
    };
  }
}
