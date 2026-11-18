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
  "h4",
  "h5",
  "h6",
  "subtitle1",
  "subtitle2",
  "body1",
  "body2",
  "caption",
  "overline",
  "button",
] as const;

describe("theme", () => {
  it.each(typographyVariants)("%s 字号不低于长辈可读的最小字号", (variant) => {
    expect(remToPx(theme.typography[variant].fontSize)).toBeGreaterThanOrEqual(
      designTokens.typography.minSize,
    );
  });

  it("标题从 h1 到 h6 字号非递增", () => {
    const sizes = (["h1", "h2", "h3", "h4", "h5", "h6"] as const).map(
      (variant) => remToPx(theme.typography[variant].fontSize),
    );
    for (let index = 1; index < sizes.length; index++) {
      expect(sizes[index - 1]).toBeGreaterThanOrEqual(sizes[index]);
    }
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
