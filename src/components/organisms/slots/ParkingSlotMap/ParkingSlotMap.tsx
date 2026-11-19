import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

import { SlotStatusBadge } from "atoms/slots/SlotStatusBadge/SlotStatusBadge";
import { slotLayout } from "config/slotLayout";
import { slotMapStatusLabels, slotMapText } from "config/slotMapText";
import { slotStatusLabels } from "config/slotStatusText";
import type { SlotMapSlot } from "internal/parking";
import { designTokens } from "theme/designTokens";
import { slotStatusColors, slotStatuses } from "theme/slotStatusTokens";
import { theme } from "theme/theme";

type ParkingSlotMapProps = {
  slots: SlotMapSlot[];
};

/** 布局坐标完全由定稿 JSON 决定；SVG 统一按 viewBox 等比缩放。 */
export function ParkingSlotMap({ slots }: ParkingSlotMapProps) {
  const slotsByCode = new Map(slots.map((slot) => [slot.code, slot]));
  const grey = theme.palette.grey;

  return (
    <Stack component="section" spacing={2} sx={{ minWidth: 0 }}>
      <Typography component="h2" variant="h2">
        {slotMapText.mapTitle}
      </Typography>
      <Box
        sx={{
          bgcolor: "background.paper",
          border: 1,
          borderColor: "divider",
          borderRadius: theme.shape.borderRadius / 1,
          minWidth: 0,
          overflow: "hidden",
          width: "100%",
        }}
      >
        <Box
          aria-label={slotMapText.mapTitle}
          component="svg"
          preserveAspectRatio="xMidYMid meet"
          role="group"
          sx={{ display: "block", height: "auto", maxWidth: "100%", width: "100%" }}
          viewBox={"0 0 " + slotLayout.width + " " + slotLayout.height}
        >
          <rect
            fill={grey[50]}
            height={slotLayout.height}
            width={slotLayout.width}
            x={0}
            y={0}
          />

          <g aria-hidden="true" pointerEvents="none">
            {slotLayout.areas.map((area) => (
              <text
                key={area.label}
                fill={grey[700]}
                fontFamily={designTokens.typography.fontFamily}
                fontSize={70}
                fontWeight={700}
                textAnchor="middle"
                x={area.x}
                y={area.y}
              >
                {area.label}
              </text>
            ))}
            {slotLayout.obstacles.map((obstacle) => (
              <g key={obstacle.label}>
                <rect
                  fill={grey[200]}
                  height={obstacle.h}
                  rx={designTokens.radius.sm}
                  stroke={grey[500]}
                  strokeWidth={4}
                  width={obstacle.w}
                  x={obstacle.x}
                  y={obstacle.y}
                />
                <text
                  dominantBaseline="central"
                  fill={grey[800]}
                  fontFamily={designTokens.typography.fontFamily}
                  fontSize={Math.min(45, (obstacle.w - 8) / obstacle.label.length)}
                  fontWeight={700}
                  textAnchor="middle"
                  x={obstacle.x + obstacle.w / 2}
                  y={obstacle.y + obstacle.h / 2}
                >
                  {obstacle.label}
                </text>
              </g>
            ))}
            {slotLayout.walls.map((wall, index) => (
              <polyline
                key={index}
                fill="none"
                points={wall.map((point) => point.join(",")).join(" ")}
                stroke={grey[600]}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={9}
              />
            ))}
            <polyline
              fill="none"
              points={slotLayout.sealedOpening.map((point) => point.join(",")).join(" ")}
              stroke={grey[600]}
              strokeDasharray="18 12"
              strokeWidth={9}
            />
            <rect
              fill={grey[100]}
              height={slotLayout.entrance.h}
              stroke={grey[500]}
              strokeWidth={4}
              width={slotLayout.entrance.w}
              x={slotLayout.entrance.x}
              y={slotLayout.entrance.y}
            />
            <text
              dominantBaseline="central"
              fill={grey[800]}
              fontFamily={designTokens.typography.fontFamily}
              fontSize={55}
              fontWeight={700}
              textAnchor="middle"
              x={slotLayout.entrance.x + slotLayout.entrance.w / 2}
              y={slotLayout.entrance.y + slotLayout.entrance.h / 2}
            >
              {slotMapText.entrance}
            </text>
          </g>

          {slotLayout.slots.map((shape) => {
            const slot = slotsByCode.get(shape.code);
            const active = Boolean(slot?.isActive);
            const colors = active && slot ? slotStatusColors[slot.status] : null;
            const statusText = active && slot
              ? slotMapStatusLabels[slot.status]
              : slot
                ? slotMapText.inactive
                : slotMapText.unavailable;
            const fill = colors?.background ?? grey[300];
            const border = colors?.border ?? grey[600];
            const ink = colors?.text ?? grey[800];
            const drawing = (
              <g>
                <rect
                  fill={fill}
                  height={shape.h}
                  rx={designTokens.radius.sm}
                  stroke={border}
                  strokeDasharray={colors?.borderStyle === "dashed" ? "12 8" : undefined}
                  strokeWidth={5}
                  width={shape.w}
                  x={shape.x}
                  y={shape.y}
                />
                <text
                  fill={ink}
                  fontFamily={designTokens.typography.fontFamily}
                  fontSize={Math.min(66, shape.w * 0.7)}
                  fontWeight={900}
                  pointerEvents="none"
                  textAnchor="middle"
                  x={shape.x + shape.w / 2}
                  y={shape.y + shape.h * 0.44}
                >
                  {shape.code}
                </text>
                <text
                  fill={ink}
                  fontFamily={designTokens.typography.fontFamily}
                  fontSize={42}
                  fontWeight={700}
                  lengthAdjust="spacingAndGlyphs"
                  pointerEvents="none"
                  textAnchor="middle"
                  textLength={Math.min(shape.w - 10, statusText.length * 42)}
                  x={shape.x + shape.w / 2}
                  y={shape.y + shape.h * 0.76}
                >
                  {statusText}
                </text>
              </g>
            );

            return active && slot ? (
              <a
                key={shape.code}
                aria-label={slot.name + "，" + slotStatusLabels[slot.status]}
                href={"/slots/" + encodeURIComponent(shape.code)}
              >
                {drawing}
              </a>
            ) : (
              <g key={shape.code} data-testid={"inactive-slot-" + shape.code}>
                {drawing}
              </g>
            );
          })}
        </Box>
      </Box>
      <Typography component="h3" variant="h3">
        {slotMapText.legendTitle}
      </Typography>
      <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }} useFlexGap>
        {slotStatuses.map((status) => (
          <SlotStatusBadge key={status} status={status} />
        ))}
      </Stack>
    </Stack>
  );
}
