"use client";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";

import { pricingSettingsText as text } from "config/pricingSettingsText";
import type { ParkingPricingSettings } from "internal/parking";
import { FailureFeedbackDialog } from "molecules/feedback/FailureFeedbackDialog/FailureFeedbackDialog";
import { designTokens } from "theme/designTokens";
import type { ActionState } from "types/actions";

type Props = {
  initial: ParkingPricingSettings;
  action: (previous: ActionState, data: FormData) => Promise<ActionState>;
};

const touch = { minHeight: designTokens.size.touchTargetMin };
const hours = Array.from({ length: 24 }, (_, hour) => hour);
const yuan = (cents: number) => (cents / 100).toFixed(2);

export function PricingSettingsForm({ initial, action }: Props) {
  const router = useRouter();
  const [hotelDailyYuan, setHotelDailyYuan] = useState(
    yuan(initial.hotel_daily_price_cents),
  );
  const [hotelCheckoutHour, setHotelCheckoutHour] = useState(
    initial.hotel_checkout_hour,
  );
  const [hotelPreviousDayBeforeHour, setHotelPreviousDayBeforeHour] = useState(
    initial.hotel_previous_day_before_hour,
  );
  const [hourlyYuan, setHourlyYuan] = useState(
    yuan(initial.hourly_price_cents),
  );
  const [confirming, setConfirming] = useState(false);
  const [state, submit, pending] = useActionState(
    async (previous: ActionState, data: FormData) => {
      const result = await action(previous, data);
      if (result.success) {
        setConfirming(false);
        router.refresh();
      }
      return result;
    },
    {} as ActionState,
  );

  return (
    <Stack spacing={3}>
      {state.success && <Alert severity="success">{text.saved}</Alert>}
      <TextField
        label={text.hotelDaily}
        value={hotelDailyYuan}
        onChange={(event) => setHotelDailyYuan(event.target.value)}
        fullWidth
        slotProps={{ htmlInput: { inputMode: "decimal" } }}
      />
      <TextField
        select
        label={text.hotelCheckoutHour}
        value={hotelCheckoutHour}
        onChange={(event) => setHotelCheckoutHour(Number(event.target.value))}
        fullWidth
      >
        {hours.map((hour) => (
          <MenuItem key={hour} value={hour}>
            {hour} 点
          </MenuItem>
        ))}
      </TextField>
      <Stack spacing={1}>
        <TextField
          select
          label={text.hotelPreviousDayBeforeHour}
          value={hotelPreviousDayBeforeHour}
          onChange={(event) =>
            setHotelPreviousDayBeforeHour(Number(event.target.value))
          }
          fullWidth
        >
          {hours.map((hour) => (
            <MenuItem key={hour} value={hour}>
              {hour} 点
            </MenuItem>
          ))}
        </TextField>
        <Typography variant="body1" color="textSecondary">
          {text.checkoutExplanation(
            hotelPreviousDayBeforeHour,
            hotelCheckoutHour,
          )}
        </Typography>
      </Stack>
      <TextField
        label={text.hourly}
        value={hourlyYuan}
        onChange={(event) => setHourlyYuan(event.target.value)}
        fullWidth
        slotProps={{ htmlInput: { inputMode: "decimal" } }}
      />
      <Button
        size="large"
        variant="contained"
        sx={touch}
        onClick={() => setConfirming(true)}
      >
        {text.save}
      </Button>
      <Dialog open={confirming} fullWidth onClose={() => setConfirming(false)}>
        <DialogTitle>{text.confirmMessage}</DialogTitle>
        <form action={submit}>
          <DialogContent>
            <input type="hidden" name="hotelDailyYuan" value={hotelDailyYuan} />
            <input
              type="hidden"
              name="hotelCheckoutHour"
              value={hotelCheckoutHour}
            />
            <input
              type="hidden"
              name="hotelPreviousDayBeforeHour"
              value={hotelPreviousDayBeforeHour}
            />
            <input type="hidden" name="hourlyYuan" value={hourlyYuan} />
          </DialogContent>
          <DialogActions>
            <Button
              sx={touch}
              disabled={pending}
              onClick={() => setConfirming(false)}
            >
              {text.cancel}
            </Button>
            <Button
              sx={touch}
              disabled={pending}
              type="submit"
              variant="contained"
            >
              {text.confirm}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
      <FailureFeedbackDialog state={state} />
    </Stack>
  );
}
