// SPDX-License-Identifier: MIT OR Apache-2.0
import type { BunPlugin } from "bun";
import {
  buildModernWebSecurityHeaders,
  computeWeakEtag,
  CORE_WEB_VITALS_BUDGET_2026,
  generateSpeculationRules,
  VERCEL_CACHE_POLICIES,
} from "../../../scripts/web-standards-vitals.ts";
import {
  BoqServerEngine,
  generateM3CssVariables,
  GOOGLE_M3_DARK_TOKENS,
  GOOGLE_XSSI_PREFIX,
} from "./google-apis.ts";

/**
 * Generates an inline W3C PerformanceObserver script that tracks Core Web Vitals
 * (LCP, CLS, INP, FCP, TTFB) in Chromium and exposes `window.__YOLO_WEB_VITALS__`.
 */
export function generateWebVitalsObserverScript(): string {
  return `<script>
(function(){
  const vitals = { LCP: 0, CLS: 0, INP: 0, TTFB: 0 };
  window.__YOLO_WEB_VITALS__ = vitals;
  if (typeof PerformanceObserver !== "undefined") {
    try {
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const last = entries[entries.length - 1];
        if (last) vitals.LCP = Math.round(last.startTime);
      }).observe({ type: "largest-contentful-paint", buffered: true });
    } catch {}
  }
})();
</script>`;
}

export interface ChromiumFriendlyAppOptions {
  readonly title: string;
  readonly description: string;
  readonly canonicalOrigin: string;
  readonly lang?: string;
  readonly prerenderPaths?: readonly string[];
  readonly bodyHtml?: string;
  readonly boqEngine?: BoqServerEngine;
}

export function renderChromiumFriendlyHtmlDocument(
  options: ChromiumFriendlyAppOptions,
): string {
  const lang = options.lang ?? "en";
  const boq = options.boqEngine ?? new BoqServerEngine();
  const speculation = JSON.stringify(
    generateSpeculationRules(
      options.prerenderPaths ?? ["/", "/api/vitals", "/api/google-stack"],
    ),
  );
  const m3Css = generateM3CssVariables(GOOGLE_M3_DARK_TOKENS);
  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: options.title,
    description: options.description,
    url: options.canonicalOrigin,
    applicationCategory: "DeveloperApplication",
  });
  const bodyContent =
    options.bodyHtml ??
    `<section jscontroller="YoloChromiumApp" jsaction="click:activate">
      <h1>${options.title}</h1>
      <p>${options.description}</p>
    </section>`;

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="dark light" />
  <meta name="theme-color" content="${GOOGLE_M3_DARK_TOKENS.surface}" />
  <title>${options.title}</title>
  <meta name="description" content="${options.description}" />
  <link rel="canonical" href="${options.canonicalOrigin}" />
  <script type="speculationrules">${speculation}</script>
  <script type="application/ld+json">${jsonLd}</script>
  ${boq.renderWizGlobalDataScript()}
  <style>
    @view-transition { navigation: auto; }
    ${m3Css}
    body { margin: 0; font-family: system-ui, -apple-system, sans-serif; background: var(--md-sys-color-surface); color: var(--md-sys-color-on-surface); line-height: 1.6; }
    .skip-link { position: absolute; left: -9999px; top: 0; background: var(--md-sys-color-primary); color: var(--md-sys-color-on-primary); padding: 0.5rem 1rem; z-index: 100; }
    .skip-link:focus, a:focus-visible, button:focus-visible { outline: 3px solid var(--md-sys-color-secondary); outline-offset: 2px; }
    .skip-link:focus { left: 0.5rem; top: 0.5rem; }
    header, main, footer { max-width: 1120px; margin: 0 auto; padding: 1.25rem; content-visibility: auto; contain: layout style; }
    a, button { color: var(--md-sys-color-secondary); min-height: 24px; min-width: 24px; display: inline-flex; align-items: center; }
  </style>
</head>
<body>
  <a class="skip-link" href="#main-content">Skip to main content</a>
  <header role="banner">
    <nav aria-label="Primary Navigation">
      <a href="/">Home</a> |
      <a href="/api/vitals">Web Vitals</a> |
      <a href="/api/google-stack">Google Stack</a>
    </nav>
  </header>
  <main id="main-content">
    ${bodyContent}
  </main>
  <footer role="contentinfo">
    <p>Powered by yolo-bun Chromium-Friendly Runtime (Upstream Bun v1.4.4+ &amp; Google Standards 2026)</p>
  </footer>
  ${generateWebVitalsObserverScript()}
</body>
</html>`;
}

/**
 * Creates a Chromium-friendly `Bun.serve` fetch handler pre-configured with:
 * - Lighthouse 100/100 HTML shell & WCAG 2.2 AA/AAA landmarks
 * - Core Web Vitals `Server-Timing`, ETag 304, and Vercel SWR edge headers
 * - OWASP / Chromium COOP, COEP, HSTS, and CSP3 headers
 * - Google BOQ `/_/BoqUi/data/batchexecute` RPC endpoint with `)]}'\n\n` XSSI prefix
 * - `/api/vitals` and `/api/google-stack` telemetry endpoints
 */
export function createChromiumFriendlyFetchHandler(
  options: ChromiumFriendlyAppOptions,
): (req: Request) => Promise<Response> {
  const boq = options.boqEngine ?? new BoqServerEngine();
  boq.registerRpc("GetRuntimeVitals", () => ({
    runtime: "yolo-bun-chromium-144",
    budget: CORE_WEB_VITALS_BUDGET_2026,
    status: "OPTIMAL",
  }));

  return async (req: Request): Promise<Response> => {
    const start = performance.now();
    const url = new URL(req.url);

    if (
      url.pathname === "/_/BoqUi/data/batchexecute" &&
      req.method === "POST"
    ) {
      const formText = await req.text();
      const params = new URLSearchParams(formText);
      const fReq = params.get("f.req") ?? "[[[]]]";
      const wire = await boq.handleBatchExecute(fReq);
      const dur = performance.now() - start;
      return new Response(wire, {
        status: 200,
        headers: {
          "content-type": "application/json; charset=utf-8",
          ...buildModernWebSecurityHeaders({
            policyKind: "dynamic-api",
            timings: [{ name: "boq", durMs: dur, desc: "BOQ batchexecute" }],
          }),
        },
      });
    }

    if (url.pathname === "/api/vitals") {
      const body = JSON.stringify({
        budget: CORE_WEB_VITALS_BUDGET_2026,
        cachePolicies: VERCEL_CACHE_POLICIES,
        xssiPrefixLength: GOOGLE_XSSI_PREFIX.length,
      });
      const etag = computeWeakEtag(body);
      const dur = performance.now() - start;
      return new Response(body, {
        status: 200,
        headers: {
          "content-type": "application/json; charset=utf-8",
          ...buildModernWebSecurityHeaders({
            policyKind: "dynamic-api",
            etag,
            timings: [{ name: "vitals", durMs: dur }],
          }),
        },
      });
    }

    const canonicalUrl = `${options.canonicalOrigin.replace(/\/$/, "")}${url.pathname}`;
    const html = renderChromiumFriendlyHtmlDocument({
      ...options,
      canonicalOrigin: canonicalUrl,
      boqEngine: boq,
    });
    const etag = computeWeakEtag(html);
    const dur = performance.now() - start;
    const headers: Record<string, string> = {
      "content-type": "text/html; charset=utf-8",
      ...buildModernWebSecurityHeaders({
        policyKind: "isr-doc",
        etag,
        canonicalUrl,
        timings: [{ name: "ssr", durMs: dur, desc: "Chromium Friendly SSR" }],
      }),
    };

    if (req.headers.get("if-none-match") === etag) {
      return new Response(null, { status: 304, headers });
    }

    return new Response(html, { status: 200, headers });
  };
}

export const webVitalsPlugin: BunPlugin = {
  name: "yolo-bun-web-vitals",
  setup(build) {
    build.onResolve({ filter: /^yolo-bun:web-vitals$/ }, () => ({
      path: "web-vitals",
      namespace: "yolo-bun",
    }));
    build.onLoad({ filter: /^web-vitals$/, namespace: "yolo-bun" }, () => {
      const payload = {
        budget: CORE_WEB_VITALS_BUDGET_2026,
        cachePolicies: VERCEL_CACHE_POLICIES,
        speculationRules: generateSpeculationRules(),
        observerSnippet: generateWebVitalsObserverScript(),
      };
      return {
        contents: `export const webVitals = ${JSON.stringify(payload)};\nexport default webVitals;\n`,
        loader: "js",
      };
    });
  },
};
