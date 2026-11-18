import { describe, expect, it } from "vitest";

import { designTokens } from "./designTokens";
import { theme } from "./theme";

// rem 按浏览器默认 16px 换算。
const remToPx = (value: string | number | undefined) =>
  typeof value === "number" ? value : Number.parseFloat(value ?? "0") * 16;

const typographyVariants = [
  "h1",
  "h2",
  "h3",
  "body1",
  "body2",
  "caption",
  "button",
] as const;

describe("theme", () => {
  it.each(typographyVariants)("%s 字号不低于长辈可读的最小字号", (variant) => {
    expect(remToPx(theme.typography[variant].fontSize)).toBeGreaterThanOrEqual(
      designTokens.typography.minSize,
    );
  });

  it("正文字号不低于 18px", () => {
    expect(remToPx(theme.typography.body1.fontSize)).toBeGreaterThanOrEqual(
      designTokens.typography.bodySize,
    );
  });

  it("按钮最小高度满足长辈点击区域", () => {
    const root = theme.components?.MuiButton?.styleOverrides?.root as {
      minHeight: number;
    };

    expect(root.minHeight).toBeGreaterThanOrEqual(56);
  });
});
