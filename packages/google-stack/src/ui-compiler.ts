// SPDX-License-Identifier: Apache-2.0
/**
 * Google Material Design 3 (M3) Universal Multi-Surface UI Compiler
 * Compiles a single declarative Google UI specification (`vercel-labs/json-render` compatible)
 * into 5 native Google surfaces:
 * 1. Web: Google Wiz + Angular Signals + Material Web M3 (`<md-filled-button>`, `jsaction`)
 * 2. Android Mobile: Jetpack Compose Kotlin (`@Composable`, M3 `Scaffold`, `SearchBar`)
 * 3. Cross-Platform Mobile/Desktop/Web: Dart & Flutter (`Widget`, M3 `ColorScheme.fromSeed`)
 * 4. Native Desktop IDE/App: Zed GPUI Rust 2024 (`impl Render for GoogleSurfaceView`)
 * 5. Living Room TV: Google TV / Android TV 10-foot Leanback Compose (`TvLazyRow` + D-Pad focus)
 */

export type GoogleSurfaceTarget =
  | "web-wiz-angular-m3"
  | "android-jetpack-compose"
  | "flutter-dart-m3"
  | "desktop-zed-gpui-rust"
  | "tv-google-leanback";

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

export interface GoogleUiComponentSpec {
  readonly id: string;
  readonly title: string;
  readonly searchPlaceholder: string;
  readonly primaryActionLabel: string;
  readonly primaryJsAction: string;
  readonly cards: ReadonlyArray<{
    readonly id: string;
    readonly heading: string;
    readonly subtitle: string;
    readonly badge: string;
  }>;
}

export interface MultiSurfaceCompilationResult {
  readonly specId: string;
  readonly tokens: GoogleM3ColorTokens;
  readonly outputs: Record<GoogleSurfaceTarget, string>;
}

export class GoogleMultiSurfaceCompiler {
  compileAll(
    spec: GoogleUiComponentSpec,
    tokens: GoogleM3ColorTokens = GOOGLE_M3_DARK_TOKENS,
  ): MultiSurfaceCompilationResult {
    return {
      specId: spec.id,
      tokens,
      outputs: {
        "web-wiz-angular-m3": this.compileWebWizM3(spec, tokens),
        "android-jetpack-compose": this.compileJetpackCompose(spec, tokens),
        "flutter-dart-m3": this.compileFlutterDart(spec, tokens),
        "desktop-zed-gpui-rust": this.compileZedGpuiRust(spec, tokens),
        "tv-google-leanback": this.compileGoogleTvLeanback(spec, tokens),
      },
    };
  }

  compileWebWizM3(
    spec: GoogleUiComponentSpec,
    tokens: GoogleM3ColorTokens,
  ): string {
    const cardsHtml = spec.cards
      .map(
        (c) =>
          `    <article class="g-m3-card" jsname="${c.id}" jsaction="click:selectCard">
      <span class="g-m3-badge">${c.badge}</span>
      <h3>${c.heading}</h3>
      <p>${c.subtitle}</p>
    </article>`,
      )
      .join("\n");

    return `<section jscontroller="${spec.id}Controller" jsmodel="ds:0" style="background:${tokens.surface};color:${tokens.onSurface};">
  <header class="g-m3-top-bar">
    <h1>${spec.title}</h1>
    <input type="search" placeholder="${spec.searchPlaceholder}" jsaction="input:onSearchQuery" />
    <md-filled-button jsaction="click:${spec.primaryJsAction}">${spec.primaryActionLabel}</md-filled-button>
  </header>
  <div class="g-m3-grid">
${cardsHtml}
  </div>
</section>`;
  }

  compileJetpackCompose(
    spec: GoogleUiComponentSpec,
    tokens: GoogleM3ColorTokens,
  ): string {
    return `@Composable
fun ${spec.id}Screen(onAction: (String) -> Unit) {
    MaterialTheme(colorScheme = darkColorScheme(primary = Color(0xFF${tokens.primary.slice(1)}))) {
        Scaffold(containerColor = Color(0xFF${tokens.surface.slice(1)})) { padding ->
            Column(modifier = Modifier.padding(padding).fillMaxSize()) {
                Text(text = "${spec.title}", style = MaterialTheme.typography.headlineMedium)
                Button(onClick = { onAction("${spec.primaryJsAction}") }) {
                    Text("${spec.primaryActionLabel}")
                }
            }
        }
    }
}`;
  }

  compileFlutterDart(
    spec: GoogleUiComponentSpec,
    tokens: GoogleM3ColorTokens,
  ): string {
    return `class ${spec.id}Screen extends StatelessWidget {
  const ${spec.id}Screen({super.key});

  @override
  Widget build(BuildContext context) {
    return Theme(
      data: ThemeData(useMaterial3: true, colorSchemeSeed: const Color(0xFF${tokens.primary.slice(1)})),
      child: Scaffold(
        appBar: AppBar(title: const Text('${spec.title}')),
        body: ListView(
          children: const [
            ${spec.cards.map((c) => `ListTile(title: Text('${c.heading}'), subtitle: Text('${c.subtitle}'))`).join(",\n            ")}
          ],
        ),
      ),
    );
  }
}`;
  }

  compileZedGpuiRust(
    spec: GoogleUiComponentSpec,
    tokens: GoogleM3ColorTokens,
  ): string {
    return `pub struct ${spec.id}GpuiView;

impl Render for ${spec.id}GpuiView {
    fn render(&mut self, _cx: &mut ViewContext<Self>) -> impl IntoElement {
        div()
            .flex()
            .flex_col()
            .bg(rgb(0x${tokens.surface.slice(1)}))
            .text_color(rgb(0x${tokens.onSurface.slice(1)}))
            .child("${spec.title}")
            .child("${spec.primaryActionLabel}")
    }
}`;
  }

  compileGoogleTvLeanback(
    spec: GoogleUiComponentSpec,
    _tokens: GoogleM3ColorTokens,
  ): string {
    return `@Composable
fun ${spec.id}TvLeanbackRow(onCardFocus: (String) -> Unit) {
    TvLazyRow(horizontalArrangement = Arrangement.spacedBy(24.dp)) {
        items(${spec.cards.length}) { index ->
            Surface(onClick = { onCardFocus("card_$index") }, shape = ClickableSurfaceDefaults.shape()) {
                Text("${spec.title} // 10-Foot Google TV Surface")
            }
        }
    }
}`;
  }
}
