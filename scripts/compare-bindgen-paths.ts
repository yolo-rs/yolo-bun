// Compare bindgen outputs from separate processes; never write into the live build.
import {
  mkdtemp,
  mkdir,
  readdir,
  readFile,
  realpath,
  rm,
} from "node:fs/promises";
import { basename, join, relative, resolve, sep } from "node:path";

const [checkoutArg, workspaceArg] = Bun.argv.slice(2);
if (!checkoutArg || !workspaceArg)
  throw new Error(
    "usage: bun scripts/compare-bindgen-paths.ts <checkout> <workspace>",
  );
const root = await realpath(checkoutArg);
const workspace = await realpath(workspaceArg);
const scratch = await mkdtemp(join(workspace, ".tmp-yolo-bindgen-"));
const actualScratch = await realpath(scratch);
const rel = relative(workspace, actualScratch);
if (
  !rel ||
  rel.startsWith(`..${sep}`) ||
  rel === ".." ||
  resolve(workspace, rel) !== actualScratch ||
  !basename(actualScratch).startsWith(".tmp-yolo-bindgen-")
) {
  throw new Error("scratch directory is outside workspace");
}
try {
  const ninja = await Bun.file(join(root, "build/release/build.ninja")).text();
  const line = ninja
    .split("\n")
    .find(
      (item) =>
        item.includes("codegen\\bindgen.ts") && item.includes("--sources="),
    );
  if (!line) throw new Error("Windows bindgen command not found");
  const flag = (name: string): string => {
    const match = line.match(new RegExp(`(?:^|\\s)--${name}=([^\\s]+)`));
    if (!match) throw new Error(`missing --${name}`);
    return match[1];
  };
  const sources = flag("sources").split(",");
  const absolute = sources.map((source) => {
    const index = source.indexOf("=");
    return `${source.slice(0, index + 1)}${resolve(root, source.slice(index + 1))}`;
  });
  for (const [name, list] of [
    ["relative", sources],
    ["absolute", absolute],
  ] as const) {
    const out = join(scratch, name);
    await mkdir(out);
    const args = [
      process.execPath,
      join(root, "src/codegen/bindgen.ts"),
      `--sources=${list.join(",")}`,
      `--types-only=${flag("types-only")}`,
      `--codegen-path=${join(out, "codegen")}`,
      `--types-path=${join(out, "types")}`,
      `--engine-directory=${flag("engine-directory")}`,
      `--builtin-uses=${flag("builtin-uses")}`,
    ];
    const proc = Bun.spawn(args, { cwd: root, stdout: "pipe", stderr: "pipe" });
    const [code, stdout, stderr] = await Promise.all([
      proc.exited,
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
    ]);
    if (code !== 0)
      throw new Error(`${name} bindgen failed (${code}): ${stdout}\n${stderr}`);
  }
  for (const category of ["codegen", "types"]) {
    const aDir = join(scratch, "relative", category);
    const bDir = join(scratch, "absolute", category);
    const a = (await readdir(aDir)).sort();
    const b = (await readdir(bDir)).sort();
    if (JSON.stringify(a) !== JSON.stringify(b))
      throw new Error(`${category} file lists differ`);
    for (const file of a)
      if (
        !(await readFile(join(aDir, file))).equals(
          await readFile(join(bDir, file)),
        )
      )
        throw new Error(`${category}/${file} differs`);
    console.log(`${category}: ${a.length} files byte-identical`);
  }
  console.log(
    `${sources.length} schema paths; independent generator processes`,
  );
} finally {
  await rm(actualScratch, { recursive: true });
}
