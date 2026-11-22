import Stack from "@mui/material/Stack";

import { slotMapText } from "config/slotMapText";
import { loadReminders } from "internal/parking/adapter/next/loadReminders";
import { ReminderRefresh } from "organisms/slots/SlotReminders/ReminderRefresh";
import { SlotReminders } from "organisms/slots/SlotReminders/SlotReminders";
import { loadSlotMap } from "internal/parking/adapter/next/loadSlotMap";
import { loadSlotDetail } from "internal/parking/adapter/next/loadSlotDetail";
import { undoCheckInAction } from "internal/parking/adapter/next/checkInActions";
import { SettingsIconLink } from "molecules/navigation/SettingsIconLink/SettingsIconLink";
import { CheckInMapSection } from "organisms/slots/ParkingSlotMap/CheckInMapSection";
import { parseCheckInParams } from "utils/checkInParams";
import { PageShell } from "templates/layout/PageShell/PageShell";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{
    checkedIn?: string | string[];
    session?: string | string[];
    photo?: string | string[];
  }>;
}) {
  const now = new Date();
  const [slots, reminders] = await Promise.all([
    loadSlotMap(now),
    loadReminders(now),
  ]);

  const parsed = parseCheckInParams(
    await searchParams,
    slots.map((slot) => slot.code),
  );
  const detail = parsed ? await loadSlotDetail(parsed.code, now) : null;
  const vehicle = detail?.presentVehicle;
  const notice =
    parsed && detail && vehicle?.sessionId === parsed.sessionId
      ? {
          code: parsed.code,
          sessionId: parsed.sessionId,
          plate: vehicle.plate,
          slotName: detail.name,
          photoSaved: parsed.photoSaved,
        }
      : null;

  return (
    <PageShell
      subtitle={slotMapText.subtitle}
      title={slotMapText.title}
      headerAction={<SettingsIconLink />}
    >
      <Stack spacing={3}>
        <ReminderRefresh />
        <SlotReminders reminders={reminders} />
        <CheckInMapSection
          notice={notice}
          slots={slots}
          undoAction={undoCheckInAction}
        />
      </Stack>
    </PageShell>
  );
}
