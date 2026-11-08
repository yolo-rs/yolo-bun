// Copyright 2026 Google LLC
// SPDX-License-Identifier: Apache-2.0

package carbon

import (
	"strings"
	"testing"
)

func TestKeylessVaultAndWizExtraction(t *testing.T) {
	vault := NewDefaultKeylessVault()
	if !vault.KeylessMode {
		t.Fatalf("expected keyless mode to be true")
	}
	vault.Secure1PSID = "psid-123"
	vault.Secure1PSIDTS = "psidts-456"
	hdr := vault.CookieHeader()
	if !strings.Contains(hdr, "__Secure-1PSID=psid-123") || !strings.Contains(hdr, "__Secure-1PSIDTS=psidts-456") {
		t.Fatalf("unexpected cookie header: %s", hdr)
	}

	sampleHTML := `<script>window.WIZ_global_data = {"SNlM0e":"AJv-test:999","cfb2h":"boq_assistant-bard-web-server_20261107"};</script>`
	snlm0e, cfb2h := ExtractWizGlobalTokens(sampleHTML)
	if snlm0e != "AJv-test:999" {
		t.Fatalf("expected SNlM0e AJv-test:999, got %s", snlm0e)
	}
	if cfb2h != "boq_assistant-bard-web-server_20261107" {
		t.Fatalf("expected cfb2h boq_assistant-bard-web-server_20261107, got %s", cfb2h)
	}

	payload, err := BuildStreamGeneratePayload("Verify GPUI Zed fork", snlm0e, "c_1")
	if err != nil {
		t.Fatalf("unexpected error building payload: %v", err)
	}
	if payload["at"] != "AJv-test:999" || !strings.Contains(payload["f.req"], "Verify GPUI Zed fork") {
		t.Fatalf("invalid StreamGenerate payload: %+v", payload)
	}
}

func TestUnifiedTokenUsageAndGpuiStudio(t *testing.T) {
	usage := ComputeUnifiedTokenUsage("sess-ultra-01", 1200, 3400, 800)
	if usage.TotalSessionToken != 5400 {
		t.Fatalf("expected total tokens 5400, got %d", usage.TotalSessionToken)
	}
	if usage.ContextWindowMax != 2_000_000 {
		t.Fatalf("expected 2M context window, got %d", usage.ContextWindowMax)
	}

	studio := GetGpuiAntigravityStudio()
	if !strings.Contains(studio.UiFramework, "GPUI") {
		t.Fatalf("expected GPUI in UiFramework, got %s", studio.UiFramework)
	}
	if len(studio.ReplacedFrameworks) != 2 {
		t.Fatalf("expected 2 replaced Electron frameworks, got %d", len(studio.ReplacedFrameworks))
	}
	if studio.CreativeSuiteEngines["3d"] == "" || studio.CreativeSuiteEngines["music"] == "" {
		t.Fatalf("expected 3d and music engines in CreativeSuiteEngines")
	}
}
