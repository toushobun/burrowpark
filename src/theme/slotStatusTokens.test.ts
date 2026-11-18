import { describe, expect, it } from "vitest";

import { slotStatusColors, slotStatuses } from "./slotStatusTokens";

// WCAG 2.1 相对亮度与对比度计算。
function luminance(hex: string): number {
  const channels = [1, 3, 5].map((index) => {
    const value = Number.parseInt(hex.slice(index, index + 2), 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrastRatio(foreground: string, background: string): number {
  const [light, dark] = [luminance(foreground), luminance(background)].sort(
    (a, b) => b - a,
  );
  return (light + 0.05) / (dark + 0.05);
}

describe("slotStatusColors", () => {
  it("每个车位状态都定义了配色", () => {
    expect(Object.keys(slotStatusColors).sort()).toEqual(
      [...slotStatuses].sort(),
    );
  });

  it("任意两种状态的边框和文字配色组合不相同", () => {
    const pairs = slotStatuses.map((status) => {
      const { border, text } = slotStatusColors[status];
      return `${border}:${text}`;
    });

    expect(new Set(pairs).size).toBe(slotStatuses.length);
  });

  it.each(slotStatuses)("%s 的文字与背景对比度满足 WCAG AA", (status) => {
    const { background, text } = slotStatusColors[status];

    expect(contrastRatio(text, background)).toBeGreaterThanOrEqual(4.5);
  });
});
