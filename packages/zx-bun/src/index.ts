// SPDX-License-Identifier: Apache-2.0
// Google zx Native Re-implementation for Upstream Bun (v1.4.4+)
// Follows Google Shell Style Guide, Google OSS Best Practices & Bun.$ Architecture

import { $ } from "bun";

export interface ProcessOutput {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export interface ZxOptions {
  cwd?: string;
  env?: Record<string, string>;
  quiet?: boolean;
  verbose?: boolean;
}

export class GoogleShell {
  private quiet = false;
  private verbose = true;

  setQuiet(val: boolean) {
    this.quiet = val;
  }

  setVerbose(val: boolean) {
    this.verbose = val;
  }

  // Google Colors for Terminal Output (ANSI)
  static readonly COLORS = {
    blue: "\x1b[38;2;66;133;244m",
    red: "\x1b[38;2;234;67;53m",
    yellow: "\x1b[38;2;251;188;4m",
    green: "\x1b[38;2;52;168;83m",
    cyan: "\x1b[38;2;138;180;248m",
    reset: "\x1b[0m",
    bold: "\x1b[1m",
    dim: "\x1b[2m",
  };

  formatHeader(text: string): string {
    const c = GoogleShell.COLORS;
    return `${c.bold}${c.blue}=== ${text} ===${c.reset}`;
  }

  formatSuccess(text: string): string {
    const c = GoogleShell.COLORS;
    return `${c.green}✓ ${text}${c.reset}`;
  }

  formatWarning(text: string): string {
    const c = GoogleShell.COLORS;
    return `${c.yellow}⚠ ${text}${c.reset}`;
  }

  formatError(text: string): string {
    const c = GoogleShell.COLORS;
    return `${c.red}✗ ${text}${c.reset}`;
  }

  async run(command: string, _opts?: ZxOptions): Promise<ProcessOutput> {
    if (this.verbose && !this.quiet) {
      const c = GoogleShell.COLORS;
      console.log(`${c.dim}$ ${command}${c.reset}`);
    }

    try {
      // Cross-platform shell dispatch (Windows cmd/pwsh vs Unix sh)
      const isWindows = process.platform === "win32";
      const result = isWindows
        ? await $`cmd.exe /c ${command}`.nothrow().quiet()
        : await $`sh -c ${command}`.nothrow().quiet();

      return {
        stdout: result.stdout.toString(),
        stderr: result.stderr.toString(),
        exitCode: result.exitCode,
      };
    } catch (err: unknown) {
      return {
        stdout: "",
        stderr: err instanceof Error ? err.message : String(err),
        exitCode: 1,
      };
    }
  }
}

export const zx = new GoogleShell();

export default zx;
