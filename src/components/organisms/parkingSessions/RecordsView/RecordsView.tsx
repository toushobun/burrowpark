"use client";

import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";

import { paymentMethodLabels } from "config/checkInText";
import { recordsText as text } from "config/recordsText";
import { billingTypeLabels } from "config/slotDetailText";
import {
  formatBusinessDateTime,
  formatPlateForDisplay,
  normalizePlate,
} from "internal/parking";
import type { RecordResults, RecordsFilter } from "internal/parking";
import { FailureFeedbackDialog } from "molecules/feedback/FailureFeedbackDialog/FailureFeedbackDialog";
import { designTokens } from "theme/designTokens";
import type { ActionState } from "types/actions";

type Change =
  | { operation: "plate"; sessionId: string; before: string }
  | {
      operation: "payment";
      paymentId: string;
      amount: number;
      method: "wechat" | "alipay" | "cash";
    }
  | { operation: "delete"; paymentId: string; amount: number };

type Props = {
  filter: RecordsFilter;
  records: RecordResults;
  previousDate: string;
  nextDate: string | null;
  action: (state: ActionState, data: FormData) => Promise<ActionState>;
};
const touch = { minHeight: designTokens.size.touchTargetMin };
const money = (cents: number) => (cents / 100).toFixed(2);

export function RecordsView({
  filter,
  records,
  previousDate,
  nextDate,
  action,
}: Props) {
  const router = useRouter();
  const [searchPlate, setSearchPlate] = useState(
    filter.kind === "plate" ? filter.plate : "",
  );
  const [leaseSearchBy, setLeaseSearchBy] = useState<"tenant" | "slot">(
    filter.kind === "lease" ? filter.searchBy : "tenant",
  );
  const [leaseSearch, setLeaseSearch] = useState(
    filter.kind === "lease" ? filter.query : "",
  );
  const [change, setChange] = useState<Change | null>(null);
  const [newPlate, setNewPlate] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<"wechat" | "alipay" | "cash">("cash");
  const [state, submit, pending] = useActionState(
    async (previous: ActionState, data: FormData) => {
      const result = await action(previous, data);
      if (result.success) {
        setChange(null);
        router.refresh();
      }
      return result;
    },
    {} as ActionState,
  );

  function paymentRow(
    payment: RecordResults["sessions"][number]["session_payments"][number],
    key: string,
  ) {
    return (
      <Stack key={key} spacing={0.5} sx={{ py: 1 }}>
        <Typography variant="body1">
          {formatBusinessDateTime(payment.paid_at)} ·{" "}
          {text.purpose[payment.purpose]} · {money(payment.amount_cents)} 元 ·{" "}
          {paymentMethodLabels[payment.method]}
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button
            variant="text"
            sx={touch}
            onClick={() => {
              setChange({
                operation: "payment",
                paymentId: payment.id,
                amount: payment.amount_cents,
                method: payment.method,
              });
              setAmount(money(payment.amount_cents));
              setMethod(payment.method);
            }}
          >
            {text.correctAmount}
          </Button>
          {payment.paid_until === null && (
            <Button
              variant="text"
              color="error"
              sx={touch}
              onClick={() =>
                setChange({
                  operation: "delete",
                  paymentId: payment.id,
                  amount: payment.amount_cents,
                })
              }
            >
              {text.delete}
            </Button>
          )}
        </Stack>
      </Stack>
    );
  }

  const confirmation =
    change?.operation === "plate"
      ? text.newPlate(
          formatPlateForDisplay(change.before),
          formatPlateForDisplay(normalizePlate(newPlate)),
        )
      : change?.operation === "payment"
        ? text.newAmount(
            money(change.amount),
            amount,
            paymentMethodLabels[change.method],
            paymentMethodLabels[method],
          )
        : change?.operation === "delete"
          ? text.deletePayment(money(change.amount))
          : "";

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1}>
        <Button
          component={Link}
          href="/records"
          size="large"
          variant={filter.kind === "date" ? "contained" : "outlined"}
          sx={{ ...touch, flex: 1 }}
        >
          {text.byDate}
        </Button>
        <Button
          component={Link}
          href="/records?mode=plate"
          size="large"
          variant={filter.kind === "plate" ? "contained" : "outlined"}
          sx={{ ...touch, flex: 1 }}
        >
          {text.byPlate}
        </Button>
        <Button
          component={Link}
          href="/records?mode=lease"
          size="large"
          variant={filter.kind === "lease" ? "contained" : "outlined"}
          sx={{ ...touch, flex: 1 }}
        >
          {text.byLease}
        </Button>
      </Stack>
      {filter.kind === "date" ? (
        <Stack spacing={1}>
          <Typography variant="h3">{filter.date}</Typography>
          <Stack direction="row" spacing={1}>
            <Button
              component={Link}
              href={`/records?date=${previousDate}`}
              size="large"
              variant="outlined"
              sx={{ ...touch, flex: 1 }}
            >
              {text.previous}
            </Button>
            {nextDate && (
              <Button
                component={Link}
                href={`/records?date=${nextDate}`}
                size="large"
                variant="outlined"
                sx={{ ...touch, flex: 1 }}
              >
                {text.next}
              </Button>
            )}
          </Stack>
        </Stack>
      ) : filter.kind === "plate" ? (
        <Stack
          component="form"
          spacing={1}
          onSubmit={(event) => {
            event.preventDefault();
            const plate = normalizePlate(searchPlate);
            router.push(`/records?plate=${encodeURIComponent(plate)}`);
          }}
        >
          <TextField
            label={text.plate}
            value={searchPlate}
            onChange={(event) =>
              setSearchPlate(normalizePlate(event.target.value))
            }
            slotProps={{ htmlInput: { style: { fontSize: 24 } } }}
            fullWidth
          />
          <Button type="submit" size="large" variant="contained" sx={touch}>
            {text.search}
          </Button>
        </Stack>
      ) : (
        <Stack
          component="form"
          spacing={1}
          onSubmit={(event) => {
            event.preventDefault();
            router.push(
              "/records?mode=lease&leaseBy=" +
                leaseSearchBy +
                "&leaseQuery=" +
                encodeURIComponent(leaseSearch.trim()),
            );
          }}
        >
          <TextField
            select
            fullWidth
            label={text.leaseSearchBy}
            value={leaseSearchBy}
            onChange={(event) =>
              setLeaseSearchBy(event.target.value as "tenant" | "slot")
            }
          >
            <MenuItem value="tenant">{text.byTenant}</MenuItem>
            <MenuItem value="slot">{text.bySlot}</MenuItem>
          </TextField>
          <TextField
            fullWidth
            label={leaseSearchBy === "tenant" ? text.byTenant : text.bySlot}
            value={leaseSearch}
            onChange={(event) => setLeaseSearch(event.target.value)}
          />
          <Button type="submit" size="large" variant="contained" sx={touch}>
            {text.search}
          </Button>
        </Stack>
      )}
      <Stack spacing={1}>
        {filter.kind === "lease" ? null : records.sessions.length === 0 ? (
          <Typography>{text.noSessions}</Typography>
        ) : (
          records.sessions.map((session) => (
            <Card key={session.id}>
              <CardContent>
                <Stack spacing={1}>
                  <Typography variant="h3">
                    {session.slotName} · {formatPlateForDisplay(session.plate)}
                  </Typography>
                  <Typography>
                    {billingTypeLabels[session.billing_type]}
                  </Typography>
                  <Typography>
                    {text.enteredAt}
                    {formatBusinessDateTime(session.entered_at)}
                  </Typography>
                  <Typography>
                    {text.leftAt}
                    {session.left_at
                      ? formatBusinessDateTime(session.left_at)
                      : text.present}
                  </Typography>
                  <Button
                    variant="text"
                    sx={{ ...touch, alignSelf: "flex-start" }}
                    onClick={() => {
                      setNewPlate(session.plate);
                      setChange({
                        operation: "plate",
                        sessionId: session.id,
                        before: session.plate,
                      });
                    }}
                  >
                    {text.correctPlate}
                  </Button>
                  {session.session_payments.map((payment) =>
                    paymentRow(payment, payment.id),
                  )}
                </Stack>
              </CardContent>
            </Card>
          ))
        )}
      </Stack>
      <Typography variant="h3">{text.leasePayments}</Typography>
      {records.leasePayments.length === 0 ? (
        <Typography>{text.noLeasePayments}</Typography>
      ) : (
        records.leasePayments.map((payment) => (
          <Card key={payment.id}>
            <CardContent>
              <Typography variant="h3">
                {payment.slotName} · {payment.tenantName}
              </Typography>
              {paymentRow(payment, payment.id)}
            </CardContent>
          </Card>
        ))
      )}
      <Dialog open={change !== null} onClose={() => setChange(null)} fullWidth>
        <DialogTitle>{confirmation}</DialogTitle>
        <form action={submit}>
          <DialogContent>
            <input
              type="hidden"
              name="operation"
              value={change?.operation ?? ""}
            />
            {change?.operation === "plate" && (
              <>
                <input
                  type="hidden"
                  name="sessionId"
                  value={change.sessionId}
                />
                <TextField
                  label={text.plate}
                  name="plate"
                  fullWidth
                  value={newPlate}
                  onChange={(event) =>
                    setNewPlate(normalizePlate(event.target.value))
                  }
                />
              </>
            )}
            {change?.operation === "payment" && (
              <>
                <input
                  type="hidden"
                  name="paymentId"
                  value={change.paymentId}
                />
                <Stack spacing={2}>
                  <TextField
                    label={text.amount}
                    name="amountYuan"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    fullWidth
                  />
                  <TextField
                    select
                    label={text.method}
                    name="method"
                    value={method}
                    onChange={(event) =>
                      setMethod(event.target.value as typeof method)
                    }
                    fullWidth
                  >
                    {Object.entries(paymentMethodLabels).map(
                      ([value, label]) => (
                        <MenuItem key={value} value={value}>
                          {label}
                        </MenuItem>
                      ),
                    )}
                  </TextField>
                </Stack>
              </>
            )}
            {change?.operation === "delete" && (
              <input type="hidden" name="paymentId" value={change.paymentId} />
            )}
          </DialogContent>
          <DialogActions>
            <Button
              sx={touch}
              disabled={pending}
              onClick={() => setChange(null)}
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
