import Stack from "@mui/material/Stack";

import { slotMapText } from "config/slotMapText";
import { undoCheckInAction } from "internal/parking/adapter/next/checkInActions";
import { undoCheckOutAction } from "internal/parking/adapter/next/checkOutActions";
import { undoRenewalAction } from "internal/parking/adapter/next/renewActions";
import { loadReminders } from "internal/parking/adapter/next/loadReminders";
import { loadSlotDetail } from "internal/parking/adapter/next/loadSlotDetail";
import { loadSlotMap } from "internal/parking/adapter/next/loadSlotMap";
import {
  undoCreateLeaseAction,
  undoReservationAction,
  undoCancelReservationAction,
  undoExtendBorrowAction,
  undoEndLeaseAction,
} from "internal/parking/adapter/next/slotOperationsActions";
import { SettingsIconLink } from "molecules/navigation/SettingsIconLink/SettingsIconLink";
import { OperationMapSection } from "organisms/slots/ParkingSlotMap/OperationMapSection";
import { ReminderRefresh } from "organisms/slots/SlotReminders/ReminderRefresh";
import { SlotReminders } from "organisms/slots/SlotReminders/SlotReminders";
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
  const [slots, reminders] = await Promise.all([
    loadSlotMap(now),
    loadReminders(now),
  ]);

  const parsed = parseOperationParams(
    await searchParams,
    slots.map((slot) => slot.code),
  );
  const detail = parsed ? await loadSlotDetail(parsed.slot, now) : null;
  const notice = resolveOperationNotice(parsed, detail);

  return (
    <PageShell
      subtitle={slotMapText.subtitle}
      title={slotMapText.title}
      headerAction={<SettingsIconLink />}
    >
      <Stack spacing={3}>
        <ReminderRefresh />
        <SlotReminders reminders={reminders} />
        <OperationMapSection
          notice={notice}
          queryId={parsed?.id}
          slots={slots}
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
