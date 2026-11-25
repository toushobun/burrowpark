import { designTokens } from "theme/designTokens";

export const mapCardSx = {
  minWidth: 0,
  bgcolor: "background.paper",
  borderRadius: `${designTokens.radius.lg}px`,
  boxShadow: 2,
  p: 1,
};

export const legendCardSx = {
  bgcolor: "background.paper",
  borderRadius: `${designTokens.radius.md}px`,
  boxShadow: 1,
  p: 0.5,
};

// 间距与列宽共用同一个相对值，保证服务端加载骨架也可直接使用。
const legendGap = "0.25rem";

// 正常手机宽度最多四列；窄屏或字号放大时允许自动减列。
export const legendGridSx = {
  display: "grid",
  gap: legendGap,
  gridAutoRows: "1fr",
  gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, max(4.5rem, calc((100% - 3 * ${legendGap}) / 4))), 1fr))`,
};
