import { describe, expect, it } from "vitest";

import { photoDimensions } from "./compressPhoto";

describe("照片压缩尺寸", () => {
  it("横图长边缩放到 1280 像素", () => {
    expect(photoDimensions(4000, 3000)).toEqual({ width: 1280, height: 960 });
  });
  it("竖图长边缩放到 1280 像素", () => {
    expect(photoDimensions(3000, 4000)).toEqual({ width: 960, height: 1280 });
  });
  it("原来较小的图片不放大", () => {
    expect(photoDimensions(800, 600)).toEqual({ width: 800, height: 600 });
  });
});
