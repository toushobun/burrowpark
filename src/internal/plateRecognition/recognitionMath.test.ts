import { describe, expect, it } from "vitest";

import { decodePlate, plateTokens, selectDetections } from "./recognitionMath";

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
