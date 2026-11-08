#!/usr/bin/env bun
// SPDX-License-Identifier: Apache-2.0
import {
  GOOGLE_STYLE_GUIDES_2026,
  OXC_AND_VERCEL_INTEGRATION_CATALOG,
  gts,
} from "./index.ts";

const status = await gts.runNativeBunCheckAndFormat();
console.log(status.header);
console.log(
  JSON.stringify(
    {
      config: gts.generateGoogleTsConfig(),
      styleGuides2026: GOOGLE_STYLE_GUIDES_2026.length,
      oxcAndVercelCatalog: OXC_AND_VERCEL_INTEGRATION_CATALOG.map(
        (r) => r.fullName,
      ),
    },
    null,
    2,
  ),
);
