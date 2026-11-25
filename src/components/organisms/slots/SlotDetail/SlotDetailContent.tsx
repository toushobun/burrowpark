import "server-only";

import {
  formatBusinessDate,
  formatBusinessDateTime,
  formatBusinessTime,
  formatElapsed,
  getBusinessDate,
} from "internal/parking";
import { checkInAction } from "internal/parking/adapter/next/checkInActions";
import { checkOutAction } from "internal/parking/adapter/next/checkOutActions";
import { loadCheckInForm } from "internal/parking/adapter/next/loadCheckInForm";
import { loadCheckOutForm } from "internal/parking/adapter/next/loadCheckOutForm";
import { loadRenewForm } from "internal/parking/adapter/next/loadRenewForm";
import { loadSlotDetail } from "internal/parking/adapter/next/loadSlotDetail";
import { renewAction } from "internal/parking/adapter/next/renewActions";
import {
  createLeaseAction,
  editLeaseAction,
  reserveAction,
  cancelReservationAction,
  extendBorrowAction,
  endLeaseAction,
} from "internal/parking/adapter/next/slotOperationsActions";
import { ReminderRefresh } from "organisms/slots/SlotReminders/ReminderRefresh";
import { CheckInForm } from "organisms/parkingSessions/CheckInForm/CheckInForm";
import { CheckOutForm } from "organisms/parkingSessions/CheckOutForm/CheckOutForm";
import { RenewForm } from "organisms/parkingSessions/RenewForm/RenewForm";
import { LeaseForm } from "organisms/slots/LeaseForm/LeaseForm";
import { SlotDetail } from "./SlotDetail";

export async function SlotDetailContent({
  code,
  modal = false,
}: {
  code: string;
  modal?: boolean;
}) {
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

  const today = getBusinessDate(now);
  const canRenew =
    detail?.kind === "regular" &&
    (detail.lease || vehicle?.billingType === "hotel_daily");
  const [checkIn, checkOut, renew] =
    modal && detail?.isActive
      ? await Promise.all([
          loadCheckInForm(code, now),
          vehicle ? loadCheckOutForm(code) : null,
          canRenew ? loadRenewForm(code) : null,
        ])
      : [null, null, null];

  return (
    <>
      {!modal && detail?.kind === "private" && detail.presentVehicle && (
        <ReminderRefresh />
      )}
      <SlotDetail
        detail={detail}
        display={display}
        now={now.toISOString()}
        today={today}
        modalForms={
          modal
            ? {
                "check-in": (
                  <CheckInForm action={checkInAction} form={checkIn} />
                ),
                "check-out": (
                  <CheckOutForm action={checkOutAction} form={checkOut} />
                ),
                renew: <RenewForm action={renewAction} form={renew} />,
                "lease/new": (
                  <LeaseForm
                    mode="create"
                    detail={detail}
                    today={today}
                    action={createLeaseAction}
                  />
                ),
                "lease/edit": (
                  <LeaseForm
                    mode="edit"
                    detail={detail}
                    today={today}
                    action={editLeaseAction}
                  />
                ),
              }
            : undefined
        }
        operations={{
          reserve: reserveAction,
          cancelReservation: cancelReservationAction,
          extendBorrow: extendBorrowAction,
          endLease: endLeaseAction,
        }}
      />
    </>
  );
}
