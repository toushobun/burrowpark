"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { useActionState, useState } from "react";

import { renewText, parkingOperationText } from "config/renewAndCheckOutText";
import type { RenewFormData } from "internal/parking";
import {
  extendHotelPaidUntil,
  formatBusinessDate,
  formatBusinessDateTime,
  leaseDateToPaidUntil,
} from "internal/parking";
import type { RenewActionState } from "internal/parking/adapter/next/renewActions";
import { FailureFeedbackDialog } from "molecules/feedback/FailureFeedbackDialog/FailureFeedbackDialog";
import { designTokens } from "theme/designTokens";
import type { ActionState } from "types/actions";
import {
  ParkingOperationResult,
  PaymentAmountField,
  PaymentMethodChoices,
  validYuanAmount,
  type PaymentMethod,
} from "../PaymentOperationParts";

type Props = {
  form: RenewFormData | null;
  action: (
    state: RenewActionState,
    data: FormData,
  ) => Promise<RenewActionState>;
  undoAction: (state: ActionState, data: FormData) => Promise<ActionState>;
  initialState?: RenewActionState;
};
const buttonSx = { minHeight: designTokens.size.touchTargetMin };

export function RenewForm({ form, action, undoAction, initialState }: Props) {
  const [state, submit, isPending] = useActionState(action, initialState ?? {});
  const [undoState, undo, isUndoPending] = useActionState(undoAction, {});
  const [days, setDays] = useState(1);
  const [custom, setCustom] = useState(false);
  const [endDate, setEndDate] = useState(form?.defaultEndDate ?? "");
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [amount, setAmount] = useState(
    form?.mode === "hotel_daily"
      ? (form.hotelDailyPriceCents / 100).toFixed(2)
      : "",
  );

  if (!form) {
    return (
      <Stack spacing={3}>
        <Typography variant="h2">{renewText.missing}</Typography>
        <Button
          component={Link}
          href="/"
          size="large"
          fullWidth
          variant="contained"
          sx={buttonSx}
        >
          {parkingOperationText.backMap}
        </Button>
      </Stack>
    );
  }

  const hotel = form.mode === "hotel_daily";
  const validDays = Number.isInteger(days) && days >= 1 && days <= 30;
  let leasePaidUntil: string | null = null;
  if (!hotel) {
    try {
      leasePaidUntil = leaseDateToPaidUntil(endDate);
    } catch {
      // 日期输入不完整或非法时只禁用提交，不让页面渲染报错。
    }
  }
  const validDate =
    leasePaidUntil !== null &&
    Date.parse(leasePaidUntil) > Date.parse(form.paidUntil);
  const paidUntil = hotel
    ? validDays
      ? extendHotelPaidUntil(form.paidUntil, days)
      : null
    : validDate
      ? leasePaidUntil
      : null;
  const canSubmit =
    !isPending &&
    method !== null &&
    validYuanAmount(amount) &&
    (hotel ? validDays : validDate);

  const chooseDays = (value: number, isCustom: boolean) => {
    setDays(value);
    setCustom(isCustom);
    setAmount(((value * form.hotelDailyPriceCents) / 100).toFixed(2));
  };

  return (
    <>
      {undoState.success ? (
        <Stack spacing={3}>
          <Typography variant="h2">
            {hotel ? renewText.undone : renewText.undoneLease}
          </Typography>
          <Button
            component={Link}
            href="/"
            fullWidth
            size="large"
            variant="contained"
            sx={buttonSx}
          >
            {parkingOperationText.backMap}
          </Button>
        </Stack>
      ) : state.result ? (
        <ParkingOperationResult
          code={form.code}
          title={
            (hotel ? renewText.success : renewText.successLease) +
            "，交到 " +
            (hotel
              ? formatBusinessDateTime(state.result.paidUntil)
              : formatBusinessDate(state.result.paidUntil))
          }
          id={state.result.paymentId}
          idName="paymentId"
          undo={undo}
          undoState={undoState}
          isUndoPending={isUndoPending}
        />
      ) : (
        <Stack spacing={3}>
          <Typography component="h2" variant="h2">
            {form.name}
          </Typography>
          <Typography variant="body1">
            当前交到：
            {hotel
              ? formatBusinessDateTime(form.paidUntil)
              : formatBusinessDate(form.paidUntil)}
          </Typography>
          <form action={submit}>
            <Stack spacing={3}>
              {hotel ? (
                <>
                  <Typography variant="h3">{renewText.days}</Typography>
                  <Box
                    sx={{
                      display: "grid",
                      gap: 2,
                      gridTemplateColumns: "repeat(2,minmax(0,1fr))",
                    }}
                  >
                    {([1, 2, 3] as const).map((value) => (
                      <Button
                        key={value}
                        size="large"
                        type="button"
                        aria-pressed={!custom && days === value}
                        variant={
                          !custom && days === value ? "contained" : "outlined"
                        }
                        sx={buttonSx}
                        onClick={() => chooseDays(value, false)}
                      >
                        {value} 天
                      </Button>
                    ))}
                    <Button
                      size="large"
                      type="button"
                      aria-pressed={custom}
                      variant={custom ? "contained" : "outlined"}
                      sx={buttonSx}
                      onClick={() => chooseDays(days, true)}
                    >
                      {renewText.custom}
                    </Button>
                  </Box>
                  {custom && (
                    <TextField
                      type="number"
                      fullWidth
                      label={renewText.days}
                      value={days}
                      slotProps={{
                        htmlInput: { min: 1, max: 30, inputMode: "numeric" },
                      }}
                      onChange={(event) =>
                        chooseDays(Number(event.target.value), true)
                      }
                    />
                  )}
                  <Typography variant="body1">
                    {renewText.suggested}：
                    {((days * form.hotelDailyPriceCents) / 100).toFixed(2)} 元
                  </Typography>
                  <input type="hidden" name="days" value={days} />
                </>
              ) : (
                <TextField
                  label={renewText.endDate}
                  type="date"
                  fullWidth
                  value={endDate}
                  slotProps={{ inputLabel: { shrink: true } }}
                  onChange={(event) => setEndDate(event.target.value)}
                  name="endDate"
                  error={Boolean(endDate) && !validDate}
                  helperText={
                    Boolean(endDate) && !validDate
                      ? renewText.invalidDate
                      : undefined
                  }
                />
              )}
              {paidUntil && (
                <Typography variant="h3">
                  {renewText.paidUntil}：
                  {hotel
                    ? formatBusinessDateTime(paidUntil)
                    : formatBusinessDate(paidUntil)}
                </Typography>
              )}
              <Typography variant="h3">{renewText.method}</Typography>
              <PaymentMethodChoices
                value={method}
                onChange={setMethod}
                disabled={isPending}
              />
              <PaymentAmountField
                value={amount}
                onChange={setAmount}
                disabled={isPending}
                label={renewText.amount}
              />
              <input type="hidden" name="slotCode" value={form.code} />
              <input type="hidden" name="mode" value={form.mode} />
              <input type="hidden" name="paymentMethod" value={method ?? ""} />
              <input type="hidden" name="amountYuan" value={amount} />
              <Button
                fullWidth
                size="large"
                variant="contained"
                type="submit"
                disabled={!canSubmit}
                sx={{ minHeight: designTokens.size.primaryActionHeight }}
              >
                {isPending && (
                  <CircularProgress size={24} color="inherit" sx={{ mr: 1 }} />
                )}
                {isPending
                  ? renewText.submitting
                  : hotel
                    ? renewText.submit
                    : renewText.submitLease}
              </Button>
            </Stack>
          </form>
          <Button
            component={Link}
            href="/"
            fullWidth
            size="large"
            variant="outlined"
            sx={buttonSx}
          >
            {parkingOperationText.backMap}
          </Button>
        </Stack>
      )}
      <FailureFeedbackDialog state={undoState.error ? undoState : state} />
    </>
  );
}
