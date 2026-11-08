# Chromium-Style DEPS file for yolo-bun (Sovereign Bun + Google Stack + Web Standards Runtime)
# Managed via Google depot_tools / gclient and yolo google third-party
# Zero Node.js / Zero npm — 100% Upstream Bun v1.4.4+, Rust 2024, Go 1.27+, Chromium v144+

use_relative_paths = True

vars = {
  'github_url': 'https://github.com',
  'chromium_git': 'https://chromium.googlesource.com',
  'aphrody_org': 'aphrody-labs',
  'yolo_org': 'yolo-rs',
  'bun_revision': 'HEAD',
  'chromium_revision': 'HEAD',
}

deps = {
  # 0. Upstream Bun Engine (Rust + C++ / JavaScriptCore)
  'bun':
    Var('github_url') + '/oven-sh/bun.git@' + Var('bun_revision'),

  # 1. Google Styleguide & Chromium / AOSP / Rust 2024 / TypeScript Standards
  'third_party/google/styleguide':
    Var('github_url') + '/google/styleguide.git@HEAD',
  'third_party/google/gts':
    Var('github_url') + '/google/gts.git@HEAD',

  # 2. Chromium Web Quality, Auditing & Core Web Vitals
  'third_party/google/lighthouse':
    Var('github_url') + '/GoogleChrome/lighthouse.git@HEAD',
  'third_party/google/web-vitals':
    Var('github_url') + '/GoogleChrome/web-vitals.git@HEAD',
  'third_party/google/chrome-standards':
    Var('github_url') + '/GoogleChrome/developer.chrome.com.git@HEAD',

  # 3. Google APIs TypeScript, Cloud, Workspace & Discovery
  'third_party/google/googleapis':
    Var('github_url') + '/googleapis/google-api-nodejs-client.git@HEAD',
  'third_party/google/google-cloud-go':
    Var('github_url') + '/googleapis/google-cloud-go.git@HEAD',

  # 4. Google Frontend & Design Architecture (BOQ, Wiz, Angular Signals, Material 3 HCT/CAM16)
  'third_party/google/boq-wiz':
    Var('github_url') + '/angular/angular.git@HEAD',
  'third_party/google/material-color-utilities':
    Var('github_url') + '/material-foundation/material-color-utilities.git@HEAD',

  # 5. Google Shell, Container Sandbox & GitHub Automation
  'third_party/google/zx':
    Var('github_url') + '/google/zx.git@HEAD',
  'third_party/google/gvisor':
    Var('github_url') + '/google/gvisor.git@HEAD',
  'third_party/google/go-github':
    Var('github_url') + '/google/go-github.git@HEAD',

  # 6. High-Performance Rust Web Tooling & Vercel Edge / AI Labs
  'third_party/oxc':
    Var('github_url') + '/oxc-project/oxc.git@HEAD',
  'third_party/vercel-labs':
    Var('github_url') + '/vercel-labs/agent-browser.git@HEAD',
}

hooks = [
  {
    'name': 'bun_install_frozen',
    'pattern': '.',
    'action': ['bun', 'install', '--frozen-lockfile'],
  },
  {
    'name': 'verify_third_party_governance',
    'pattern': 'third_party/.*',
    'action': ['bun', 'run', 'scripts/yolo.ts', 'google', 'third-party'],
  },
]
