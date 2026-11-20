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
      <Typography sx={{ overflowWrap: "anywhere" }} variant="body1">
        {value}
      </Typography>
    </Stack>
  );
}

export function SlotDetail({ detail, display }: SlotDetailProps) {
  const [noticeOpen, setNoticeOpen] = useState(false);

  if (!detail) {
    return (
      <Stack spacing={3}>
        <Typography component="h2" variant="h2">
          {slotDetailText.missing}
        </Typography>
        <Button
          component={Link}
          fullWidth
          href="/"
          size="large"
          sx={{ minHeight: designTokens.size.touchTargetMin }}
          variant="contained"
        >
          {slotDetailText.backHome}
        </Button>
      </Stack>
    );
  }

  const vehicle = detail.presentVehicle;
  const phone = detail.lease?.phone?.trim();
  const hasDetails = Boolean(
    vehicle ||
    (detail.reservation
      ? detail.reservation.guestName || detail.reservation.note
      : detail.lease),
  );
  const actions = !detail.isActive
    ? []
    : vehicle
      ? detail.kind === "private"
        ? [slotDetailText.extendBorrow, slotDetailText.leave]
        : vehicle.billingType === "hotel_daily" ||
            vehicle.billingType === "lease"
          ? [slotDetailText.renew, slotDetailText.leave]
          : [slotDetailText.leave]
      : [slotDetailText.enter];

  return (
    <Stack spacing={3}>
      <Stack
        direction="row"
        spacing={2}
        sx={{ alignItems: "center", flexWrap: "wrap" }}
        useFlexGap
      >
        <Typography component="h2" variant="h2">
          {detail.name}
        </Typography>
        <SlotStatusBadge
          inactive={!detail.isActive}
          label={detail.isActive ? undefined : slotDetailText.inactive}
          status={detail.status}
        />
      </Stack>

      {detail.isActive && hasDetails && (
        <Paper
          variant="outlined"
          sx={{
            borderRadius: String(designTokens.radius.lg) + "px",
            p: 2,
          }}
        >
          <Stack spacing={2}>
            {vehicle ? (
              <>
                <DetailRow
                  label={slotDetailText.plate}
                  value={formatPlateForDisplay(vehicle.plate)}
                />
                <DetailRow
                  label={slotDetailText.billingType}
                  value={billingTypeLabels[vehicle.billingType]}
                />
                {display?.enteredAt && (
                  <DetailRow
                    label={slotDetailText.enteredAt}
                    value={display.enteredAt}
                  />
                )}
                {(vehicle.billingType === "hotel_daily" ||
                  vehicle.billingType === "lease") &&
                  display?.paidUntil && (
                    <DetailRow
                      label={slotDetailText.paidUntil}
                      value={display.paidUntil}
                    />
                  )}
                {(vehicle.billingType === "hourly" ||
                  vehicle.billingType === "free") &&
                  display?.elapsed && (
                    <Typography variant="body1">{display.elapsed}</Typography>
                  )}
                {vehicle.borrowUntil && display?.borrowUntil && (
                  <DetailRow
                    label={slotDetailText.borrowUntil}
                    value={display.borrowUntil}
                  />
                )}
                {vehicle.photoUrl && (
                  <Box
                    alt={slotDetailText.photo}
                    component="img"
                    src={vehicle.photoUrl}
                    sx={{
                      borderRadius: String(designTokens.radius.md) + "px",
                      display: "block",
                      maxHeight: designTokens.size.primaryActionHeight * 2,
                      objectFit: "cover",
                      width: "100%",
                    }}
                  />
                )}
              </>
            ) : detail.reservation ? (
              <>
                {detail.reservation.guestName && (
                  <DetailRow
                    label={slotDetailText.guestName}
                    value={detail.reservation.guestName}
                  />
                )}
                {detail.reservation.note && (
                  <DetailRow
                    label={slotDetailText.note}
                    value={detail.reservation.note}
                  />
                )}
              </>
            ) : detail.lease ? (
              <>
                <DetailRow
                  label={slotDetailText.tenantName}
                  value={detail.lease.tenantName}
                />
                {display?.leasePaidUntil && (
                  <DetailRow
                    label={slotDetailText.leasePaidUntil}
                    value={display.leasePaidUntil}
                  />
                )}
                {phone && (
                  <Button
                    component="a"
                    fullWidth
                    href={"tel:" + phone}
                    size="large"
                    sx={{ minHeight: designTokens.size.touchTargetMin }}
                    variant="outlined"
                  >
                    {slotDetailText.phone} {phone}
                  </Button>
                )}
              </>
            ) : null}
          </Stack>
        </Paper>
      )}

      {actions.length > 0 && (
        <Stack spacing={2}>
          {actions.map((action, index) => (
            <Button
              key={action}
              fullWidth
              onClick={() => setNoticeOpen(true)}
              size="large"
              sx={{ minHeight: designTokens.size.touchTargetMin }}
              variant={index === 0 ? "contained" : "outlined"}
            >
              {action}
            </Button>
          ))}
        </Stack>
      )}

      <Button
        component={Link}
        fullWidth
        href="/"
        size="large"
        sx={{ minHeight: designTokens.size.touchTargetMin }}
        variant="outlined"
      >
        {slotDetailText.backMap}
      </Button>
      <Snackbar
        autoHideDuration={3000}
        message={slotDetailText.pending}
        onClose={() => setNoticeOpen(false)}
        open={noticeOpen}
      />
    </Stack>
  );
}
