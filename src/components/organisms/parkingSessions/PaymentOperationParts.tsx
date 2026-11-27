"use client";

import TextField from "@mui/material/TextField";
import { paymentMethodLabels } from "config/checkInText";
import { ChoiceButtonGroup } from "molecules/forms/ChoiceButtonGroup/ChoiceButtonGroup";

export type PaymentMethod = keyof typeof paymentMethodLabels;
export const validYuanAmount = (value: string): boolean =>
  /^(?:0|[1-9]\d{0,7})(?:\.\d{1,2})?$/.test(value) &&
  Number(value) > 0 &&
  Number(value) <= 21474836.47;

export function PaymentMethodChoices({
  value,
  onChange,
  disabled,
}: {
  value: PaymentMethod | null;
  onChange: (value: PaymentMethod) => void;
  disabled: boolean;
}) {
  return (
    <ChoiceButtonGroup
      options={(Object.keys(paymentMethodLabels) as PaymentMethod[]).map(
        (method) => ({ value: method, label: paymentMethodLabels[method] }),
      )}
      value={value}
      onChange={onChange}
      disabled={disabled}
    />
  );
}

export function PaymentAmountField({
  value,
  onChange,
  disabled,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  label: string;
}) {
  return (
    <TextField
      fullWidth
      disabled={disabled}
      label={label}
      type="text"
      slotProps={{ htmlInput: { inputMode: "decimal" } }}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}
