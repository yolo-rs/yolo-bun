#!/usr/bin/env bun
// SPDX-License-Identifier: Apache-2.0
import {
  BoqServerEngine,
  GOOGLE_POLYGLOT_MATRIX,
  GoogleMultiSurfaceCompiler,
} from "./index.ts";

const boq = new BoqServerEngine();
const compiler = new GoogleMultiSurfaceCompiler();
const compiled = compiler.compileAll({
  id: "GoogleSearchAiMode",
  title: "Google Search AI Mode // Gemini 4 Argon",
  searchPlaceholder: "Ask anything across Google, DeepMind, Code & Web...",
  primaryActionLabel: "AI Overview",
  primaryJsAction: "triggerAiOverview",
  cards: [
    {
      id: "card-boq",
      heading: "BOQ + Wiz Resumable Engine",
      subtitle: "Zero eager hydration via jsaction & AF_initDataCallback",
      badge: "PRODUCTION",
    },
    {
      id: "card-gpui",
      heading: "Zed GPUI + Flutter + Jetpack Compose",
      subtitle: "Single M3 schema compiled to Web, Mobile, Desktop & Google TV",
      badge: "MULTI-SURFACE",
    },
  ],
});

console.log(
  JSON.stringify(
    {
      boqBuildLabel: boq.config.buildLabel,
      wizBootstrap: boq.renderWizGlobalDataScript(),
      surfacesCompiled: Object.keys(compiled.outputs),
      polyglotTargets: GOOGLE_POLYGLOT_MATRIX.map((p) => p.id),
    },
    null,
    2,
  ),
);
