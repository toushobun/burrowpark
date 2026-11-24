import { slotMapText } from "config/slotMapText";
import { loadReminders } from "internal/parking/adapter/next/loadReminders";
import { HomeNavigation } from "molecules/navigation/HomeNavigation/HomeNavigation";
import { ReminderRefresh } from "organisms/slots/SlotReminders/ReminderRefresh";
import { SlotReminders } from "organisms/slots/SlotReminders/SlotReminders";
import { PageShell } from "templates/layout/PageShell/PageShell";

export default async function RemindersPage() {
  const reminders = await loadReminders(new Date());
  return (
    <PageShell
      title={slotMapText.reminders}
      footer={<HomeNavigation active="reminders" />}
    >
      <ReminderRefresh />
      <SlotReminders reminders={reminders} />
    </PageShell>
  );
}
