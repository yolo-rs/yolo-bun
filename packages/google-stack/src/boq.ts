// SPDX-License-Identifier: Apache-2.0
/**
 * Google BOQ (Back-Office / Bloat-free Object-oriented Server Architecture)
 * Recreates the exact production wire protocol of Google.com, Gemini Web App,
 * Google Search AI Mode, Drive, and Cloud Console:
 * 1. `window.WIZ_global_data` SSR bootstrap (`SNlM0e`, `cfb2h`, `FdrFJe`, `QrtxK`)
 * 2. `_/BoqUi/data/batchexecute` RPC framing with `)]}'\n\n` XSSI guard
 * 3. `AF_initDataCallback({key: 'ds:0', data: ...})` streaming SSR data islands
 */

export interface WizGlobalDataConfig {
  readonly serviceName: string;
  readonly buildLabel: string;
  readonly sessionId: string;
  readonly xsrfToken: string;
  readonly locale?: string;
}

export interface BatchExecuteRpcCall {
  readonly rpcId: string;
  readonly payload: unknown;
  readonly orderIndex?: number | "generic";
}

export const GOOGLE_XSSI_PREFIX = ")]}'\n\n";

export class BoqServerEngine {
  readonly config: WizGlobalDataConfig;
  private readonly rpcHandlers = new Map<
    string,
    (payload: unknown) => Promise<unknown> | unknown
  >();

  constructor(config?: Partial<WizGlobalDataConfig>) {
    this.config = {
      serviceName: config?.serviceName ?? "boq_google-bun-uiserver",
      buildLabel:
        config?.buildLabel ?? "boq_google-bun-uiserver_20261107.09_p0",
      sessionId: config?.sessionId ?? "8492017492018472910",
      xsrfToken:
        config?.xsrfToken ?? "SNlM0e_google_bun_sovereign_token:1762500000",
      locale: config?.locale ?? "fr-FR",
    };
  }

  registerRpc(
    rpcId: string,
    handler: (payload: unknown) => Promise<unknown> | unknown,
  ): void {
    this.rpcHandlers.set(rpcId, handler);
  }

  /**
   * Emits the `window.WIZ_global_data` script tag injected into the SSR `<head>`.
   */
  renderWizGlobalDataScript(): string {
    const wizData = {
      SNlM0e: this.config.xsrfToken,
      cfb2h: this.config.buildLabel,
      FdrFJe: this.config.sessionId,
      GWsdKe: this.config.locale,
      eptZe: `/_/${this.config.serviceName}/`,
      w2btAe: '%.@.null,null,"",true,null,null,true]',
    };
    return `<script nonce="google-bun-boq">window.WIZ_global_data = ${JSON.stringify(wizData)};</script>`;
  }

  /**
   * Emits an `AF_initDataCallback` streaming SSR data chunk.
   */
  renderAfInitDataCallback(
    key: `ds:${number}`,
    data: unknown,
    hash = "1",
  ): string {
    return `<script nonce="google-bun-boq">AF_initDataCallback({key: '${key}', hash: '${hash}', data: ${JSON.stringify(data)}, sideChannel: {}});</script>`;
  }

  /**
   * Encodes a client `f.req` payload for `POST /_/BoqUi/data/batchexecute`.
   */
  encodeBatchExecuteRequest(calls: readonly BatchExecuteRpcCall[]): string {
    const outer = [
      calls.map((c, idx) => [
        c.rpcId,
        JSON.stringify(c.payload),
        null,
        c.orderIndex !== undefined ? String(c.orderIndex) : String(idx + 1),
      ]),
    ];
    return JSON.stringify(outer);
  }

  /**
   * Executes a `batchexecute` request and frames the response with Google's
   * `)]}'\n\n<byteLength>\n[["wrb.fr","<rpcId>","<json>",null,null,null,"generic"]]` wire format.
   */
  async handleBatchExecute(fReqRaw: string): Promise<string> {
    const parsed = JSON.parse(fReqRaw) as Array<
      Array<[string, string, unknown, string]>
    >;
    const batch = parsed[0] ?? [];
    const envelopes: unknown[] = [];

    for (const [rpcId, rawPayload, , orderTag] of batch) {
      const handler = this.rpcHandlers.get(rpcId);
      const decodedPayload = rawPayload ? JSON.parse(rawPayload) : null;
      const result = handler
        ? await handler(decodedPayload)
        : { status: "UNHANDLED_RPC", rpcId };
      envelopes.push([
        "wrb.fr",
        rpcId,
        JSON.stringify(result),
        null,
        null,
        null,
        orderTag ?? "generic",
      ]);
    }

    const bodyJson = JSON.stringify(envelopes);
    return `${GOOGLE_XSSI_PREFIX}${bodyJson.length}\n${bodyJson}\n`;
  }

  /**
   * Parses a raw `batchexecute` wire response back into typed `{ rpcId, data }` objects.
   */
  parseBatchExecuteResponse<T = unknown>(
    wireResponse: string,
  ): Array<{ rpcId: string; data: T; orderTag: string }> {
    const stripped = wireResponse.startsWith(GOOGLE_XSSI_PREFIX)
      ? wireResponse.slice(GOOGLE_XSSI_PREFIX.length)
      : wireResponse;
    const lines = stripped
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    const results: Array<{ rpcId: string; data: T; orderTag: string }> = [];

    for (const line of lines) {
      if (!line.startsWith("[")) continue;
      const parsed = JSON.parse(line) as Array<
        [string, string, string, unknown, unknown, unknown, string]
      >;
      for (const item of parsed) {
        if (item[0] === "wrb.fr") {
          results.push({
            rpcId: item[1],
            data: JSON.parse(item[2]) as T,
            orderTag: item[6] ?? "generic",
          });
        }
      }
    }
    return results;
  }
}
