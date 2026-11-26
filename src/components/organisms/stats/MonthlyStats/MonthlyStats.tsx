"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Link from "next/link";

import { paymentMethodLabels } from "config/checkInText";
import { monthlyStatsText } from "config/monthlyStatsText";
import { billingTypeLabels } from "config/slotDetailText";
import {
  shiftBusinessMonth,
  type MonthlyStats as MonthlyStatsData,
} from "internal/parking";
import { InfoCard } from "molecules/display/InfoCard/InfoCard";
import { designTokens } from "theme/designTokens";

type Props = {
  month: string;
  currentMonth: string;
  stats: MonthlyStatsData;
};

const formatCents = (cents: number) =>
  `${(cents / 100).toFixed(2)} ${monthlyStatsText.yuan}`;

function AmountRow({ label, cents }: { label: string; cents: number }) {
  return (
    <Stack
      direction="row"
      sx={{ alignItems: "center", justifyContent: "space-between", gap: 2 }}
    >
      <Typography variant="body1">{label}</Typography>
      <Typography variant="body1" sx={{ whiteSpace: "nowrap" }}>
        {formatCents(cents)}
      </Typography>
    </Stack>
  );
}

export function MonthlyStats({ month, currentMonth, stats }: Props) {
  const methods = Object.keys(
    paymentMethodLabels,
  ) as (keyof typeof paymentMethodLabels)[];
  const billingTypes = ["hotel_daily", "hourly", "lease"] as const;

  return (
    <Stack spacing={3}>
      <Box
        sx={{
          alignItems: "center",
          display: "grid",
          gap: 1,
          gridTemplateColumns: "minmax(0, 1fr) auto minmax(0, 1fr)",
        }}
      >
        <Button
          component={Link}
          href={`/stats?month=${shiftBusinessMonth(month, -1)}`}
          sx={{ minHeight: designTokens.size.touchTargetMin, px: 0 }}
          variant="text"
        >
          {monthlyStatsText.previousMonth}
        </Button>
        <Typography component="h2" variant="h3" sx={{ whiteSpace: "nowrap" }}>
          {monthlyStatsText.monthLabel(month)}
        </Typography>
        {month < currentMonth ? (
          <Button
            component={Link}
            href={`/stats?month=${shiftBusinessMonth(month, 1)}`}
            sx={{ minHeight: designTokens.size.touchTargetMin, px: 0 }}
            variant="text"
          >
            {monthlyStatsText.nextMonth}
          </Button>
        ) : (
          <Box />
        )}
      </Box>

      <InfoCard>
        <Stack spacing={1}>
          <Typography variant="body2" color="textSecondary">
            {monthlyStatsText.total}
          </Typography>
          <Typography component="p" variant="h1">
            {formatCents(stats.totalCents)}
          </Typography>
          <Typography variant="body1">
            {monthlyStatsText.entryCount(stats.entryCount)}
          </Typography>
        </Stack>
      </InfoCard>

      <Stack component="section" spacing={1.5}>
        <Typography component="h2" variant="h6">
          {monthlyStatsText.byMethod}
        </Typography>
        <InfoCard>
          <Stack spacing={1.5}>
            {methods.map((method) => (
              <AmountRow
                key={method}
                label={paymentMethodLabels[method]}
                cents={stats.byMethod[method]}
              />
            ))}
          </Stack>
        </InfoCard>
      </Stack>

      <Stack component="section" spacing={1.5}>
        <Typography component="h2" variant="h6">
          {monthlyStatsText.byBillingType}
        </Typography>
        <InfoCard>
          <Stack spacing={1.5}>
            {billingTypes.map((billingType) => (
              <AmountRow
                key={billingType}
                label={billingTypeLabels[billingType]}
                cents={stats.byBillingType[billingType]}
              />
            ))}
            {stats.byBillingType.free > 0 && (
              <AmountRow
                label={billingTypeLabels.free}
                cents={stats.byBillingType.free}
              />
            )}
          </Stack>
        </InfoCard>
      </Stack>

      <Stack component="section" spacing={1.5}>
        <Typography component="h2" variant="h6">
          {monthlyStatsText.details}
        </Typography>
        {stats.payments.length === 0 ? (
          <Typography variant="body1">{monthlyStatsText.empty}</Typography>
        ) : (
          <InfoCard>
            <Stack divider={<Divider flexItem />} spacing={2}>
              {stats.payments.map((payment) => (
                <Stack key={payment.id} spacing={0.5}>
                  <Stack
                    direction="row"
                    sx={{ justifyContent: "space-between", gap: 1 }}
                  >
                    <Typography variant="body2" color="textSecondary">
                      {payment.paidAtText}
                    </Typography>
                    <Typography variant="body1" sx={{ whiteSpace: "nowrap" }}>
                      {formatCents(payment.amountCents)}
                    </Typography>
                  </Stack>
                  <Typography variant="body1">
                    {payment.slotName} · {payment.customer}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {paymentMethodLabels[payment.method]}
                  </Typography>
                </Stack>
              ))}
            </Stack>
          </InfoCard>
        )}
      </Stack>
    </Stack>
  );
}
