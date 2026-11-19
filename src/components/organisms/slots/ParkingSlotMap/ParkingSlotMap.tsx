"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useState } from "react";

import { SlotStatusBadge } from "atoms/slots/SlotStatusBadge/SlotStatusBadge";
import { slotLayout } from "config/slotLayout";
import { slotMapText } from "config/slotMapText";
import { slotStatusLabels, slotStatusShortLabels } from "config/slotStatusText";
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
  const [zoomed, setZoomed] = useState(false);
  return (
    <Stack component="section" spacing={2} sx={{ minWidth: 0 }}>
      <Typography component="h2" variant="h2">
        {slotMapText.mapTitle}
      </Typography>
      <Button
        onClick={() => setZoomed((current) => !current)}
        size="large"
        sx={{
          alignSelf: "flex-start",
          minHeight: designTokens.size.touchTargetMin,
        }}
        variant="outlined"
      >
        {zoomed ? slotMapTe���q�^