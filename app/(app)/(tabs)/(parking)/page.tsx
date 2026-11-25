import Stack from "@mui/material/Stack";

import { slotMapText } from "config/slotMapText";
import { undoCheckInAction } from "internal/parking/adapter/next/checkInActions";
import { undoCheckOutAction } from "internal/parking/adapter/next/checkOutActions";
import { undoRenewalAction } from "internal/parking/adapter/next/renewActions";
import { loadReminders } from "internal/parking/adapter/next/loadReminders";
import { loadSlotOperationViews } from "internal/parking/adapter/next/loadSlotMap";
import {
  undoCreateLeaseAction,
  undoReservationAction,
  undoCancelReservationAction,
  undoExtendBorrowAction,
  undoEndLeaseAction,
} from "internal/parking/adapter/next/slotOperationsActions";
import { HomeHeader } from "molecules/navigation/HomeHeader/HomeHeader";
import { OperationMapSection } from "organisms/slots/ParkingSlotMap/OperationMapSection";
import { SlotDetailContent } from "organisms/slots/SlotDetail/SlotDetailContent";
import { ReminderRefresh } from "organisms/slots/SlotReminders/ReminderRefresh";
import { PageShell } from "templates/layout/PageShell/PageShell";
import { resolveOperationNotice } from "utils/operationNotice";
import { parseOperationParams } from "utils/operationParams";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{
    done?: string | string[];
    slot?: string | string[];
    id?: string | string[];
    photo?: string | string[];
  }>;
}) {
  const now = new Date();
  const [views, reminders] = await Promise.all([
    loadSlotOperationViews(now),
    loadReminders(now),
  ]);
  const slots = views.map(({ detail: { code, name, isActive, status } }) => ({
    code,
    name,
    isActive,
    status,
  }));
  const parsed = parseOperationParams(
    await searchParams,
    slots.map((slot) => slot.code),
  );
  const detail =
    views.find(({ detail }) => detail.code === parsed?.slot)?.detail ?? null;
  const slotOperations = Object.fromEntries(
    views.map((view) => [
      view.detail.code,
      <SlotDetailContent
        key={view.detail.code}
        code={view.detail.code}
        now={now}
        operation={view}
      />,
    ]),
  );
  const notice = resolveOperationNotice(parsed, detail);

  return (
    <PageShell
      embedded
      title={slotMapText.title}
      headerContent={<HomeHeader hasReminders={reminders.length > 0} />}
    >
      <Stack spacing={1}>
        <ReminderRefresh />
        <OperationMapSection
          notice={notice}
          queryId={parsed?.id}
          slots={slots}
          slotOperations={slotOperations}
          undoActions={{
            checkin: undoCheckInAction,
            reserve: undoReservationAction,
            lease: undoCreateLeaseAction,
            checkout: undoCheckOutAction,
            renew: undoRenewalAction,
            cancel: undoCancelReservationAction,
            extend: undoExtendBorrowAction,
            end: undoEndLeaseAction,
          }}
        />
      </Stack>
    </PageShell>
  );
}
