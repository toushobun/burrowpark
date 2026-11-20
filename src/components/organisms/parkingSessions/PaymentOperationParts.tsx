"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { paymentMethodLabels } from "config/checkInText";
import { parkingOperationText } from "config/renewAndCheckOutText";
import { designTokens } from "theme/designTokens";
import type { ActionState } from "types/actions";

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

export function ParkingOperationResult({
  code,
  title,
  id,
  idName,
  undoState,
  undo,
  isUndoPending,
}: {
  code: string;
  title: string;
  id: string;
  idName: string;
  undoState: ActionState;
  undo: (data: FormData) => void;
  isUndoPending: boolean;
}) {
  return (
    <Stack spacing={3}>
      <Paper
        variant="outlined"
        sx={{ borderRadius: String(designTokens.radius.lg) + "px", p: 3 }}
      >
        <Typography variant="h2" component="h2">
          {title}
        </Typography>
      </Paper>
      <Button
        component={Link}
        fullWidth
        href="/"
        size="large"
        sx={{ minHeight: designTokens.size.touchTargetMin }}
        variant="contained"
      >
        {parkingOperationText.backMap}
      </Button>
      <Button
        component={Link}
        fullWidth
        href={`/slots/${code}`}
        size="large"
        sx={{ minHeight: designTokens.size.touchTargetMin }}
        variant="outlined"
      >
        {parkingOperationText.viewSlot}
      </Button>
      {!undoState.success && (
        <form action={undo}>
          <input type="hidden" name={idName} value={id} />
          <Button
            disabled={isUndoPending}
            fullWidth
            size="large"
            type="submit"
            sx={{ minHeight: designTokens.size.touchTargetMin }}
            variant="outlined"
          >
            {isUndoPending && (
              <CircularProgress color="inherit" size={24} sx={{ mr: 1 }} />
            )}
            {isUndoPending
              ? parkingOperationText.undoing
              : parkingOperationText.undo}
          </Button>
        </form>
      )}
    </Stack>
  );
}
