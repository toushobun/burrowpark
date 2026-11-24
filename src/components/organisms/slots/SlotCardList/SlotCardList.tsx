"use client";

import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { useEffect, type ReactNode } from "react";

import { slotLayout } from "config/slotLayout";
import { slotMapText } from "config/slotMapText";
import { slotStatusLabels, slotStatusShortLabels } from "config/slotStatusText";
import { formatPlateForDisplay, type SlotMapSlot } from "internal/parking";
import { designTokens } from "theme/designTokens";
import { slotStatusColors } from "theme/slotStatusTokens";

function SlotCardGroups({
  renderSlot,
}: {
  renderSlot: (code: string) => ReactNode;
}) {
  return (
    <Stack spacing={1}>
      {[
        { title: slotMapText.outer, inner: false },
        { title: slotMapText.inner, inner: true },
      ].map(({ title, inner }) => (
        <Stack
          key={title}
          component="section"
          aria-label={title}
          spacing={1}
          sx={{
            bgcolor: "background.paper",
            borderRadius: designTokens.radius.lg + "px",
            p: 1,
          }}
        >
          <Typography component="h2" variant="h3">
            {title}
          </Typography>
          <Box
            sx={{
              display: "grid",
              gap: 1,
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            }}
          >
            {slotLayout.slots
              .filter(({ code }) => (Number(code) >= 15) === inner)
              .map(({ code }) => renderSlot(code))}
          </Box>
        </Stack>
      ))}
    </Stack>
  );
}

export function SlotCardListSkeleton() {
  return (
    <SlotCardGroups
      renderSlot={(code) => (
        <Skeleton
          key={code}
          variant="rounded"
          height={designTokens.size.touchTargetMin}
        />
      )}
    />
  );
}

export function SlotCardList({
  slots,
  highlightCode,
}: {
  slots: SlotMapSlot[];
  highlightCode?: string;
}) {
  useEffect(() => {
    if (highlightCode) {
      document.getElementById("slot-card-" + highlightCode)?.scrollIntoView?.({
        block: "center",
      });
    }
  }, [highlightCode]);
  const byCode = new Map(slots.map((slot) => [slot.code, slot]));

  return (
    <SlotCardGroups
      renderSlot={(code) => {
        const slot = byCode.get(code);
        const active = Boolean(slot?.isActive);
        const colors = slot && active ? slotStatusColors[slot.status] : null;
        const status = !slot
          ? slotMapText.unavailable
          : active
            ? slot.status === "expiringSoon" || slot.status === "overdue"
              ? slotStatusLabels[slot.status]
              : slotStatusShortLabels[slot.status]
            : slotMapText.inactive;
        const showPlate =
          active &&
          slot &&
          !["empty", "reserved", "privateIdle"].includes(slot.status);
        const plate = formatPlateForDisplay(slot?.plate ?? null);
        const displayPlate = plate || slotMapText.noPlate;
        const primary = showPlate ? displayPlate : status;
        const fullStatus =
          active && slot ? slotStatusLabels[slot.status] : status;
        const label = code + "号，" + fullStatus;
        return (
          <ButtonBase
            key={code}
            id={"slot-card-" + code}
            aria-label={label + (showPlate && plate ? "，" + plate : "")}
            component={active ? Link : "button"}
            disabled={!active}
            href={active ? "/slots/" + code : undefined}
            sx={{
              alignItems: "stretch",
              bgcolor: colors?.background ?? "action.disabledBackground",
              border: "1px solid",
              borderColor:
                highlightCode === code
                  ? "error.main"
                  : (colors?.border ?? "divider"),
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
            <Typography
              component="span"
              variant="body2"
              sx={{ fontWeight: 900, textAlign: "left", lineHeight: 1.1 }}
            >
              {code}
            </Typography>
            <Typography
              component="span"
              variant="h6"
              sx={{
                overflowWrap: "anywhere",
                lineHeight: 1.15,
                fontWeight: 900,
              }}
            >
              {primary}
            </Typography>
            {showPlate && (
              <Typography
                component="span"
                variant="body2"
                sx={{ lineHeight: 1.2 }}
              >
                {status}
              </Typography>
            )}
          </ButtonBase>
        );
      }}
    />
  );
}
