"use client";

import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { slotLayout } from "config/slotLayout";
import { slotMapText } from "config/slotMapText";
import { slotStatusLabels, slotStatusShortLabels } from "config/slotStatusText";
import type { SlotMapSlot } from "internal/parking";
import { designTokens } from "theme/designTokens";
import { slotStatusColors } from "theme/slotStatusTokens";
import { theme } from "theme/theme";

import { getSlotLabelLayout } from "./getSlotLabelLayout";

type ParkingSlotMapProps = {
  slots: SlotMapSlot[];
  highlightCode?: string;
};

/** 布局坐标完全由定稿 JSON 决定；SVG 统一按 viewBox 等比缩放。 */
export function ParkingSlotMap({ slots, highlightCode }: ParkingSlotMapProps) {
  const router = useRouter();
  const highlightedRef = useRef<SVGGElement>(null);
  const [pressedCode, setPressedCode] = useState<string | null>(null);
  const slotsByCode = new Map(slots.map((slot) => [slot.code, slot]));
  const grey = theme.palette.grey;

  useEffect(() => {
    if (highlightCode) {
      highlightedRef.current?.scrollIntoView?.({
        block: "center",
        inline: "center",
      });
    }
  }, [highlightCode]);
  return (
    <Stack
      component="section"
      spacing={1}
      sx={{
        minWidth: 0,
        bgcolor: "background.paper",
        borderRadius: designTokens.radius.lg + "px",
        boxShadow: 1,
        p: 1,
      }}
    >
      <Stack
        direction="row"
        useFlexGap
        sx={{
          alignItems: "baseline",
          flexWrap: "wrap",
          justifyContent: "space-between",
        }}
      >
        <Typography component="h2" variant="h3">
          {slotMapText.overview}
        </Typography>
        <Typography variant="body2">{slotMapText.counts}</Typography>
      </Stack>
      <Box
        aria-label={slotMapText.mapTitle}
        data-testid="slot-map-viewport"
        role="region"
        tabIndex={0}
        sx={{
          minWidth: 0,
          width: "100%",
        }}
      >
        <Box
          aria-label={slotMapText.mapTitle}
          component="svg"
          preserveAspectRatio="xMidYMid meet"
          role="group"
          sx={{
            display: "block",
            height: "auto",
            width: "100%",
            "@keyframes slot-highlight-pulse": {
              "0%, 100%": { strokeOpacity: 1 },
              "50%": { strokeOpacity: 0.35 },
            },
            "@media (prefers-reduced-motion: no-preference)": {
              "& [data-slot-highlight='true'] > rect": {
                animation: "slot-highlight-pulse 1s ease-in-out infinite",
              },
            },
          }}
          viewBox={"0 0 " + slotLayout.width + " " + slotLayout.height}
        >
          <rect
            fill={designTokens.color.background.app}
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
                fontSize={84}
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
                  strokeWidth={3}
                  width={obstacle.w}
                  x={obstacle.x}
                  y={obstacle.y}
                />
                <text
                  dominantBaseline="central"
                  fill={grey[800]}
                  fontFamily={designTokens.typography.fontFamily}
                  fontSize={Math.min(
                    45,
                    (obstacle.w - 8) / obstacle.label.length,
                  )}
                  fontWeight={700}
                  textAnchor="middle"
                  x={obstacle.x + obstacle.w / 2}
                  y={obstacle.y + obstacle.h / 2}
                >
                  {obstacle.label}
                </text>
              </g>
            ))}
            <rect
              fill={grey[100]}
              height={slotLayout.entrance.h}
              stroke={grey[500]}
              strokeWidth={3}
              width={slotLayout.entrance.w}
              x={slotLayout.entrance.x}
              y={slotLayout.entrance.y}
            />
            <text
              dominantBaseline="central"
              fill={grey[800]}
              fontFamily={designTokens.typography.fontFamily}
              fontSize={62}
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
            const colors =
              active && slot ? slotStatusColors[slot.status] : null;
            const statusText =
              active && slot
                ? slotStatusShortLabels[slot.status]
                : slot
                  ? slotMapText.inactive
                  : slotMapText.unavailable;
            const labelLayout = getSlotLabelLayout(shape, statusText);
            const highlighted = highlightCode === shape.code && active;
            const fill = colors?.background ?? grey[300];
            const border = colors?.border ?? grey[600];
            const ink = colors?.text ?? grey[800];
            const drawing = (
              <g
                data-slot-highlight={highlighted ? "true" : undefined}
                ref={highlighted ? highlightedRef : undefined}
                opacity={pressedCode === shape.code ? 0.8 : 1}
              >
                <rect
                  fill={fill}
                  height={shape.h}
                  rx={designTokens.radius.sm}
                  stroke={highlighted ? theme.palette.error.main : border}
                  strokeDasharray={
                    colors?.borderStyle === "dashed" ? "12 8" : undefined
                  }
                  strokeWidth={
                    highlighted ? 12 : pressedCode === shape.code ? 9 : 5
                  }
                  width={shape.w}
                  x={shape.x}
                  y={shape.y}
                />
                <text
                  dominantBaseline="central"
                  fill={ink}
                  fontFamily={designTokens.typography.fontFamily}
                  fontSize={labelLayout.number.fontSize}
                  fontWeight={900}
                  pointerEvents="none"
                  textAnchor="middle"
                  x={labelLayout.number.x}
                  y={labelLayout.number.y}
                >
                  {shape.code}
                </text>
                <text
                  dominantBaseline="central"
                  fill={ink}
                  fontFamily={designTokens.typography.fontFamily}
                  fontSize={labelLayout.status.fontSize}
                  fontWeight={700}
                  pointerEvents="none"
                  textAnchor="middle"
                  x={labelLayout.status.x}
                  y={labelLayout.status.y}
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
                onPointerDown={(event) => {
                  if (event.button !== 0) return;
                  setPressedCode(shape.code);
                  router.prefetch("/slots/" + encodeURIComponent(shape.code));
                }}
                onPointerUp={() => setPressedCode(null)}
                onPointerLeave={() => setPressedCode(null)}
                onPointerCancel={() => setPressedCode(null)}
                onClick={(event) => {
                  if (
                    event.button !== 0 ||
                    event.metaKey ||
                    event.ctrlKey ||
                    event.shiftKey ||
                    event.altKey
                  ) {
                    return;
                  }
                  event.preventDefault();
                  setPressedCode(null);
                  router.push("/slots/" + encodeURIComponent(shape.code));
                }}
              >
                {drawing}
              </a>
            ) : (
              <g key={shape.code} data-testid={"inactive-slot-" + shape.code}>
                {drawing}
              </g>
            );
          })}
          <g
            aria-hidden="true"
            pointerEvents="none"
            data-testid="slot-map-walls"
          >
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
              points={slotLayout.sealedOpening
                .map((point) => point.join(","))
                .join(" ")}
              stroke={grey[600]}
              strokeDasharray="18 12"
              strokeWidth={9}
            />
          </g>
        </Box>
      </Box>
    </Stack>
  );
}
