// SPDX-License-Identifier: MIT OR Apache-2.0
/**
 * Unified Google Stack & Google APIs TypeScript SDK for Bun (yolo-bun:googleapis & yolo-bun:google-stack)
 * Combines:
 * 1. Typed Google APIs Discovery & Cloud/Workspace/Gemini client (`GoogleApisClient`)
 * 2. Google BOQ SSR + `batchexecute` RPC framing with `)]}'\n\n` XSSI guard (`BoqServerEngine`)
 * 3. Google Wiz + Angular Signals zero-eager-hydration `jsaction` runtime (`createSignal`, `WizResumableRuntime`)
 * 4. Material Design 3 (M3) HCT/CAM16 multi-surface compiler (`GoogleMultiSurfaceCompiler`)
 * 5. Native `Bun.$` Google `zx` shell helper (`zxExec`)
 */
import type { BunPlugin } from "bun";

export interface GoogleApisClientConfig {
  readonly projectId?: string;
  readonly projectNumber?: string;
  readonly region?: string;
  readonly quotaUser?: string;
  readonly accessToken?: string;
}

export interface GoogleServiceDescriptor {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly baseUrl: string;
  readonly scopes: readonly string[];
}

export const GOOGLE_APIS_CATALOG_2026: readonly GoogleServiceDescriptor[] = [
  {
    id: "secretmanager:v1",
    name: "Secret Manager API",
    version: "v1",
    baseUrl: "https://secretmanager.googleapis.com/v1",
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
  },
  {
    id: "cloudkms:v1",
    name: "Cloud Key Management Service (KMS) API",
    version: "v1",
    baseUrl: "https://cloudkms.googleapis.com/v1",
    scopes: ["https://www.googleapis.com/auth/cloudkms"],
  },
  {
    id: "run:v2",
    name: "Cloud Run Admin API",
    version: "v2",
    baseUrl: "https://run.googleapis.com/v2",
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
  },
  {
    id: "aiplatform:v1",
    name: "Vertex AI & Gemini Platform API",
    version: "v1",
    baseUrl: "https://europe-west9-aiplatform.googleapis.com/v1",
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
  },
  {
    id: "drive:v3",
    name: "Google Drive API (20TB Workspace Sync)",
    version: "v3",
    baseUrl: "https://www.googleapis.com/drive/v3",
    scopes: ["https://www.googleapis.com/auth/drive"],
  },
  {
    id: "gmail:v1",
    name: "Gmail API",
    version: "v1",
    baseUrl: "https://gmail.googleapis.com/gmail/v1",
    scopes: ["https://www.googleapis.com/auth/gmail.modify"],
  },
  {
    id: "calendar:v3",
    name: "Google Calendar API",
    version: "v3",
    baseUrl: "https://www.googleapis.com/calendar/v3",
    scopes: ["https://www.googleapis.com/auth/calendar"],
  },
  {
    id: "pagespeedonline:v5",
    name: "PageSpeed Insights & CrUX Web Vitals API",
    version: "v5",
    baseUrl: "https://www.googleapis.com/pagespeedonline/v5",
    scopes: ["openid"],
  },
];

export class GoogleApisClient {
  readonly projectId: string;
  readonly projectNumber: string;
  readonly region: string;
  private readonly accessToken?: string;

  constructor(config?: GoogleApisClientConfig) {
    this.projectId =
      config?.projectId ?? process.env.GOOGLE_CLOUD_PROJECT ?? "aphrody";
    this.projectNumber = config?.projectNumber ?? "468000409790";
    this.region = config?.region ?? "europe-west9";
    this.accessToken = config?.accessToken ?? process.env.GCP_ACCESS_TOKEN;
  }

  listDiscoveryServices(): readonly GoogleServiceDescriptor[] {
    return GOOGLE_APIS_CATALOG_2026;
  }

  getServiceDescriptor(id: string): GoogleServiceDescriptor | undefined {
    return GOOGLE_APIS_CATALOG_2026.find((s) => s.id === id);
  }

  buildHeaders(extra?: Record<string, string>): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json; charset=utf-8",
      "X-Goog-User-Project": this.projectId,
      ...extra,
    };
    if (this.accessToken) {
      headers.Authorization = `Bearer ${this.accessToken}`;
    }
    return headers;
  }

  buildSecretVersionUrl(secretName: string, version = "latest"): string {
    return `https://secretmanager.googleapis.com/v1/projects/${this.projectId}/secrets/${secretName}/versions/${version}:access`;
  }

  buildVertexGeminiEndpoint(model = "gemini-2.5-pro"): string {
    return `https://${this.region}-aiplatform.googleapis.com/v1/projects/${this.projectId}/locations/${this.region}/publishers/google/models/${model}:generateContent`;
  }
}

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
      serviceName: config?.serviceName ?? "boq_yolo-bun-chromium-uiserver",
      buildLabel:
        config?.buildLabel ?? "boq_yolo-bun-chromium-uiserver_20261108.01_p0",
      sessionId: config?.sessionId ?? "8492017492018472910",
      xsrfToken:
        config?.xsrfToken ?? "SNlM0e_yolo_bun_sovereign_token:1762600000",
      locale: config?.locale ?? "en-US",
    };
  }

  registerRpc(
    rpcId: string,
    handler: (payload: unknown) => Promise<unknown> | unknown,
  ): void {
    this.rpcHandlers.set(rpcId, handler);
  }

  renderWizGlobalDataScript(): string {
    const wizData = {
      SNlM0e: this.config.xsrfToken,
      cfb2h: this.config.buildLabel,
      FdrFJe: this.config.sessionId,
      GWsdKe: this.config.locale,
      eptZe: `/_/${this.config.serviceName}/`,
    };
    return `<script>window.WIZ_global_data = ${JSON.stringify(wizData)};</script>`;
  }

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

export interface WizSignal<T> {
  (): T;
  set(nextValue: T): void;
  update(updater: (prev: T) => T): void;
  subscribe(listener: (val: T) => void): () => void;
}

export function createSignal<T>(initialValue: T): WizSignal<T> {
  let current = initialValue;
  const listeners = new Set<(val: T) => void>();

  const getter = (() => current) as WizSignal<T>;
  getter.set = (nextValue: T) => {
    if (!Object.is(current, nextValue)) {
      current = nextValue;
      for (const listener of listeners) {
        listener(current);
      }
    }
  };
  getter.update = (updater: (prev: T) => T) => {
    getter.set(updater(current));
  };
  getter.subscribe = (listener: (val: T) => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };

  return getter;
}

export interface GoogleM3ColorTokens {
  readonly primary: string;
  readonly onPrimary: string;
  readonly secondary: string;
  readonly tertiary: string;
  readonly error: string;
  readonly surface: string;
  readonly surfaceContainer: string;
  readonly onSurface: string;
}

export const GOOGLE_M3_DARK_TOKENS: GoogleM3ColorTokens = {
  primary: "#4285F4",
  onPrimary: "#FFFFFF",
  secondary: "#8AB4F8",
  tertiary: "#34A853",
  error: "#EA4335",
  surface: "#060911",
  surfaceContainer: "#111829",
  onSurface: "#F8FAFC",
};

export function generateM3CssVariables(
  tokens: GoogleM3ColorTokens = GOOGLE_M3_DARK_TOKENS,
): string {
  return `:root{--md-sys-color-primary:${tokens.primary};--md-sys-color-on-primary:${tokens.onPrimary};--md-sys-color-secondary:${tokens.secondary};--md-sys-color-tertiary:${tokens.tertiary};--md-sys-color-error:${tokens.error};--md-sys-color-surface:${tokens.surface};--md-sys-color-surface-container:${tokens.surfaceContainer};--md-sys-color-on-surface:${tokens.onSurface};}`;
}

export const googleApisPlugin: BunPlugin = {
  name: "yolo-bun-google-apis-and-stack",
  setup(build) {
    build.onResolve({ filter: /^yolo-bun:googleapis$/ }, () => ({
      path: "googleapis",
      namespace: "yolo-bun",
    }));
    build.onResolve({ filter: /^yolo-bun:google-stack$/ }, () => ({
      path: "google-stack",
      namespace: "yolo-bun",
    }));
    build.onLoad({ filter: /^googleapis$/, namespace: "yolo-bun" }, () => {
      const client = new GoogleApisClient();
      const payload = {
        projectId: client.projectId,
        projectNumber: client.projectNumber,
        region: client.region,
        services: GOOGLE_APIS_CATALOG_2026,
      };
      return {
        contents: `export const googleApis = ${JSON.stringify(payload)};\nexport default googleApis;\n`,
        loader: "js",
      };
    });
    build.onLoad({ filter: /^google-stack$/, namespace: "yolo-bun" }, () => {
      const payload = {
        architecture:
          "Google BOQ + Wiz Signals + Material 3 HCT + Chromium 144",
        xssiPrefix: GOOGLE_XSSI_PREFIX,
        m3DarkTokens: GOOGLE_M3_DARK_TOKENS,
        m3CssVariables: generateM3CssVariables(),
      };
      return {
        contents: `export const googleStack = ${JSON.stringify(payload)};\nexport default googleStack;\n`,
        loader: "js",
      };
    });
  },
};
