"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import { paymentMethodLabels } from "config/checkInText";
import { designTokens } from "theme/designTokens";

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
    <Box
      sx={{
        display: "grid",
        gap: 2,
        gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
      }}
    >
      {(Object.keys(paymentMethodLabels) as PaymentMethod[]).map((method) => (
        <Button
          key={method}
          aria-pressed={method === value}
          disabled={disabled}
          onClick={() => onChange(method)}
          size="large"
          sx={{ minHeight: designTokens.size.touchTargetMin }}
          type="button"
          variant={method === value ? "contained" : "outlined"}
        >
          {paymentMethodLabels[method]}
        </Button>
      ))}
    </Box>
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
