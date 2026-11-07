// SPDX-License-Identifier: MIT OR Apache-2.0
import type { BunWatch, OrgWatch } from "./watch";
import type { DriftReport } from "./mirror-drift";

const s8 = (s: string | null | undefined) => (s ? s.slice(0, 8) : "n/a");
const vs = (
  v: { aheadBy: number; behindBy: number; status: string } | null | undefined,
) =>
  v ? `${v.status}: main-side ahead ${v.aheadBy}, behind ${v.behindBy}` : "n/a";

export function bunMarkdown(w: BunWatch, changes: string[]): string {
  const L: string[] = [];
  L.push(`# oven-sh/bun watch ${w.generatedAt.slice(0, 10)}`, "");
  L.push(
    `Generated ${w.generatedAt}. Pin: \`${w.pin.commit}\` (snapshot ${w.pin.snapshotDate}).`,
    "",
  );
  L.push(
    "## Changes since last snapshot",
    "",
    ...changes.map((c) => `- ${c}`),
    "",
  );
  L.push("## Refs vs yolo-bun pin", "");
  L.push("| Ref | Commit | Date | Versus pin |", "| --- | --- | --- | --- |");
  L.push(
    `| main HEAD | \`${s8(w.main.sha)}\` | ${w.main.date} | ${w.main.vsPin ? `${w.main.vsPin.aheadBy} commits ahead of pin (${w.main.vsPin.status})` : "n/a"} |`,
  );
  if (w.stable)
    L.push(
      `| stable ${w.stable.tag} | \`${s8(w.stable.commit)}\` | ${w.stable.publishedAt} | ${vs(w.stable.vsPin)} |`,
    );
  if (w.canary)
    L.push(
      `| canary tag | \`${s8(w.canary.commit)}\` | ${w.canary.publishedAt ?? "n/a"} | ${vs(w.canary.vsPin)}; canary vs main: ${w.canary.vsMain} |`,
    );
  if (
    w.canary?.publishedAt &&
    Date.parse(w.canary.publishedAt) <
      Date.parse(w.generatedAt) - 30 * 86_400_000
  )
    L.push(
      "",
      "Note: the canary tag is stale; the live canary lane is main HEAD.",
    );
  L.push("", `Main HEAD message: ${w.main.message}`, "");
  L.push(
    "## Recent releases",
    "",
    ...w.recentReleases.map(
      (r) =>
        `- ${r.tag}${r.prerelease ? " (prerelease)" : ""} ${r.publishedAt}`,
    ),
    "",
  );
  const v = w.velocity;
  L.push(`## PR and issue velocity (since ${v.since})`, "");
  L.push("| Metric | Count |", "| --- | --- |");
  L.push(
    `| Open PRs | ${v.prOpen} |`,
    `| PRs opened | ${v.prOpened7} |`,
    `| PRs merged | ${v.prMerged7} |`,
  );
  L.push(
    `| Open issues | ${v.issOpen} |`,
    `| Issues opened | ${v.issOpened7} |`,
    `| Issues closed | ${v.issClosed7} |`,
    "",
  );
  L.push("## Cargo workspace", "");
  L.push(
    `- Members: pin ${w.cargo.membersPin}, main ${w.cargo.membersMain} (under src/: ${w.cargo.srcMembersPin} -> ${w.cargo.srcMembersMain})`,
  );
  L.push(`- Added since pin: ${w.cargo.added.join(", ") || "none"}`);
  L.push(`- Removed since pin: ${w.cargo.removed.join(", ") || "none"}`, "");
  L.push("## WebKit pin", "");
  L.push(
    `- Pin commit: \`${s8(w.webkit.pin)}\`; main: \`${s8(w.webkit.main)}\`; ${w.webkit.changed ? "CHANGED" : "unchanged"}`,
    "",
  );
  return L.join("\n");
}

export function orgMarkdown(
  repos: OrgWatch,
  prev: OrgWatch | null,
  at: string,
): string {
  const old = new Map((prev ?? []).map((r) => [r.name, r.stars]));
  const L = [
    `# oven-sh org watch ${at.slice(0, 10)}`,
    "",
    `${repos.length} public repositories, sorted by stars.`,
    "",
  ];
  L.push(
    "| # | Repo | Stars | Delta | Open issues | Language | Pushed |",
    "| --- | --- | --- | --- | --- | --- | --- |",
  );
  repos.slice(0, 25).forEach((r, i) => {
    const d = old.has(r.name) ? r.stars - old.get(r.name)! : null;
    L.push(
      `| ${i + 1} | ${r.name}${r.archived ? " (archived)" : ""}${r.fork ? " (fork)" : ""} | ${r.stars} | ${d === null ? "n/a" : d >= 0 ? `+${d}` : d} | ${r.openIssues} | ${r.language ?? ""} | ${r.pushedAt?.slice(0, 10)} |`,
    );
  });
  return L.join("\n") + "\n";
}

export function driftMarkdown(
  d: DriftReport,
  audit: Record<string, unknown>,
  at: string,
): string {
  const L = [
    `# yolo-rs mirror drift ${at.slice(0, 10)}`,
    "",
    `${d.rows.length} mirrors reported of ${d.scanned} forks scanned in ${d.org}.`,
    "",
  ];
  L.push(
    "| Mirror | Upstream | Status | Behind | Ahead |",
    "| --- | --- | --- | --- | --- |",
  );
  for (const r of d.rows)
    L.push(
      `| ${r.repo} | ${r.upstream ?? "n/a"} | ${r.error ? `error: ${r.error}` : r.status} | ${r.behindBy ?? ""} | ${r.aheadBy ?? ""} |`,
    );
  L.push(
    "",
    "## Git/GitHub audit",
    "",
    "```json",
    JSON.stringify(audit, null, 2),
    "```",
    "",
  );
  return L.join("\n");
}
