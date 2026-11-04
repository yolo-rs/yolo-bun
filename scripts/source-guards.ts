// SPDX-License-Identifier: MIT OR Apache-2.0
import { realpath, stat } from "node:fs/promises";
import { isAbsolute, relative, resolve, sep } from "node:path";

/** Resolve a patch to a regular file contained in the canonical patch root. */
export async function resolvePatchFile(
  patchRoot: string,
  name: string,
): Promise<string> {
  const root = await realpath(patchRoot);
  const file = await realpath(resolve(root, name));
  const pathFromRoot = relative(root, file);
  if (
    !pathFromRoot ||
    pathFromRoot === ".." ||
    pathFromRoot.startsWith(`..${sep}`) ||
    isAbsolute(pathFromRoot)
  ) {
    throw new Error(`Patch path escapes patches/: ${name}`);
  }
  if (!(await stat(file)).isFile())
    throw new Error(`Patch is not a regular file: ${name}`);
  return file;
}
