import Box from "@mui/material/Box";

import { slotStatusLabels } from "config/slotStatusText";
import { designTokens } from "theme/designTokens";
import { slotStatusColors, type SlotStatus } from "theme/slotStatusTokens";

type SlotStatusBadgeProps = {
  status: SlotStatus;
  /** 不传时显示状态的默认文案。 */
  label?: string;
  /** 停用车位使用中性色，不显示可用状态的颜色。 */
  inactive?: boolean;
};

/** 车位状态徽标：颜色 + 文字双重表达，不只依赖颜色区分状态。 */
export function SlotStatusBadge({
  status,
  label,
  inactive = false,
}: SlotStatusBadgeProps) {
  const colors = slotStatusColors[status];

  return (
    <Box
      component="span"
      sx={{
        alignItems: "center",
        bgcolor: inactive ? "action.disabledBackground" : colors.background,
        border: inactive
          ? `2px solid ${designTokens.color.border.strong}`
          : `2px ${colors.borderStyle} ${colors.border}`,
        borderRadius: `${designTokens.radius.full}px`,
        color: inactive ? "text.primary" : colors.text,
        display: "inline-flex",
        typography: "body2",
        fontWeight: "fontWeightBold",
        px: 1.5,
        py: 0.25,
      }}
    >
      {label ?? slotStatusLabels[status]}
    </Box>
  );
}
