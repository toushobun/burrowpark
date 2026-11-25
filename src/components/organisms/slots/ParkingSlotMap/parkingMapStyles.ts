import { designTokens } from "theme/designTokens";
import { theme } from "theme/theme";

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

// 正常手机宽度最多四列；窄屏或字号放大时允许自动减列。
export const legendGridSx = {
  display: "grid",
  gap: 0.5,
  gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, max(4.5rem, calc((100% - ${theme.spacing(1.5)}) / 4))), 1fr))`,
};
