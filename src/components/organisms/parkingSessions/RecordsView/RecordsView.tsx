"use client";

import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Divider from "@mui/material/Divider";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";

import { paymentMethodLabels } from "config/checkInText";
import { commonText } from "config/commonText";
import { recordsText as text } from "config/recordsText";
import { billingTypeLabels } from "config/slotDetailText";
import {
  formatBusinessDateTime,
  formatPlateForDisplay,
  normalizePlate,
} from "internal/parking";
import type { RecordResults, RecordsFilter } from "internal/parking";
import { InfoCard } from "molecules/display/InfoCard/InfoCard";
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
const compactButton = {
  ...touch,
  minWidth: 0,
  px: 1,
  fontSize: designTokens.typography.bodySize,
};
const equalWidthButton = { ...compactButton, flex: 1 };
const inlineButton = { ...compactButton, flex: "0 0 auto" };
const dateButton = {
  ...inlineButton,
  fontSize: designTokens.typography.minSize,
};
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

  type Payment = RecordResults["sessions"][number]["session_payments"][number];

  function paymentActions(payment: Payment, equalWidth = false) {
    const buttonSx = equalWidth ? equalWidthButton : inlineButton;
    return (
      <>
        <Button
          variant="text"
          sx={buttonSx}
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
            sx={buttonSx}
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
      </>
    );
  }

  function paymentRow(payment: Payment, showActions = true) {
    return (
      <Stack key={payment.id} spacing={0.5} sx={{ py: 1 }}>
        <Typography variant="body1">
          {formatBusinessDateTime(payment.paid_at)} ·{" "}
          {text.purpose[payment.purpose]} · {money(payment.amount_cents)} 元 ·{" "}
          {paymentMethodLabels[payment.method]}
        </Typography>
        {showActions && (
          <Stack direction="row" spacing={1}>
            {paymentActions(payment)}
          </Stack>
        )}
      </Stack>
    );
  }

  const confirmation =
    change?.operation === "plate"
      ? text.newPlate(
          formatPlateForDisplay(change.before) || commonText.noPlate,
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
          variant={filter.kind === "date" ? "contained" : "outlined"}
          sx={equalWidthButton}
        >
          {text.byDate}
        </Button>
        <Button
          component={Link}
          href="/records?mode=plate"
          variant={filter.kind === "plate" ? "contained" : "outlined"}
          sx={equalWidthButton}
        >
          {text.byPlate}
        </Button>
        <Button
          component={Link}
          href="/records?mode=lease"
          variant={filter.kind === "lease" ? "contained" : "outlined"}
          sx={equalWidthButton}
        >
          {text.byLease}
        </Button>
      </Stack>
      {filter.kind === "date" ? (
        <Stack
          direction="row"
          spacing={1}
          sx={{ alignItems: "center", justifyContent: "space-between" }}
        >
          <Typography variant="h6" sx={{ whiteSpace: "nowrap" }}>
            {filter.date}
          </Typography>
          <Stack direction="row" spacing={1}>
            <Button
              component={Link}
              href={`/records?date=${previousDate}`}
              variant="outlined"
              sx={dateButton}
            >
              {text.previous}
            </Button>
            {nextDate && (
              <Button
                component={Link}
                href={`/records?date=${nextDate}`}
                variant="outlined"
                sx={dateButton}
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
          records.sessions.map((session) => {
            const singlePayment =
              session.session_payments.length === 1
                ? session.session_payments[0]
                : undefined;
            return (
              <InfoCard key={session.id}>
                <Stack spacing={1}>
                  <Typography variant="h6">
                    {session.slotName} ·{" "}
                    {formatPlateForDisplay(session.plate) || commonText.noPlate}
                  </Typography>
                  {session.phone && (
                    <Typography variant="body1">
                      {commonText.phone}：{session.phone}
                    </Typography>
                  )}
                  <Typography variant="body1">
                    {billingTypeLabels[session.billing_type]}
                  </Typography>
                  <Typography variant="body1">
                    {text.enteredAt}
                    {formatBusinessDateTime(session.entered_at)}
                  </Typography>
                  <Typography variant="body1">
                    {text.leftAt}
                    {session.left_at
                      ? formatBusinessDateTime(session.left_at)
                      : text.present}
                  </Typography>
                  {session.session_payments.map((payment) =>
                    paymentRow(payment, !singlePayment),
                  )}
                  <Divider />
                  <Stack direction="row" spacing={1}>
                    <Button
                      variant="text"
                      sx={equalWidthButton}
                      onClick={() => {
                        setNewPlate(session.plate ?? "");
                        setChange({
                          operation: "plate",
                          sessionId: session.id,
                          before: session.plate ?? "",
                        });
                      }}
                    >
                      {text.correctPlate}
                    </Button>
                    {singlePayment && paymentActions(singlePayment, true)}
                  </Stack>
                </Stack>
              </InfoCard>
            );
          })
        )}
      </Stack>
      {(filter.kind === "lease" || records.leasePayments.length > 0) && (
        <>
          <Typography variant="h6" component="h2">
            {text.leasePayments}
          </Typography>
          {records.leasePayments.length === 0 ? (
            <Typography>{text.noLeasePayments}</Typography>
          ) : (
            records.leasePayments.map((payment) => (
              <InfoCard key={payment.id}>
                <Typography variant="h6">
                  {payment.slotName} · {payment.tenantName}
                </Typography>
                {paymentRow(payment)}
              </InfoCard>
            ))
          )}
        </>
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
