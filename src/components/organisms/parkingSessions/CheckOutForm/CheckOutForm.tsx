"use client";

import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { useActionState, useState } from "react";

import {
  checkOutText,
  parkingOperationText,
} from "config/renewAndCheckOutText";
import type { CheckOutFormData } from "internal/parking";
import { formatElapsed, formatPlateForDisplay } from "internal/parking";
import type { CheckOutActionState } from "internal/parking/adapter/next/checkOutActions";
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
  form: CheckOutFormData | null;
  action: (
    state: CheckOutActionState,
    data: FormData,
  ) => Promise<CheckOutActionState>;
  undoAction: (state: ActionState, data: FormData) => Promise<ActionState>;
  initialState?: CheckOutActionState;
};
const buttonSx = { minHeight: designTokens.size.touchTargetMin };

export function CheckOutForm({
  form: currentForm,
  action,
  undoAction,
  initialState,
}: Props) {
  const [state, submit, isPending] = useActionState(action, initialState ?? {});
  const [initialForm] = useState(currentForm);
  // 离场成功后车位已清空，后续 RSC 刷新不能盖掉原本的成功结果。
  const form = currentForm ?? (state.result ? initialForm : null);
  const [undoState, undo, isUndoPending] = useActionState(undoAction, {});
  const [method, setMethod] = useState<PaymentMethod>("wechat");
  const [amount, setAmount] = useState(
    form?.suggestedAmountCents
      ? (form.suggestedAmountCents / 100).toFixed(2)
      : "",
  );

  if (!form) {
    return (
      <Stack spacing={3}>
        <Typography variant="h2">{checkOutText.missing}</Typography>
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

  return (
    <>
      {undoState.success ? (
        <Stack spacing={3}>
          <Typography variant="h2">{checkOutText.undone}</Typography>
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
            checkOutText.success + "：" + formatPlateForDisplay(form.plate)
          }
          id={state.result.sessionId}
          idName="sessionId"
          undo={undo}
          undoState={undoState}
          isUndoPending={isUndoPending}
        />
      ) : (
        <Stack spacing={3}>
          <Typography variant="h2" component="h2">
            {form.name}
          </Typography>
          <Typography variant="h3">
            {checkOutText.plate}：{formatPlateForDisplay(form.plate)}
          </Typography>
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
