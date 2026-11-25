"use client";

import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";

import { commonText } from "config/commonText";
import { checkOutText } from "config/renewAndCheckOutText";
import type { CheckOutFormData } from "internal/parking";
import {
  formatElapsed,
  formatPlateForDisplay,
  formatVehicleIdentity,
} from "internal/parking";
import type { CheckOutActionState } from "internal/parking/adapter/next/checkOutActions";
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

type Props = {
  form: CheckOutFormData | null;
  action: (
    state: CheckOutActionState,
    data: FormData,
  ) => Promise<CheckOutActionState>;
  initialState?: CheckOutActionState;
};
const buttonSx = { minHeight: designTokens.size.touchTargetMin };

export function CheckOutForm({
  form: currentForm,
  action,
  initialState,
}: Props) {
  const router = useRouter();
  const { showNotice } = useOperationFeedback();
  const redirected = useRef<string | null>(null);
  const [state, submit, isPending] = useActionState(action, initialState ?? {});
  useSlotOperationPending(isPending);
  const [initialForm] = useState(currentForm);
  // 离场成功后车位已清空，跳转前仍保留提交时的车牌和车位。
  const form = currentForm ?? (state.result ? initialForm : null);
  const [method, setMethod] = useState<PaymentMethod>("wechat");
  const [amount, setAmount] = useState(
    form?.suggestedAmountCents
      ? (form.suggestedAmountCents / 100).toFixed(2)
      : "",
  );

  const sessionId = state.result?.sessionId;
  useEffect(() => {
    if (!sessionId || !form || redirected.current === sessionId) return;
    redirected.current = sessionId;
    showNotice({
      kind: "checkout",
      code: form.code,
      id: sessionId,
      message:
        checkOutText.success +
        "：" +
        formatVehicleIdentity(form.plate, form.phone),
    });
    router.replace("/");
  }, [form, router, sessionId, showNotice]);

  if (state.result) {
    return <OperationRedirecting />;
  }

  if (!form) {
    return (
      <Stack spacing={3}>
        <Typography variant="h2">{checkOutText.missing}</Typography>
      </Stack>
    );
  }

  return (
    <>
      <Stack spacing={3}>
        <Typography variant="h2" component="h2">
          {form.name}
        </Typography>
        <Typography variant="h3">
          {checkOutText.plate}：
          {formatPlateForDisplay(form.plate) || commonText.noPlate}
        </Typography>
        {form.phone && (
          <Typography variant="body1">
            {commonText.phone}：{form.phone}
          </Typography>
        )}
        <Typography variant="body1">
          {formatElapsed(form.enteredAt, form.now)}
        </Typography>
        {form.totalPaidCents !== null && (
          <Typography variant="body1">
            {checkOutText.paidTotal}：{(form.totalPaidCents / 100).toFixed(2)}{" "}
            元
          </Typography>
        )}
        {form.overstayHours > 0 && (
          <Typography variant="h3" color="error">
            {checkOutText.overstay(form.overstayHours)}
          </Typography>
        )}
        <Typography variant="h3">
          {checkOutText.suggested}：
          {(form.suggestedAmountCents / 100).toFixed(2)} 元
        </Typography>
        <form action={submit}>
          <Stack spacing={3}>
            <Typography variant="h3">{checkOutText.method}</Typography>
            <PaymentMethodChoices
              disabled={isPending}
              value={method}
              onChange={setMethod}
            />
            <PaymentAmountField
              disabled={isPending}
              value={amount}
              onChange={setAmount}
              label={checkOutText.amount}
            />
            <input type="hidden" name="sessionId" value={form.sessionId} />
            <input type="hidden" name="paymentMethod" value={method ?? ""} />
            <input type="hidden" name="amountYuan" value={amount} />
            <Button
              fullWidth
              size="large"
              variant="contained"
              type="submit"
              disabled={
                isPending || method === null || !validYuanAmount(amount)
              }
              sx={{ minHeight: designTokens.size.primaryActionHeight }}
            >
              {isPending && (
                <CircularProgress size={24} color="inherit" sx={{ mr: 1 }} />
              )}
              {isPending ? checkOutText.submitting : checkOutText.payAndLeave}
            </Button>
          </Stack>
        </form>
        <form action={submit}>
          <input type="hidden" name="sessionId" value={form.sessionId} />
          <Button
            fullWidth
            size="large"
            variant="outlined"
            type="submit"
            disabled={isPending}
            sx={{ minHeight: designTokens.size.primaryActionHeight }}
          >
            {isPending && (
              <CircularProgress size={24} color="inherit" sx={{ mr: 1 }} />
            )}
            {isPending ? checkOutText.submitting : checkOutText.noPayLeave}
          </Button>
        </form>
      </Stack>
      <FailureFeedbackDialog state={state} />
    </>
  );
}
