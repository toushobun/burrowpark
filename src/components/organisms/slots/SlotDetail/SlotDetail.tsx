"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
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
import {
  useActionState,
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";

import { SlotStatusBadge } from "atoms/slots/SlotStatusBadge/SlotStatusBadge";
import { paymentMethodLabels } from "config/checkInText";
import { commonText } from "config/commonText";
import { billingTypeLabels, slotDetailText } from "config/slotDetailText";
import type { SlotDetail as SlotDetailData } from "internal/parking";
import {
  describeBorrowRemaining,
  formatBusinessDateTime,
  formatPlateForDisplay,
} from "internal/parking";
import type { SlotActionState } from "internal/parking/adapter/next/slotOperationsActions";
import { FailureFeedbackDialog } from "molecules/feedback/FailureFeedbackDialog/FailureFeedbackDialog";
import { OperationRedirecting } from "molecules/feedback/OperationRedirecting/OperationRedirecting";
import { useOperationFeedback } from "providers/OperationFeedbackProvider";
import { designTokens } from "theme/designTokens";

import { useSlotOperationPending } from "../SlotOperationDialog/slotOperationDialogContext";

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
  extendBorrow: SlotFormAction;
  endLease: SlotFormAction;
};

type SlotDetailStep =
  | "check-in"
  | "renew"
  | "check-out"
  | "lease/new"
  | "lease/edit";

export type SlotDetailModalForms = Partial<Record<SlotDetailStep, ReactNode>>;

type SlotDetailProps = {
  detail: SlotDetailData | null;
  display: SlotDetailDisplay | null;
  today?: string;
  now?: string;
  operations?: SlotDetailOperations;
  modalForms?: SlotDetailModalForms;
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

/** 高频操作直接展示；编辑长租、退租等低频操作集中在「更多操作」。 */
export function SlotDetail({
  detail,
  display,
  today = "",
  now = "",
  operations,
  modalForms,
  initialState,
}: SlotDetailProps) {
  const router = useRouter();
  const inModal = Boolean(modalForms);
  const { showNotice } = useOperationFeedback();
  const redirectedOperation = useRef<string | null>(null);
  const redirectedReservation = useRef<string | null>(null);
  const [reserveOpen, setReserveOpen] = useState(false);
  const [modalStep, setModalStep] = useState<SlotDetailStep | null>(null);
  const [guestName, setGuestName] = useState("");
  const [reservationNote, setReservationNote] = useState("");
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

  const detailPending =
    reservePending || cancelPending || extendPending || endPending;
  const dialog = useSlotOperationPending(detailPending);

  const completed =
    (cancelState.result
      ? { kind: "cancel" as const, result: cancelState.result }
      : null) ??
    (extendState.result
      ? { kind: "extend" as const, result: extendState.result }
      : null) ??
    (endState.result
      ? { kind: "end" as const, result: endState.result }
      : null);
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
    if (inModal) router.replace("/?" + params.toString());
    else router.push("/?" + params.toString());
  }, [detail, inModal, reserveState.result?.id, reserveState.success, router]);

  const completionId = completed?.result.id;
  const completionKind = completed?.kind;
  const completionPrevious = completed?.result.previous;
  const completionCurrent = completed?.result.current;
  useEffect(() => {
    if (!detail || !completionId || !completionKind) return;
    const key =
      completionKind + ":" + completionId + ":" + (completionCurrent ?? "");
    if (redirectedOperation.current === key) return;
    redirectedOperation.current = key;
    showNotice({
      kind: completionKind,
      code: detail.code,
      id: completionId,
      message:
        completionKind === "cancel"
          ? slotDetailText.cancelledSuccess
          : completionKind === "extend"
            ? slotDetailText.extendedSuccess
            : slotDetailText.endedSuccess,
      ...(completionKind === "extend"
        ? {
            extraUndoFields: [
              { name: "previous", value: completionPrevious ?? "" },
              { name: "expectedCurrent", value: completionCurrent ?? "" },
            ],
          }
        : {}),
    });
    router.replace("/");
  }, [
    completionCurrent,
    completionId,
    completionKind,
    completionPrevious,
    detail,
    router,
    showNotice,
  ]);

  // 预留后重新渲染时车位可能已被占用，成功状态优先于权限判断。
  if (reserveState.success) {
    return <OperationRedirecting />;
  }

  if (!detail) {
    return (
      <Stack spacing={3}>
        <Typography component="h2" variant="h2">
          {slotDetailText.missing}
        </Typography>
      </Stack>
    );
  }

  if (completed) {
    return <OperationRedirecting />;
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
  const links: { label: string; operation: SlotDetailStep }[] = [];
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
          operation: "renew",
        });
      }
      links.push({
        label: slotDetailText.leave,
        operation: "check-out",
      });
    } else {
      links.push({
        label: slotDetailText.enter,
        operation: "check-in",
      });
      if (leaseAway)
        links.push({
          label: slotDetailText.renewLease,
          operation: "renew",
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
  const reserveStep = inModal && reserveOpen && showReserve;
  const reserveBackLabel = inModal
    ? slotDetailText.backToActions
    : slotDetailText.cancel;
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

  const openOperation = (event: MouseEvent, step: SlotDetailStep) => {
    if (!modalForms) return;
    event.preventDefault();
    if (!detailPending && !dialog?.pending) setModalStep(step);
  };

  if (modalForms && modalStep) {
    return (
      <Stack spacing={2}>
        {modalForms[modalStep]}
        <Button
          fullWidth
          disabled={dialog?.pending}
          size="large"
          sx={buttonSx}
          onClick={() => setModalStep(null)}
        >
          {slotDetailText.backToActions}
        </Button>
      </Stack>
    );
  }

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

      {!reserveStep &&
        detail.isActive &&
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
                    value={
                      formatPlateForDisplay(vehicle.plate) || commonText.noPlate
                    }
                  />
                  {vehicle.phone && (
                    <DetailRow label={commonText.phone} value={vehicle.phone} />
                  )}
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

      {detail.isActive && !reserveStep && (
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
                disabled={detailPending}
                type="submit"
              >
                {slotDetailText.borrow10}
              </Button>
            </form>
          )}
          {links.map(({ label, operation }, index) => (
            <Button
              key={operation}
              disabled={detailPending}
              component={Link}
              fullWidth
              href={`/slots/${detail.code}/${operation}`}
              onClick={(event) => openOperation(event, operation)}
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
              disabled={detailPending}
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
              disabled={detailPending}
              onClick={(event) => openOperation(event, "lease/new")}
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
              disabled={detailPending}
              onClick={() => setCancelOpen(true)}
            >
              {slotDetailText.cancelReservation}
            </Button>
          )}
        </Stack>
      )}

      {hasMore && !reserveStep && (
        <Stack spacing={1}>
          <Typography component="h3" variant="body1">
            {slotDetailText.moreActions}
          </Typography>
          {showEditLease && (
            <Button
              component={Link}
              fullWidth
              href={`/slots/${detail.code}/lease/edit`}
              disabled={detailPending}
              onClick={(event) => openOperation(event, "lease/edit")}
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
              disabled={detailPending}
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
                disabled={detailPending}
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
                value={guestName}
                onChange={(event) => setGuestName(event.target.value)}
              />
              <TextField
                name="note"
                fullWidth
                multiline
                minRows={2}
                label={slotDetailText.note}
                value={reservationNote}
                onChange={(event) => setReservationNote(event.target.value)}
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
                {reserveBackLabel}
              </Button>
            </Stack>
          </form>
        </Paper>
      )}

      <Dialog
        open={cancelOpen}
        onClose={() => {
          if (!cancelPending) setCancelOpen(false);
        }}
        fullWidth
      >
        <DialogTitle>{slotDetailText.cancelReservationQuestion}</DialogTitle>
        <DialogContent>
          <Typography variant="body1">{detail.name}</Typography>
        </DialogContent>
        <DialogActions>
          <Button
            sx={buttonSx}
            disabled={cancelPending}
            onClick={() => setCancelOpen(false)}
          >
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
      <Dialog
        open={endOpen}
        onClose={() => {
          if (!endPending) setEndOpen(false);
        }}
        fullWidth
      >
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
              disabled={endPending}
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
            <Button
              sx={buttonSx}
              disabled={endPending}
              onClick={() => setEndOpen(false)}
            >
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
