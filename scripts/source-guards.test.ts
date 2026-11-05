import { describe, expect, test } from "bun:test";
import {
  mkdir,
  mkdtemp,
  rmdir,
  symlink,
  unlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { resolvePatchFile } from "./source-guards";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "patches");

describe("patch file containment", () => {
  test("accepts a regular file in the patch directory", async () => {
    expect(await resolvePatchFile(root, "README.md")).toEndWith("README.md");
  });
  test("rejects an existing file outside the patch directory", async () => {
    await expect(resolvePatchFile(root, "../README.md")).rejects.toThrow(
      "escapes patches",
    );
  });
  test("rejects the patch directory itself", async () => {
    await expect(resolvePatchFile(root, ".")).rejects.toThrow();
  });
  test("rejects a path through a directory link outside the patch root", async () => {
    const dir = await mkdtemp(join(tmpdir(), "yolo-patch-guard-"));
    const patches = join(dir, "patches");
    const outside = join(dir, "outside.patch");
    const link = join(patches, "link");
    await mkdir(patches);
    await writeFile(outside, "fixture");
    await symlink(dir, link, "junction");
    try {
      await expect(
        resolvePatchFile(patches, "link/outside.patch"),
      ).rejects.toThrow("escapes patches");
    } finally {
      await unlink(link);
      await unlink(outside);
      await rmdir(patches);
      await rmdir(dir);
    }
  });
});
