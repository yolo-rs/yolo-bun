// Compare the pinned checkout's AOT generator in memory without touching build outputs.
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const root = resolve(Bun.argv[2] ?? "");
if (!Bun.argv[2])
  throw new Error("usage: bun scripts/compare-codegen-paths.ts <checkout>");
process.chdir(root);
const ninja = await Bun.file(resolve(root, "build/release/build.ninja")).text();
const line = ninja
  .split("\n")
  .find(
    (item) =>
      item.includes("codegen\\builtins\\index.ts") &&
      item.includes("--sources="),
  );
if (!line) throw new Error("Windows builtins generator command not found");
const flag = (name: string): string => {
  const match = line.match(new RegExp(`(?:^|\\s)--${name}=([^\\s]+)`));
  if (!match) throw new Error(`missing --${name}`);
  return match[1];
};
process.env.AOT_ENGINE_DIRECTORY = flag("engine-directory");
const { generate } = await import(
  pathToFileURL(resolve(root, "src/codegen/builtins/index.ts")).href
);
const sources = flag("sources").split(",");
const absolute = sources.map((source) => {
  const index = source.indexOf("=");
  return `${source.slice(0, index + 1)}${resolve(root, source.slice(index + 1))}`;
});
const options = {
  bunRoot: root,
  javaScriptCore: null,
  prebuiltGenerated: flag("prebuilt-generated"),
  target: flag("target"),
  typesOnly: flag("types-only").split(","),
};
const relativeResult = await generate({
  ...options,
  bindgenSources: [...sources].sort(),
});
const absoluteResult = await generate({
  ...options,
  bindgenSources: absolute.sort(),
});
for (const category of ["engine", "table", "codegen"] as const) {
  const a = [...relativeResult[category]].sort(([x], [y]) =>
    x.localeCompare(y),
  );
  const b = [...absoluteResult[category]].sort(([x], [y]) =>
    x.localeCompare(y),
  );
  if (JSON.stringify(a) !== JSON.stringify(b))
    throw new Error(`${category} outputs differ`);
  console.log(`${category}: ${a.length} outputs identical`);
}
if (JSON.stringify(relativeResult.dump) !== JSON.stringify(absoluteResult.dump))
  throw new Error("table dumps differ");
if (
  relativeResult.undescribedResultsSummary !==
  absoluteResult.undescribedResultsSummary
)
  throw new Error("summaries differ");
console.log(
  `${sources.length} schema paths; table dumps and summaries identical`,
);
