import Box from "@mui/material/Box";

import { slotStatusLabels } from "config/slotStatusText";
import { designTokens } from "theme/designTokens";
import { slotStatusColors, type SlotStatus } from "theme/slotStatusTokens";

type SlotStatusBadgeProps = {
  status: SlotStatus;
  /** 不传时显示状态的默认文案。 */
  label?: string;
};

/** 车位状态徽标：颜色 + 文字双重表达，不只依赖颜色区分状态。 */
export function SlotStatusBadge({ status, label }: SlotStatusBadgeProps) {
  const colors = slotStatusColors[status];

  return (
    <Box
      component="span"
      sx={{
        alignItems: "center",
        bgcolor: colors.background,
        border: `2px ${colors.borderStyle} ${colors.border}`,
        borderRadius: `${designTokens.radius.full}px`,
        color: colors.text,
        display: "inline-flex",
        typography: "body2",
        fontWeight: (theme) => theme.typography.button.fontWeight,
        px: 1.5,
        py: 0.25,
      }}
    >
      {label ?? slotStatusLabels[status]}
    </Box>
  );
}
