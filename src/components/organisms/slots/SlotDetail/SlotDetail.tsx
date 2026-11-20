"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Snackbar from "@mui/material/Snackbar";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { useState } from "react";

import { SlotStatusBadge } from "atoms/slots/SlotStatusBadge/SlotStatusBadge";
import { billingTypeLabels, slotDetailText } from "config/slotDetailText";
import type { SlotDetail as SlotDetailData } from "internal/parking";
import { formatPlateForDisplay } from "internal/parking";
import { designTokens } from "theme/designTokens";

export type SlotDetailDisplay = {
  enteredAt: string | null;
  paidUntil: string | null;
  elapsed: string | null;
  borrowUntil: string | null;
  leasePaidUntil: string | null;
};

type SlotDetailProps = {
  detail: SlotDetailData | null;
  display: SlotDetailDisplay | null;
};

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <Stack
      direction="row"
      spacing={1}
      sx={{ alignItems: "baseline", flexWrap: "wrap" }}
      useFlexGap
    >
      <Typography color="textSecondary" variant="body2">
        {label}
      </Typography>
      <Typography sx={{ overflowWrap: