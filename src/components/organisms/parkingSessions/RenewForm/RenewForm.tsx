"use client";

import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";

import { checkInText } from "config/checkInText";
import { renewText } from "config/renewAndCheckOutText";
import type { RenewFormData } from "internal/parking";
import {
  extendHotelPaidUntil,
  formatBusinessDate,
  formatBusinessDateTime,
  leaseDateToPaidUntil,
} from "internal/parking";
import type { RenewActionState } from "internal/parking/adapter/next/renewActions";
import { NoticeBox } from "molecules/display/NoticeBox/NoticeBox";
import { ChoiceButtonGroup } from "molecules/forms/ChoiceButtonGroup/ChoiceButtonGroup";
import { FailureFeedbackDialog } from "molecules/feedback/FailureFeedbackDialog/FailureFeedbackDialog";
import { OperationRedirecting } from "molecules/feedback/OperationRedirecting/OperationRedirecting";
import { useOperationFeedback } from "providers/OperationFeedbackProvider";
import { useSlotOperationPending } from "organisms/slots/SlotOperationDialog/slotOperationDialogContext";
import { designTokens } from "theme/designTokens";
import {
  PaymentAmountField,
  PaymentMethodChoices,
  validYuanAmount,
  type PaymentMethod,
} from "../PaymentOperationParts";

const dayOptions = [1, 2, 3, 0].map((value) => ({
  value,
  label: value ? value + " " + checkInText.dayUnit : renewText.custom,
}));

type Props = {
  form: RenewFormData | null;
  action: (
    state: RenewActionState,
    data: FormData,
  ) => Promise<RenewActionState>;
  initialState?: RenewActionState;
};

export function RenewForm({ form: currentForm, action, initialState }: Props) {
  const router = useRouter();
  const { showNotice } = useOperationFeedback();
  const redirected = useRef<string | null>(null);
  const [state, submit, isPending] = useActionState(action, initialState ?? {});
  const complete = useSlotOperationPending(isPending)?.complete;
  const [initialForm] = useState(currentForm);
  // 续费完成后页面可能重读出不再可续费的状态，跳转前保留提交时的事实。
  const form = currentForm ?? (state.result ? initialForm : null);
  const [days, setDays] = useState(1);
  const [custom, setCustom] = useState(false);
  const [endDate, setEndDate] = useState(form?.defaultEndDate ?? "");
  const [method, setMethod] = useState<PaymentMethod>("wechat");
  const [amount, setAmount] = useState(
    form?.mode === "hotel_daily"
      ? (form.hotelDailyPriceCents / 100).toFixed(2)
      : "",
  );

  useEffect(() => {
    if (!form || !state.result) return;
    const { paymentId, paidUntil } = state.result;
    if (redirected.current === paymentId) return;
    redirected.current = paymentId;
    const hotel = form.mode === "hotel_daily";
    const title = hotel ? renewText.success : renewText.successLease;
    const formattedDate = hotel
      ? formatBusinessDateTime(paidUntil)
      : formatBusinessDate(paidUntil);
    showNotice({
      kind: "renew",
      code: form.code,
      id: paymentId,
      message: `${title}，交到 ${formattedDate}`,
    });
    complete?.();
    router.replace("/");
  }, [complete, form, router, showNotice, state.result]);

  if (!form) {
    return (
      <Stack spacing={3}>
        <Typography variant="h2">{renewText.missing}</Typography>
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
  const hotelPaidUntilLabel =
    hotel && paidUntil
      ? `${renewText.paidUntil}：${formatBusinessDateTime(paidUntil)}`
      : undefined;
  const suggestedAmount = ((days * form.hotelDailyPriceCents) / 100).toFixed(2);
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
      {state.result ? (
        <OperationRedirecting />
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
                  <Typography component="h3" variant="h6">
                    {renewText.days}
                  </Typography>
                  <ChoiceButtonGroup
                    options={dayOptions}
                    value={custom ? 0 : days}
                    onChange={(value) => chooseDays(value || days, !value)}
                    disabled={isPending}
                  />
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
                  <NoticeBox title={hotelPaidUntilLabel}>
                    {renewText.suggested}：{suggestedAmount} 元
                  </NoticeBox>
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
              {!hotel && paidUntil && (
                <Typography variant="h3">
                  {renewText.paidUntil}：
                  {formatBusinessDate(paidUntil)}
                </Typography>
              )}
              <Typography component="h3" variant="h6">
                {renewText.method}
              </Typography>
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
        </Stack>
      )}
      <FailureFeedbackDialog state={state} />
    </>
  );
}
