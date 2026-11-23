"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";

import { SlotStatusBadge } from "atoms/slots/SlotStatusBadge/SlotStatusBadge";
import { paymentMethodLabels } from "config/checkInText";
import { operationText } from "config/operationText";
import { billingTypeLabels, slotDetailText } from "config/slotDetailText";
import type { SlotDetail as SlotDetailData } from "internal/parking";
import {
  describeBorrowRemaining,
  formatBusinessDateTime,
  formatPlateForDisplay,
} from "internal/parking";
import type { SlotActionState } from "internal/parking/adapter/next/slotOperationsActions";
import { FailureFeedbackDialog } from "molecules/feedback/FailureFeedbackDialog/FailureFeedbackDialog";
import { ParkingOperationResult } from "organisms/parkingSessions/PaymentOperationParts";
import { designTokens } from "theme/designTokens";

export type SlotDetailDisplay = {
  enteredAt: string | null;
  paidUntil: string | null;
  elapsed: string | null;
  borrowUntil: string | null;
  leasePaidUntil: string | null;
};

export type SlotFormAction = (
  previous: SlotActionState,
  data: FormData,
) => Promise<SlotActionState>;

export type SlotDetailOperations = {
  reserve: SlotFormAction;
  cancelReservation: SlotFormAction;
  undoCancelReservation: SlotFormAction;
  extendBorrow: SlotFormAction;
  undoExtendBorrow: SlotFormAction;
  endLease: SlotFormAction;
  undoEndLease: SlotFormAction;
};

type SlotDetailProps = {
  detail: SlotDetailData | null;
  display: SlotDetailDisplay | null;
  today?: string;
  now?: string;
  operations?: SlotDetailOperations;
  initialState?: {
    reserve?: SlotActionState;
    cancel?: SlotActionState;
    extend?: SlotActionState;
    end?: SlotActionState;
  };
};

const buttonSx = { minHeight: designTokens.size.touchTargetMin };
const unavailableAction: SlotFormAction = async () => ({
  error: slotDetailText.pending,
});

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <Stack
      direction="row"
      spacing={1}
      sx={{ alignItems: "baseline", flexWrap: "wrap" }}
      useFlexGap
    >
      <Typography color="textSecondary" variant="body2">
        {label}
      </Typography>
      <Typography sx={{ overflowWrap: "anywhere" }} variant="body1">
        {value}
      </Typography>
    </Stack>
  );
}

/** 首页详情只保留最多两个主操作；低频操作集中在「更多操作」。 */
export function SlotDetail(props: SlotDetailProps) {
  const [resetKey, setResetKey] = useState(0);
  return (
    <SlotDetailContent
      key={resetKey}
      {...props}
      initialState={resetKey === 0 ? props.initialState : undefined}
      onViewSlot={() => setResetKey((key) => key + 1)}
    />
  );
}

function SlotDetailContent({
  detail,
  display,
  today = "",
  now = "",
  operations,
  initialState,
  onViewSlot,
}: SlotDetailProps & { onViewSlot: () => void }) {
  const router = useRouter();
  const redirectedReservation = useRef<string | null>(null);
  const [reserveOpen, setReserveOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);
  const [endDate, setEndDate] = useState(today);
  const [reserveState, submitReserve, reservePending] = useActionState(
    operations?.reserve ?? unavailableAction,
    initialState?.reserve ?? ({} as SlotActionState),
  );
  const [cancelState, submitCancel, cancelPending] = useActionState(
    operations?.cancelReservation ?? unavailableAction,
    initialState?.cancel ?? ({} as SlotActionState),
  );
  const [extendState, submitExtend, extendPending] = useActionState(
    operations?.extendBorrow ?? unavailableAction,
    initialState?.extend ?? ({} as SlotActionState),
  );
  const [endState, submitEnd, endPending] = useActionState(
    operations?.endLease ?? unavailableAction,
    initialState?.end ?? ({} as SlotActionState),
  );

  const completed =
    (cancelState.result
      ? { kind: "cancel", result: cancelState.result }
      : null) ??
    (extendState.result
      ? { kind: "extend", result: extendState.result }
      : null) ??
    (endState.result ? { kind: "end", result: endState.result } : null);
  const undoAction =
    completed?.kind === "cancel"
      ? operations?.undoCancelReservation
      : completed?.kind === "extend"
        ? operations?.undoExtendBorrow
        : operations?.undoEndLease;
  const [undoState, submitUndo, undoPending] = useActionState(
    undoAction ?? unavailableAction,
    {} as SlotActionState,
  );

  useEffect(() => {
    const id = reserveState.result?.id;
    if (
      !reserveState.success ||
      !detail ||
      !id ||
      redirectedReservation.current === id
    ) {
      return;
    }
    redirectedReservation.current = id;
    const params = new URLSearchParams({
      done: "reserve",
      slot: detail.code,
      id,
    });
    router.push("/?" + params.toString());
  }, [detail, reserveState.result?.id, reserveState.success, router]);

  // 预留后重新渲染时车位可能已被占用，成功状态优先于权限判断。
  if (reserveState.success) {
    return (
      <Stack spacing={2} sx={{ alignItems: "center" }}>
        <CircularProgress aria-label={operationText.returning} />
        <Typography variant="h2">{operationText.returning}</Typography>
      </Stack>
    );
  }

  if (!detail) {
    return (
      <Stack spacing={3}>
        <Typography component="h2" variant="h2">
          {slotDetailText.missing}
        </Typography>
        <Button
          component={Link}
          fullWidth
          href="/"
          size="large"
          sx={buttonSx}
          variant="contained"
        >
          {slotDetailText.backHome}
        </Button>
      </Stack>
    );
  }

  if (completed) {
    const result = completed.result;
    return (
      <>
        <ParkingOperationResult
          code={detail.code}
          title={
            completed.kind === "cancel"
              ? slotDetailText.cancelledSuccess
              : completed.kind === "extend"
                ? slotDetailText.extendedSuccess
                : slotDetailText.endedSuccess
          }
          id={result.id}
          idName={
            completed.kind === "cancel"
              ? "reservationId"
              : completed.kind === "extend"
                ? "sessionId"
                : "leaseId"
          }
          extraUndoFields={
            completed.kind === "extend"
              ? [
                  { name: "previous", value: result.previous ?? "" },
                  { name: "expectedCurrent", value: result.current ?? "" },
                ]
              : undefined
          }
          undo={submitUndo}
          undoState={undoState}
          isUndoPending={undoPending}
          onViewSlot={onViewSlot}
        />
        <FailureFeedbackDialog state={undoState} />
      </>
    );
  }

  const vehicle = detail.presentVehicle;
  const phone = detail.lease?.phone?.trim();
  const privateBorrowed = detail.kind === "private" && Boolean(vehicle);
  const borrowOverdue =
    privateBorrowed &&
    !!vehicle?.borrowUntil &&
    !!now &&
    Date.parse(now) >= Date.parse(vehicle.borrowUntil);
  const reserved = !vehicle && Boolean(detail.reservation);
  const leaseAway = !vehicle && Boolean(detail.lease);
  const links: { label: string; href: string }[] = [];
  if (detail.isActive) {
    if (vehicle) {
      if (
        !privateBorrowed &&
        (vehicle.billingType === "hotel_daily" ||
          vehicle.billingType === "lease")
      ) {
        links.push({
          label:
            vehicle.billingType === "lease"
              ? slotDetailText.renewLease
              : slotDetailText.renew,
          href: `/slots/${detail.code}/renew`,
        });
      }
      links.push({
        label: slotDetailText.leave,
        href: `/slots/${detail.code}/check-out`,
      });
    } else {
      links.push({
        label: slotDetailText.enter,
        href: `/slots/${detail.code}/check-in`,
      });
      if (leaseAway)
        links.push({
          label: slotDetailText.renewLease,
          href: `/slots/${detail.code}/renew`,
        });
    }
  }
  const showReserve =
    detail.isActive &&
    detail.kind === "regular" &&
    !vehicle &&
    !detail.lease &&
    !detail.reservation;
  const showNewLease = showReserve;
  const showEditLease = detail.isActive && Boolean(detail.lease?.id);
  const showEndLease = showEditLease && !vehicle;
  const hasMore = showEditLease || showEndLease || privateBorrowed;
  const errorState = reserveState.error
    ? reserveState
    : cancelState.error
      ? cancelState
      : extendState.error
        ? extendState
        : endState;

  return (
    <Stack spacing={3}>
      <Stack
        direction="row"
        spacing={2}
        sx={{ alignItems: "center", flexWrap: "wrap" }}
        useFlexGap
      >
        <Typography component="h2" variant="h2">
          {detail.name}
        </Typography>
        <SlotStatusBadge
          inactive={!detail.isActive}
          label={detail.isActive ? undefined : slotDetailText.inactive}
          status={borrowOverdue ? "overdue" : detail.status}
        />
      </Stack>

      {detail.isActive &&
        Boolean(
          vehicle ||
          detail.lease ||
          detail.reservation?.guestName ||
          detail.reservation?.note,
        ) && (
          <Paper
            variant="outlined"
            sx={{ borderRadius: String(designTokens.radius.lg) + "px", p: 2 }}
          >
            <Stack spacing={2}>
              {vehicle && (
                <>
                  <DetailRow
                    label={slotDetailText.plate}
                    value={formatPlateForDisplay(vehicle.plate)}
                  />
                  <DetailRow
                    label={slotDetailText.billingType}
                    value={billingTypeLabels[vehicle.billingType]}
                  />
                  {display?.enteredAt && (
                    <DetailRow
                      label={slotDetailText.enteredAt}
                      value={display.enteredAt}
                    />
                  )}
                  {(vehicle.billingType === "hotel_daily" ||
                    vehicle.billingType === "lease") &&
                    display?.paidUntil && (
                      <DetailRow
                        label={slotDetailText.paidUntil}
                        value={display.paidUntil}
                      />
                    )}
                  {(vehicle.billingType === "hourly" ||
                    vehicle.billingType === "free") &&
                    !privateBorrowed &&
                    display?.elapsed && (
                      <Typography variant="body1">{display.elapsed}</Typography>
                    )}
                  {vehicle.borrowUntil && display?.borrowUntil && (
                    <DetailRow
                      label={slotDetailText.borrowUntil}
                      value={display.borrowUntil}
                    />
                  )}
                  {privateBorrowed && vehicle.borrowUntil && now && (
                    <Typography
                      variant="h3"
                      color={borrowOverdue ? "error" : "textPrimary"}
                    >
                      {describeBorrowRemaining(vehicle.borrowUntil, now)}
                    </Typography>
                  )}
                  {vehicle.photoUrl && (
                    <Box
                      alt={slotDetailText.photo}
                      component="img"
                      src={vehicle.photoUrl}
                      sx={{
                        borderRadius: String(designTokens.radius.md) + "px",
                        display: "block",
                        maxHeight: designTokens.size.primaryActionHeight * 2,
                        objectFit: "cover",
                        width: "100%",
                      }}
                    />
                  )}
                </>
              )}
              {reserved && detail.reservation && (
                <>
                  {detail.reservation.guestName && (
                    <DetailRow
                      label={slotDetailText.guestName}
                      value={detail.reservation.guestName}
                    />
                  )}
                  {detail.reservation.note && (
                    <DetailRow
                      label={slotDetailText.note}
                      value={detail.reservation.note}
                    />
                  )}
                </>
              )}
              {detail.lease && (
                <>
                  <DetailRow
                    label={slotDetailText.tenantName}
                    value={detail.lease.tenantName}
                  />
                  {display?.leasePaidUntil && (
                    <DetailRow
                      label={slotDetailText.leasePaidUntil}
                      value={display.leasePaidUntil}
                    />
                  )}
                  {detail.lease.plate && (
                    <DetailRow
                      label={slotDetailText.regularPlate}
                      value={formatPlateForDisplay(detail.lease.plate)}
                    />
                  )}
                  {phone && (
                    <Button
                      component="a"
                      fullWidth
                      href={"tel:" + phone}
                      size="large"
                      sx={buttonSx}
                      variant="outlined"
                    >
                      {slotDetailText.phone} {phone}
                    </Button>
                  )}
                  {detail.lease.recentPayments?.map((payment) => (
                    <DetailRow
                      key={payment.id}
                      label={slotDetailText.paymentRecord}
                      value={
                        formatBusinessDateTime(payment.paidAt) +
                        " " +
                        (payment.amountCents / 100).toFixed(2) +
                        "元 " +
                        paymentMethodLabels[payment.method]
                      }
                    />
                  ))}
                </>
              )}
            </Stack>
          </Paper>
        )}

      {detail.isActive && (
        <Stack spacing={2}>
          {privateBorrowed && vehicle?.sessionId && (
            <form action={submitExtend}>
              <input type="hidden" name="sessionId" value={vehicle.sessionId} />
              <input type="hidden" name="minutes" value="10" />
              <Button
                fullWidth
                size="large"
                sx={buttonSx}
                variant="contained"
                disabled={extendPending}
                type="submit"
              >
                {slotDetailText.borrow10}
              </Button>
            </form>
          )}
          {links.map(({ label, href }, index) => (
            <Button
              key={href}
              component={Link}
              fullWidth
              href={href}
              size="large"
              sx={buttonSx}
              variant={
                index === 0 && !privateBorrowed ? "contained" : "outlined"
              }
            >
              {label}
            </Button>
          ))}
          {showReserve && (
            <Button
              fullWidth
              size="large"
              sx={buttonSx}
              variant="outlined"
              onClick={() => setReserveOpen(true)}
            >
              {slotDetailText.reserve}
            </Button>
          )}
          {showNewLease && (
            <Button
              component={Link}
              fullWidth
              href={`/slots/${detail.code}/lease/new`}
              size="large"
              sx={buttonSx}
              variant="outlined"
            >
              {slotDetailText.newLease}
            </Button>
          )}
          {reserved && detail.reservation?.id && (
            <Button
              fullWidth
              size="large"
              sx={buttonSx}
              variant="outlined"
              onClick={() => setCancelOpen(true)}
            >
              {slotDetailText.cancelReservation}
            </Button>
          )}
        </Stack>
      )}

      {hasMore && (
        <Stack spacing={1}>
          <Typography component="h3" variant="body1">
            {slotDetailText.moreActions}
          </Typography>
          {showEditLease && (
            <Button
              component={Link}
              fullWidth
              href={`/slots/${detail.code}/lease/edit`}
              sx={buttonSx}
              variant="text"
            >
              {slotDetailText.editLease}
            </Button>
          )}
          {showEndLease && (
            <Button
              fullWidth
              sx={buttonSx}
              variant="text"
              onClick={() => setEndOpen(true)}
            >
              {slotDetailText.endLease}
            </Button>
          )}
          {privateBorrowed && vehicle?.sessionId && (
            <form action={submitExtend}>
              <input type="hidden" name="sessionId" value={vehicle.sessionId} />
              <input type="hidden" name="minutes" value="30" />
              <Button
                fullWidth
                sx={buttonSx}
                variant="text"
                type="submit"
                disabled={extendPending}
              >
                {slotDetailText.borrow30}
              </Button>
            </form>
          )}
        </Stack>
      )}

      {reserveOpen && showReserve && (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <form action={submitReserve}>
            <Stack spacing={2}>
              <TextField
                name="guestName"
                fullWidth
                label={slotDetailText.guestName}
              />
              <TextField
                name="note"
                fullWidth
                multiline
                minRows={2}
                label={slotDetailText.note}
              />
              <input type="hidden" name="slotCode" value={detail.code} />
              <Button
                fullWidth
                type="submit"
                variant="contained"
                size="large"
                disabled={reservePending}
                sx={buttonSx}
              >
                {slotDetailText.confirmReserve}
              </Button>
              <Button
                fullWidth
                type="button"
                variant="text"
                size="large"
                disabled={reservePending}
                sx={buttonSx}
                onClick={() => setReserveOpen(false)}
              >
                {slotDetailText.cancel}
              </Button>
            </Stack>
          </form>
        </Paper>
      )}
      <Button
        component={Link}
        fullWidth
        href="/"
        size="large"
        sx={buttonSx}
        variant="outlined"
      >
        {slotDetailText.backMap}
      </Button>

      <Dialog open={cancelOpen} onClose={() => setCancelOpen(false)} fullWidth>
        <DialogTitle>{slotDetailText.cancelReservationQuestion}</DialogTitle>
        <DialogContent>
          <Typography variant="body1">{detail.name}</Typography>
        </DialogContent>
        <DialogActions>
          <Button sx={buttonSx} onClick={() => setCancelOpen(false)}>
            {slotDetailText.keep}
          </Button>
          <form action={submitCancel}>
            <input
              type="hidden"
              name="reservationId"
              value={detail.reservation?.id ?? ""}
            />
            <Button type="submit" sx={buttonSx} disabled={cancelPending}>
              {slotDetailText.confirmCancel}
            </Button>
          </form>
        </DialogActions>
      </Dialog>
      <Dialog open={endOpen} onClose={() => setEndOpen(false)} fullWidth>
        <DialogTitle>
          {slotDetailText.endLeaseQuestion(detail.lease?.tenantName ?? "")}
        </DialogTitle>
        <form action={submitEnd}>
          <DialogContent>
            <TextField
              fullWidth
              type="date"
              label={slotDetailText.endDate}
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <input
              type="hidden"
              name="leaseId"
              value={detail.lease?.id ?? ""}
            />
            <input type="hidden" name="endedOn" value={endDate} />
          </DialogContent>
          <DialogActions>
            <Button sx={buttonSx} onClick={() => setEndOpen(false)}>
              {slotDetailText.keep}
            </Button>
            <Button sx={buttonSx} type="submit" disabled={endPending}>
              {slotDetailText.confirmEnd}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
      <FailureFeedbackDialog state={errorState} />
    </Stack>
  );
}
