import { slotDetailText } from "config/slotDetailText";
import {
  formatBusinessDate,
  formatBusinessDateTime,
  formatBusinessTime,
  formatElapsed,
  getBusinessDate,
} from "internal/parking";
import { loadSlotDetail } from "internal/parking/adapter/next/loadSlotDetail";
import {
  reserveAction,
  cancelReservationAction,
  undoCancelReservationAction,
  extendBorrowAction,
  undoExtendBorrowAction,
  endLeaseAction,
  undoEndLeaseAction,
} from "internal/parking/adapter/next/slotOperationsActions";
import { ReminderRefresh } from "organisms/slots/SlotReminders/ReminderRefresh";
import { SlotDetail } from "organisms/slots/SlotDetail/SlotDetail";
import { PageShell } from "templates/layout/PageShell/PageShell";

export default async function SlotDetailPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const now = new Date();
  const detail = await loadSlotDetail(code, now);
  const vehicle = detail?.presentVehicle;

  const display = detail
    ? {
        enteredAt: vehicle ? formatBusinessDateTime(vehicle.enteredAt) : null,
        paidUntil: vehicle?.paidUntil
          ? vehicle.billingType === "lease"
            ? formatBusinessDate(vehicle.paidUntil)
            : formatBusinessDateTime(vehicle.paidUntil)
          : null,
        elapsed: vehicle ? formatElapsed(vehicle.enteredAt, now) : null,
        borrowUntil: vehicle?.borrowUntil
          ? formatBusinessTime(vehicle.borrowUntil)
          : null,
        leasePaidUntil: detail.lease?.paidUntil
          ? formatBusinessDate(detail.lease.paidUntil)
          : null,
      }
    : null;

  return (
    <PageShell title={slotDetailText.pageTitle}>
      {detail?.kind === "private" && detail.presentVehicle && (
        <ReminderRefresh />
      )}
      <SlotDetail
        detail={detail}
        display={display}
        now={now.toISOString()}
        today={getBusinessDate(now)}
        operations={{
          reserve: reserveAction,
          cancelReservation: cancelReservationAction,
          undoCancelReservation: undoCancelReservationAction,
          extendBorrow: extendBorrowAction,
          undoExtendBorrow: undoExtendBorrowAction,
          endLease: endLeaseAction,
          undoEndLease: undoEndLeaseAction,
        }}
      />
    </PageShell>
  );
}
