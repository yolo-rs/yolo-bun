// SPDX-License-Identifier: MIT
/** Image and video metadata inspection through native binary header parsing and optional ffprobe. */
import { basename, extname, resolve } from "node:path";
import { hashContent } from "../../bun-workspace/src/hash.ts";

export interface MediaInfo {
  path: string;
  name: string;
  format: string;
  kind: "image" | "video" | "audio" | "unknown";
  size: number;
  sha256: string;
  width?: number;
  height?: number;
  durationSec?: number;
  codec?: string;
  [key: string]: unknown;
}

function parseImageDimensions(
  bytes: Uint8Array,
  ext: string,
): { width?: number; height?: number; format: string } {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  // PNG: 89 50 4E 47 0D 0A 1A 0A + IHDR at offset 16
  if (bytes.length >= 24 && view.getUint32(0, false) === 0x89504e47) {
    return {
      format: "png",
      width: view.getUint32(16, false),
      height: view.getUint32(20, false),
    };
  }
  // GIF87a / GIF89a
  if (
    bytes.length >= 10 &&
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46
  ) {
    return {
      format: "gif",
      width: view.getUint16(6, true),
      height: view.getUint16(8, true),
    };
  }
  // WebP: RIFF....WEBP
  if (
    bytes.length >= 30 &&
    view.getUint32(0, false) === 0x52494646 &&
    view.getUint32(8, false) === 0x57454250
  ) {
    const chunk = view.getUint32(12, false);
    if (chunk === 0x56503820 && bytes.length >= 30) {
      return {
        format: "webp",
        width: view.getUint16(26, true) & 0x3fff,
        height: view.getUint16(28, true) & 0x3fff,
      };
    }
    if (chunk === 0x5650384c && bytes.length >= 25) {
      const b = view.getUint32(21, true);
      return {
        format: "webp",
        width: (b & 0x3fff) + 1,
        height: ((b >> 14) & 0x3fff) + 1,
      };
    }
    return { format: "webp" };
  }
  // JPEG: FF D8
  if (bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    let offset = 2;
    while (offset + 9 < bytes.length) {
      if (bytes[offset] !== 0xff) {
        offset++;
        continue;
      }
      const marker = bytes[offset + 1]!;
      const len = view.getUint16(offset + 2, false);
      if (
        (marker >= 0xc0 && marker <= 0xc3) ||
        (marker >= 0xc5 && marker <= 0xc7) ||
        (marker >= 0xc9 && marker <= 0xcb) ||
        (marker >= 0xcd && marker <= 0xcf)
      ) {
        return {
          format: "jpeg",
          height: view.getUint16(offset + 5, false),
          width: view.getUint16(offset + 7, false),
        };
      }
      if (len < 2) break;
      offset += 2 + len;
    }
    return { format: "jpeg" };
  }
  return { format: ext.replace(/^\./, "") || "unknown" };
}

export async function inspectMedia(
  input: string,
): Promise<Record<string, unknown>> {
  const path = resolve(input);
  const file = Bun.file(path);
  const bytes = await file.bytes();
  const ext = extname(path).toLowerCase();
  const isVideo = /\.(mp4|m4v|mkv|webm|mov|avi|wmv|flv)$/i.test(ext);
  const dims = parseImageDimensions(bytes, ext);

  const info: MediaInfo = {
    path,
    name: basename(path),
    format: dims.format,
    kind: isVideo ? "video" : "image",
    size: bytes.byteLength,
    sha256: hashContent(bytes),
    ...(dims.width !== undefined ? { width: dims.width } : {}),
    ...(dims.height !== undefined ? { height: dims.height } : {}),
  };

  const ffprobe = Bun.which("ffprobe");
  if (isVideo && ffprobe) {
    try {
      const proc = Bun.spawn(
        [
          ffprobe,
          "-v",
          "quiet",
          "-print_format",
          "json",
          "-show_format",
          "-show_streams",
          path,
        ],
        { stdout: "pipe", stderr: "pipe", windowsHide: true },
      );
      const [stdout, exitCode] = await Promise.all([
        new Response(proc.stdout).text(),
        proc.exited,
      ]);
      if (exitCode === 0 && stdout.trim()) {
        const parsed = JSON.parse(stdout) as {
          format?: { duration?: string; format_name?: string };
          streams?: Array<{
            codec_name?: string;
            width?: number;
            height?: number;
          }>;
        };
        const stream = parsed.streams?.[0];
        if (stream?.width) info.width = stream.width;
        if (stream?.height) info.height = stream.height;
        if (stream?.codec_name) info.codec = stream.codec_name;
        if (parsed.format?.duration)
          info.durationSec = Number(parsed.format.duration);
      }
    } catch {
      // Fallback to header inspection when ffprobe fails.
    }
  }

  return info;
}
