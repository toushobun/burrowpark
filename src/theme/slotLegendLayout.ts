import type { Theme } from "@mui/material/styles";

/** 常规宽度固定四等分，窄屏或字号放大时按可用宽度减少列数。 */
export const slotLegendGridSx = {
  display: "grid",
  gap: 0.5,
  gridAutoRows: "1fr",
  gridTemplateColumns: (theme: Theme) =>
    `repeat(auto-fit, minmax(min(100%, max(4.5rem, calc((100% - ${theme.spacing(1.5)}) / 4))), 1fr))`,
} as const;
