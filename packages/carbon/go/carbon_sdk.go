// Copyright 2026 Google LLC
// SPDX-License-Identifier: Apache-2.0

// Package carbon provides the Go Keyless Gemini Web App, Antigravity 2.0 SDK,
// Unified Token Usage Tracker, and GPUI Zed-Fork Desktop Studio specification.
package carbon

import (
	"encoding/json"
	"fmt"
	"os"
	"regexp"
	"runtime"
	"strings"
)

const EngineVersion = "4.0.0-deepmind-paris-argon"

// KeylessSessionVault holds the active Google AI Ultra session cookies and XSRF token
// synchronized from Chrome (yohanpierre15@gmail.com -> aphrody-yolo) without any API key.
type KeylessSessionVault struct {
	GoogleAccount   string `json:"googleAccount"`
	TargetProfile   string `json:"targetProfile"`
	Subscription    string `json:"subscription"`
	Secure1PSID     string `json:"secure1PSID"`
	Secure1PSIDTS   string `json:"secure1PSIDTS"`
	SNlM0eToken     string `json:"snlm0eToken"`
	Cfb2hBuildLabel string `json:"cfb2hBuildLabel"`
	KeylessMode     bool   `json:"keylessMode"`
}

// UnifiedTokenUsage tracks fused token consumption across Gemini Web App and agy CLI.
type UnifiedTokenUsage struct {
	SessionID         string `json:"sessionId"`
	SubscriptionTier  string `json:"subscriptionTier"`
	WebAppTokens      int    `json:"webAppTokens"`
	AgyCliTokens      int    `json:"agyCliTokens"`
	LocalGemmaTokens  int    `json:"localGemmaTokens"`
	TotalSessionToken int    `json:"totalSessionTokens"`
	ContextWindowMax  int    `json:"contextWindowMax"`
}

// GpuiAntigravityStudio describes the pure Rust GPUI (Zed fork) replacing Electron
// and the local uncensored multimodal creative suite.
type GpuiAntigravityStudio struct {
	EngineVersion        string            `json:"engineVersion"`
	HostOS               string            `json:"hostOs"`
	HostArch             string            `json:"hostArch"`
	UiFramework          string            `json:"uiFramework"`
	ReplacedFrameworks   []string          `json:"replacedFrameworks"`
	KeylessSubscription  string            `json:"keylessSubscription"`
	CreativeSuiteEngines map[string]string `json:"creativeSuiteEngines"`
	CliAndTuiStack       []string          `json:"cliAndTuiStack"`
}

// NewDefaultKeylessVault initializes a zero-API-key Google AI Ultra session vault
// using environment overrides or default synchronized profile identifiers.
func NewDefaultKeylessVault() KeylessSessionVault {
	account := os.Getenv("YOLO_GOOGLE_ACCOUNT")
	if account == "" {
		account = "yohanpierre15@gmail.com"
	}
	profile := os.Getenv("YOLO_TARGET_PROFILE")
	if profile == "" {
		profile = "aphrody-yolo"
	}
	return KeylessSessionVault{
		GoogleAccount:   account,
		TargetProfile:   profile,
		Subscription:    "Google AI Ultra (Keyless Session Cookie + WIZ SNlM0e Bridge)",
		Secure1PSID:     os.Getenv("GEMINI_COOKIE_1PSID"),
		Secure1PSIDTS:   os.Getenv("GEMINI_COOKIE_1PSIDTS"),
		SNlM0eToken:     os.Getenv("GEMINI_SNLM0E"),
		Cfb2hBuildLabel: "boq_assistant-bard-web-server_20261107.04_p0",
		KeylessMode:     true,
	}
}

// CookieHeader formats the HTTP Cookie header for gemini.google.com requests.
func (v KeylessSessionVault) CookieHeader() string {
	var parts []string
	if v.Secure1PSID != "" {
		parts = append(parts, fmt.Sprintf("__Secure-1PSID=%s", v.Secure1PSID))
	}
	if v.Secure1PSIDTS != "" {
		parts = append(parts, fmt.Sprintf("__Secure-1PSIDTS=%s", v.Secure1PSIDTS))
	}
	return strings.Join(parts, "; ")
}

var (
	reSNlM0e = regexp.MustCompile(`"SNlM0e"\s*:\s*"([^"]+)"`)
	reCfb2h  = regexp.MustCompile(`"cfb2h"\s*:\s*"([^"]+)"`)
)

// ExtractWizGlobalTokens extracts SNlM0e and cfb2h tokens from gemini.google.com HTML.
func ExtractWizGlobalTokens(html string) (snlm0e string, cfb2h string) {
	if m := reSNlM0e.FindStringSubmatch(html); len(m) > 1 {
		snlm0e = m[1]
	}
	if m := reCfb2h.FindStringSubmatch(html); len(m) > 1 {
		cfb2h = m[1]
	}
	return snlm0e, cfb2h
}

// BuildStreamGeneratePayload constructs the BardFrontendService/StreamGenerate RPC payload.
func BuildStreamGeneratePayload(prompt string, snlm0e string, conversationID string) (map[string]string, error) {
	inner := []any{
		[]any{prompt, 0, nil, nil, nil, nil, 0},
		[]string{"en"},
		[]string{conversationID, "", ""},
	}
	innerBytes, err := json.Marshal(inner)
	if err != nil {
		return nil, err
	}
	outer := []any{nil, string(innerBytes)}
	outerBytes, err := json.Marshal(outer)
	if err != nil {
		return nil, err
	}
	return map[string]string{
		"f.req": string(outerBytes),
		"at":    snlm0e,
	}, nil
}

// ComputeUnifiedTokenUsage aggregates token usage across Gemini Web App, agy CLI, and local Gemma 4.
func ComputeUnifiedTokenUsage(sessionID string, webTokens, agyTokens, localTokens int) UnifiedTokenUsage {
	return UnifiedTokenUsage{
		SessionID:         sessionID,
		SubscriptionTier:  "Google AI Ultra (Keyless Fused Session)",
		WebAppTokens:      webTokens,
		AgyCliTokens:      agyTokens,
		LocalGemmaTokens:  localTokens,
		TotalSessionToken: webTokens + agyTokens + localTokens,
		ContextWindowMax:  2_000_000,
	}
}

// GetGpuiAntigravityStudio returns the consolidated GPUI Zed-Fork & Uncensored Creative Suite status.
func GetGpuiAntigravityStudio() GpuiAntigravityStudio {
	return GpuiAntigravityStudio{
		EngineVersion:       EngineVersion,
		HostOS:              runtime.GOOS,
		HostArch:            runtime.GOARCH,
		UiFramework:         "Pure Rust GPUI 0.8 (Zed Fork) + Taffy 0.15 + WGPU/Blade (DirectX 12 / Metal / Vulkan 120 FPS)",
		ReplacedFrameworks:  []string{"Electron (Antigravity Legacy)", "Electron (Gemini Windows App Legacy)"},
		KeylessSubscription: "Google AI Ultra Subscription Bridge (Zero API Key, Active Chrome Session Sync)",
		CreativeSuiteEngines: map[string]string{
			"image": "Local Uncensored Flux.1 / SDXL / Imagen WebGPU & CUDA",
			"video": "Local Uncensored Veo / Stable Video Diffusion (SVD) Keyframe Engine",
			"3d":    "GPUI Native Gaussian Splatting & NeRF Mesh Viewport",
			"music": "Local Uncensored AudioCraft / MusicLM Waveform Synthesizer",
			"craft": "Craft Creative Suite Native GPUI Canvas & Multi-Track Timeline",
		},
		CliAndTuiStack: []string{
			"agy (Antigravity 2.0 CLI & SDK)",
			"yolo-ai (Rust Ratatui TUI & Model Client)",
			"opencode (Terminal Autonomous Coding Agent)",
			"carbon (Bare-Metal Rust FFI + Bun AoT + Python uv + Go 1.27)",
		},
	}
}
