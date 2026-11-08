// SPDX-License-Identifier: MIT
/**
 * Console ROM, disc, executable and BIOS loader. Self-contained header, magic-byte, and
 * section detector for Bun.plugin (`import rom from "./game.nes"`).
 */
import { basename, extname, resolve } from "node:path";
import type { PluginBuilder } from "bun";
import { hashContent } from "../../bun-workspace/src/hash.ts";

/** Extensions routed to the console loader; content detection decides the real format. */
export const romExtensions = [
  "nes",
  "fds",
  "gb",
  "gbc",
  "gba",
  "agb",
  "mb",
  "nds",
  "dsi",
  "srl",
  "n64",
  "z64",
  "v64",
  "dol",
  "elf",
  "axf",
  "iso",
  "gcm",
  "wbfs",
  "wia",
  "rvz",
  "bin",
  "cue",
  "chd",
  "pbp",
  "psx",
  "3ds",
  "cci",
  "cxi",
  "nsp",
  "xci",
  "nro",
  "rom",
  "bios",
  "firmware",
  "md",
  "gen",
  "smd",
] as const;

export function extensionFilter(extensions: readonly string[]): RegExp {
  return new RegExp(
    `\\.(${extensions.map((extension) => extension.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})$`,
    "i",
  );
}

export interface RomSection {
  name: string;
  offset: number;
  size: number;
}

export interface ImageSummary {
  path: string;
  name: string;
  size: number;
  format: string;
  platform: string;
  arch: string;
  entry: number | null;
  header: Record<string, unknown>;
  sections: RomSection[];
}

export interface RomInfo extends ImageSummary {
  sha256: string;
}

function detectBinaryImage(bytes: Uint8Array, filePath: string): ImageSummary {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const ext = extname(filePath).toLowerCase().replace(/^\./, "");
  let format = ext || "binary";
  let platform = "unknown";
  let arch = "unknown";
  let entry: number | null = null;
  const header: Record<string, unknown> = {};
  const sections: RomSection[] = [];

  // iNES: "NES\x1a"
  if (bytes.length >= 16 && view.getUint32(0, false) === 0x4e45531a) {
    format = "ines";
    platform = "nes";
    arch = "mos6502";
    const prgBanks = bytes[4]!;
    const chrBanks = bytes[5]!;
    header.prgRomBytes = prgBanks * 16384;
    header.chrRomBytes = chrBanks * 8192;
    header.mapper = (bytes[6]! >> 4) | (bytes[7]! & 0xf0);
    sections.push({ name: "PRG-ROM", offset: 16, size: prgBanks * 16384 });
  } else if (bytes.length >= 64 && view.getUint32(0, false) === 0x7f454c46) {
    // ELF: "\x7fELF"
    format = "elf";
    platform = "elf";
    const is64 = bytes[4] === 2;
    const little = bytes[5] === 1;
    const machine = view.getUint16(18, little);
    arch =
      machine === 0x3e
        ? "x86_64"
        : machine === 0xb7
          ? "aarch64"
          : machine === 0x28
            ? "arm"
            : "mips/ppc";
    entry = is64
      ? Number(view.getBigUint64(24, little))
      : view.getUint32(24, little);
    header.bits = is64 ? 64 : 32;
    header.endian = little ? "little" : "big";
  } else if (bytes.length >= 4 && view.getUint32(0, false) === 0x80371240) {
    // N64 big-endian (.z64)
    format = "z64";
    platform = "n64";
    arch = "mips-r4300i";
    entry = view.getUint32(8, false);
  } else if (bytes.length >= 0x200 && ext === "nds") {
    format = "nds";
    platform = "nds";
    arch = "arm9/arm7";
    entry = view.getUint32(0x24, true);
    header.gameTitle = new TextDecoder("ascii")
      .decode(bytes.subarray(0, 12))
      .replace(/\0.*$/, "");
    header.gameCode = new TextDecoder("ascii").decode(bytes.subarray(12, 16));
  } else if (bytes.length >= 0x150 && (ext === "gb" || ext === "gbc")) {
    format = ext;
    platform = "gameboy";
    arch = "sm83";
    entry = 0x100;
  } else if (bytes.length >= 0xc0 && ext === "gba") {
    format = "gba";
    platform = "gba";
    arch = "arm7tdmi";
    entry = 0x08000000;
  }

  return {
    path: filePath,
    name: basename(filePath),
    size: bytes.byteLength,
    format,
    platform,
    arch,
    entry,
    header,
    sections,
  };
}

/** Full inspection: parsed image and SHA-256 digest. */
export async function inspectRom(input: string): Promise<RomInfo> {
  const path = resolve(input);
  const bytes = await Bun.file(path).bytes();
  const summary = detectBinaryImage(bytes, path);
  return { ...summary, sha256: hashContent(bytes) };
}

/** Module namespace for one image: summary, header, sections and platform metadata. */
export async function romExports(
  path: string,
): Promise<Record<string, unknown>> {
  const resolved = resolve(path);
  const bytes = await Bun.file(resolved).bytes();
  const summary = detectBinaryImage(bytes, resolved);
  return {
    default: summary,
    image: summary,
    format: summary.format,
    platform: summary.platform,
    header: summary.header,
    sections: summary.sections,
    entry: summary.entry,
    arch: summary.arch,
    summary,
  };
}

export function setupRomLoader(
  build: PluginBuilder,
  extensions: readonly string[] = romExtensions,
): void {
  const bundling = "config" in build && build.config !== undefined;
  build.onLoad(
    { filter: extensionFilter(extensions), namespace: "file" },
    async ({ path }) => {
      const resolved = resolve(path);
      const bytes = await Bun.file(resolved).bytes();
      const summary = detectBinaryImage(bytes, resolved);
      return bundling
        ? {
            contents: JSON.stringify(summary),
            loader: "json",
          }
        : { exports: await romExports(resolved), loader: "object" };
    },
  );
}
