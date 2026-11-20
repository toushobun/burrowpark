"use client";

import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { useActionState, useState } from "react";

import { leaseText } from "config/leaseText";
import { parkingOperationText } from "config/renewAndCheckOutText";
import type { SlotDetail } from "internal/parking";
import { defaultLeasePaidThrough, leaseDateToPaidUntil } from "internal/parking";
import type { SlotActionState } from "internal/parking/adapter/next/slotOperationsActions";
import { FailureFeedbackDialog } from "molecules/feedback/FailureFeedbackDialog/FailureFeedbackDialog";
import {
  ParkingOperationResult,
  PaymentAmountField,
  PaymentMethodChoices,
  validYuanAmount,
  type PaymentMethod,
} from "organisms/parkingSessions/PaymentOperationParts";
import { designTokens } from "theme/designTokens";

type FormAction = (state: SlotActionState, data: FormData) => Promise<SlotActionState>;

type Props = {
  mode: "create" | "edit";
  detail: SlotDetail | null;
  today: string;
  action: FormAction;
  undoAction: FormAction;
};

const buttonSx = { minHeight: designTokens.size.touchTargetMin };

export function LeaseForm({ mode, detail, today, action, undoAction }: Props) {
  const [state, submit, isPending] = useActionState(action, {} as SlotActionState);
  const [undoState, undo, undoPending] = useActionState(undoAction, {} as SlotActionState);
  const [tenantName, setTenantName] = useState(detail?.lease?.tenantName ?? "");
  const [phone, setPhone] = useState(detail?.lease?.phone ?? "");
  const [plate, setPlate] = useState(detail?.lease?.plate ?? "");
  const [note, setNote] = useState(detail?.lease?.note ?? "");
  const [startsOn, setStartsOn] = useState(today);
  const [paidThrough, setPaidThrough] = useState(defaultLeasePaidThrough(today));
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod | null>(null);

  const creating = mode === "create";
  const canAccess = detail?.isActive && detail.kind === "regular" &&
    (creating ? !detail.presentVehicle && !detail.reservation && !detail.lease : !!detail.lease?.id);
  if (!canAccess || !detail) {
    return (
      <Stack spacing={2}>
        <Typography component="h2" variant="h2">{leaseText.missing}</Typography>
        <Button component={Link} href="/" variant="contained" size="large" fullWidth sx={buttonSx}>
          {parkingOperationText.backMap}
        </Button>
      </Stack>
    );
  }

  if (state.success) {
    return (
      <>
        {creating && state.result ? (
          <ParkingOperationResult
            code={detail.code}
            title={leaseText.createSuccess}
            id={state.result.id}
            idName="leaseId"
            undo={undo}
            undoState={undoState}
            isUndoPending={undoPending}
          />
        ) : (
          <Stack spacing={2}>
            <Paper variant="outlined" sx={{ p: 3 }}>
              <Typography variant="h2">{leaseText.editSuccess}</Typography>
            </Paper>
            <Button component={Link} href="/" variant="contained" size="large" fullWidth sx={buttonSx}>
              {parkingOperationText.backMap}
            </Button>
            <Button component={Link} href={`/slots/${detail.code}`} variant="outlined"
              size="large" fullWidth sx={buttonSx}>{parkingOperationText.viewSlot}</Button>
          </Stack>
        )}
        <FailureFeedbackDialog state={undoState} />
      </>
    );
  }

  let validDates = false;
  try {
    leaseDateToPaidUntil(startsOn);
    leaseDateToPaidUntil(paidThrough);
    validDates = paidThrough > startsOn;
  } catch {
    validDates = false;
  }
  const canSubmit = tenantName.trim().length > 0 && !isPending &&
    (!creating || (validDates && method !== null && validYuanAmount(amount)));

  return (
    <>
      <form action={submit}>
        <Stack spacing={3}>
          <Typography component="h2" variant="h2">{detail.name}</Typography>
          <TextField fullWidth required label={leaseText.name} value={tenantName}
            onChange={(event) => setTenantName(event.target.value)} name="tenantName" />
          <TextField fullWidth label={leaseText.phone} value={phone}
            onChange={(event) => setPhone(event.target.value)} name="phone"
            slotProps={{ htmlInput: { inputMode: "tel" } }} />
          <TextField fullWidth label={leaseText.plate} value={plate}
            onChange={(event) => setPlate(event.target.value.toUpperCase())} name="plate" />
          <TextField fullWidth label={leaseText.note} multiline minRows={2}
            value={note} onChange={(event) => setNote(event.target.value)} name="note" />
          {creating && (
            <>
              <TextField fullWidth type="date" label={leaseText.startsOn}
                value={startsOn} onChange={(event) => {
                  setStartsOn(event.target.value);
                  try {
                    setPaidThrough(defaultLeasePaidThrough(event.target.value));
                  } catch {
                    setPaidThrough("");
                  }
                }} name="startsOn"
                slotProps={{ inputLabel: { shrink: true } }} />
              <TextField fullWidth type="date" label={leaseText.paidThrough}
                value={paidThrough} onChange={(event) => setPaidThrough(event.target.value)}
                name="paidThrough" slotProps={{ inputLabel: { shrink: true } }} />
              <Typography component="h3" variant="h3">{leaseText.paymentMethod}</Typography>
              <PaymentMethodChoices value={method} onChange={setMethod} disabled={isPending} />
              <PaymentAmountField value={amount} onChange={setAmount}
                disabled={isPending} label={leaseText.amount} />
              <input type="hidden" name="paymentMethod" value={method ?? ""} />
              <input type="hidden" name="amountYuan" value={amount} />
            </>
          )}
          <input type="hidden" name="slotCode" value={detail.code} />
          {!creating && <input type="hidden" name="leaseId" value={detail.lease?.id ?? ""} />}
          <Button fullWidth type="submit" size="large" variant="contained" sx={buttonSx}
            disabled={!canSubmit}>{creating ? leaseText.create : leaseText.edit}</Button>
          <Button component={Link} href={`/slots/${detail.code}`} variant="outlined"
            size="large" fullWidth sx={buttonSx}>{parkingOperationText.viewSlot}</Button>
        </Stack>
      </form>
      <FailureFeedbackDialog state={state} />
    </>
  );
}
