import { describe, expect, it } from "vitest";

import {
  createPlateProjection,
  decodePlate,
  plateTokens,
  selectDetections,
} from "./recognitionMath";

describe("车牌识别纯函数", () => {
  it("CTC 移除 blank 与重复索引后得到车牌", () => {
    const plate = "辽A12345";
    const indices = [
      0,
      ...Array.from(plate, (character) =>
        plateTokens.indexOf(character as (typeof plateTokens)[number]),
      ),
    ];
    const scores = new Float32Array(indices.length * plateTokens.length);
    indices.forEach((index, t) => {
      scores[t * plateTokens.length + index] = 0.96;
    });
    expect(decodePlate(scores, indices.length, plateTokens.length)).toBe(plate);
  });

  it("低置信度与不合法号码不会自动填入", () => {
    const scores = new Float32Array(plateTokens.length);
    scores[plateTokens.indexOf("辽")] = 0.1;
    expect(decodePlate(scores, 1, plateTokens.length)).toBeNull();
  });

  it("倾斜四边形透视矫正保持四角坐标并避免双线性拉伸", () => {
    const points = [0, 0, 120, 0, 90, 40, 15, 40];
    const projection = createPlateProjection(points);
    expect(projection).not.toBeNull();
    if (!projection) return;
    expect(projection.sample(0, 0)).toEqual([0, 0]);
    expect(projection.sample(1, 0)).toEqual([120, 0]);
    expect(projection.sample(1, 1)).toEqual([90, 40]);
    expect(projection.sample(0, 1)).toEqual([15, 40]);
    const [midX, midY] = projection.sample(0.5, 0.5);
    expect(midX).not.toBeCloseTo((0 + 120 + 90 + 15) / 4, 2);
    expect(midY).toBeGreaterThan(0);
    expect(midY).toBeLessThan(40);
    expect(projection.resizedWidth).toBeLessThan(160);
  });

  it("窄车牌保留右侧补零，高牌旋转后仍可展平", () => {
    const regular = createPlateProjection([10, 10, 70, 10, 70, 30, 10, 30]);
    expect(regular?.resizedWidth).toBe(144);
    const tall = createPlateProjection([10, 10, 30, 10, 30, 90, 10, 90]);
    expect(tall?.resizedWidth).toBe(160);
    expect(tall?.sample(0, 0)).toEqual([30, 10]);
    expect(tall?.sample(1, 0)).toEqual([30, 90]);
    expect(createPlateProjection([0, 0, 0, 0, 0, 0, 0, 0])).toBeNull();
  });

  it("检测后处理筛选低分并排除重复候选", () => {
    const output = new Float32Array(3 * 15);
    for (let i = 0; i < 3; i += 1) {
      output[i * 15 + 4] = i === 2 ? 0.1 : 0.9;
      output[i * 15 + 13] = 0.9;
      for (let p = 0; p < 8; p += 1) output[i * 15 + 5 + p] = 100 + p;
    }
    expect(selectDetections(output, 3, 15, 1, 0, 0)).toHaveLength(1);
  });
});
