"use client";

import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import ButtonBase from "@mui/material/ButtonBase";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { useEffect, useState } from "react";

import { slotLayout } from "config/slotLayout";
import { slotMapText } from "config/slotMapText";
import { slotStatusLabels, slotStatusShortLabels } from "config/slotStatusText";
import type { SlotMapSlot } from "internal/parking";
import { designTokens } from "theme/designTokens";
import { slotStatusColors } from "theme/slotStatusTokens";

function isInner(code: string) {
  return Number(code) >= 15;
}

export function SlotCardList({
  slots,
  highlightCode,
}: {
  slots: SlotMapSlot[];
  highlightCode?: string;
}) {
  const [inner, setInner] = useState(isInner(highlightCode ?? ""));
  const [previousHighlight, setPreviousHighlight] = useState(highlightCode);
  if (previousHighlight !== highlightCode) {
    setPreviousHighlight(highlightCode);
    if (highlightCode) setInner(isInner(highlightCode));
  }
  useEffect(() => {
    if (highlightCode) {
      document.getElementById("slot-card-" + highlightCode)?.scrollIntoView?.({
        block: "nearest",
      });
    }
  }, [highlightCode]);
  const byCode = new Map(slots.map((slot) => [slot.code, slot]));

  return (
    <Stack
      component="section"
      id="slot-list"
      spacing={1}
      sx={{
        bgcolor: "background.paper",
        borderRadius: designTokens.radius.lg + "px",
        p: 1,
        scrollMarginTop: 8,
      }}
    >
      <Stack
        direction="row"
        useFlexGap
        sx={{ alignItems: "center", flexWrap: "wrap", justifyContent: "space-between" }}
      >
        <Typography component="h2" variant="h3">
          {inner ? slotMapText.inner : slotMapText.outer}
        </Typography>
        <Button
          onClick={() => setInner(!inner)}
          startIcon={<SwapHorizIcon />}
          variant="outlined"
          sx={{ px: 1, typography: "body2", bgcolor: "background.default" }}
        >
          {inner ? slotMapText.switchOuter : slotMapText.switchInner}
        </Button>
      </Stack>
      <Box
        sx={{
          display: "grid",
          gap: 1,
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
        }}
      >
        {slotLayout.slots.filter(({ code }) => isInner(code) === inner).map(({ code }) => {
          const slot = byCode.get(code);
          const active = Boolean(slot?.isActive);
          const colors = slot && active ? slotStatusColors[slot.status] : null;
          const status = !slot
            ? slotMapText.unavailable
            : active
              ? slotStatusShortLabels[slot.status]
              : slotMapText.inactive;
          const showPlate = active && slot && !["empty", "reserved", "privateIdle"].includes(slot.status);
          const primary = showPlate ? slot?.plate || slotMapText.noPlate : status;
          const label = code + "号，" + (active && slot ? slotStatusLabels[slot.status] : status);
          return (
            <ButtonBase
              key={code}
              id={"slot-card-" + code}
              aria-label={label + (showPlate && slot?.plate ? "，" + slot.plate : "")}
              component={Link}
              disabled={!active}
              href={"/slots/" + code}
              sx={{
                alignItems: "stretch",
                bgcolor: colors?.background ?? "action.disabledBackground",
                border: "1px solid",
                borderColor: highlightCode === code ? "error.main" : colors?.border ?? "divider",
                borderWidth: highlightCode === code ? 3 : 1,
                borderRadius: designTokens.radius.md + "px",
                color: colors?.text ?? "text.secondary",
                flexDirection: "column",
                justifyContent: "center",
                minHeight: designTokens.size.touchTargetMin,
                minWidth: 0,
                px: 0.5,
                py: 0.25,
                textAlign: "center",
                "&:active": { opacity: 0.75 },
              }}
            >
              <Typography component="span" variant="body2" sx={{ fontWeight: 900, textAlign: "left", lineHeight: 1.1 }}>
                {code}
              </Typography>
              <Typography component="span" variant="h6" sx={{ overflowWrap: "anywhere", lineHeight: 1.15, fontWeight: 900 }}>
                {primary}
              </Typography>
              {showPlate && (
                <Typography component="span" variant="body2" sx={{ lineHeight: 1.2 }}>
                  {status}
                </Typography>
              )}
            </ButtonBase>
          );
        })}
      </Box>
    </Stack>
  );
}
