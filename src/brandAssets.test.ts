// @vitest-environment node

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import manifest from "../app/manifest";

function readAsset(path: string) {
  return readFileSync(new URL("../" + path, import.meta.url));
}

function pngSize(path: string) {
  const png = readAsset(path);
  expect(png.subarray(0, 8)).toEqual(
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  );
  return [png.readUInt32BE(16), png.readUInt32BE(20)];
}

describe("品牌资源", () => {
  it("应用安装图标的实际尺寸与 manifest 一致", () => {
    const icons = manifest().icons ?? [];
    expect(icons).toHaveLength(3);
    for (const icon of icons) {
      expect(icon.type).toBe("image/png");
      expect(pngSize("public" + icon.src).join("x")).toBe(icon.sizes);
    }
    const maskable = icons.find((icon) => icon.purpose === "maskable");
    expect(maskable?.src).toBe("/icons/icon-maskable-512.png");
  });

  it("品牌标志与 Apple 桌面图标具有正确尺寸", () => {
    expect(pngSize("public/icons/brand-logo.png")).toEqual([800, 259]);
    expect(pngSize("public/apple-touch-icon.png")).toEqual([180, 180]);
  });

  it("浏览器 favicon 包含三个真实尺寸的 PNG 图层", () => {
    const ico = readAsset("app/favicon.ico");
    expect(ico.readUInt16LE(0)).toBe(0);
    expect(ico.readUInt16LE(2)).toBe(1);
    expect(ico.readUInt16LE(4)).toBe(3);
    for (const [i, size] of [16, 32, 48].entries()) {
      const entry = 6 + i * 16;
      expect(ico[entry]).toBe(size);
      expect(ico[entry + 1]).toBe(size);
      const offset = ico.readUInt32LE(entry + 12);
      expect(ico.readUInt32BE(offset + 16)).toBe(size);
      expect(ico.readUInt32BE(offset + 20)).toBe(size);
      // Turbopack's ICO decoder requires 8-bit RGBA PNG frames.
      expect(ico[offset + 24]).toBe(8);
      expect(ico[offset + 25]).toBe(6);
    }
  });
});
