// SPDX-License-Identifier: Apache-2.0
// Google Developers Clean-Room Portal Engine with Native Bun.markdown and SQLite WAL

import { Database } from "bun:sqlite";

export interface DocArticle {
  slug: string;
  title: string;
  category: "ai" | "cloud" | "android" | "web" | "infra";
  markdownContent: string;
  readingTimeMinutes: number;
}

export class GoogleDevPortalEngine {
  private db: Database;

  constructor(dbPath: string = ":memory:") {
    this.db = new Database(dbPath);
    this.initDb();
  }

  private initDb(): void {
    this.db.run("PRAGMA journal_mode = WAL;");
    this.db.run(`
      CREATE TABLE IF NOT EXISTS docs (
        slug TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        category TEXT NOT NULL,
        content TEXT NOT NULL,
        rendered_html TEXT NOT NULL
      );
    `);
  }

  public ingestArticle(doc: DocArticle): void {
    const rendered = Bun.markdown.html(doc.markdownContent);
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO docs (slug, title, category, content, rendered_html)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(doc.slug, doc.title, doc.category, doc.markdownContent, rendered);
  }

  public renderPage(slug: string): string {
    const stmt = this.db.query("SELECT * FROM docs WHERE slug = ?");
    const article = stmt.get(slug) as any;
    if (!article) return "<h1>404 Not Found</h1>";

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>${article.title} | Google for Developers</title>
  <style>
    :root {
      --md-sys-color-bg: #05080c;
      --md-sys-color-surface: #0c121b;
      --md-sys-color-primary: #4285f4;
      --md-sys-color-on-surface: #f5f7fa;
      --font-body: -apple-system, BlinkMacSystemFont, "Google Sans", "Segoe UI", Roboto, sans-serif;
      --font-code: "JetBrains Mono", Consolas, monospace;
    }
    body { background: var(--md-sys-color-bg); color: var(--md-sys-color-on-surface); font-family: var(--font-body); margin: 0; padding: 2rem; line-height: 1.6; }
    .doc-container { max-width: 960px; margin: 0 auto; background: var(--md-sys-color-surface); padding: 2.5rem; border-radius: 12px; border: 1px solid rgba(255,255,255,0.08); }
    h1 { color: var(--md-sys-color-primary); font-size: 2.2rem; }
    pre { background: #010409; padding: 1rem; border-radius: 8px; font-family: var(--font-code); overflow-x: auto; color: #58a6ff; }
  </style>
</head>
<body>
  <div class="doc-container">
    <h1>${article.title}</h1>
    <hr style="border: none; border-top: 1px solid rgba(255,255,255,0.1); margin: 1.5rem 0;"/>
    <div>${article.rendered_html}</div>
  </div>
</body>
</html>`;
  }
}
