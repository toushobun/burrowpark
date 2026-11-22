import { slotSettingsText } from "config/slotSettingsText";
import { loadSlotSettings } from "internal/parking/adapter/next/loadSlotSettings";
import { updateSlotSettingsAction } from "internal/parking/adapter/next/slotSettingsActions";
import { SlotSettingsList } from "organisms/slots/SlotSettingsList/SlotSettingsList";
import { PageShell } from "templates/layout/PageShell/PageShell";

export default async function SlotSettingsPage() {
  const rows = await loadSlotSettings();
  return (
    <PageShell backHref="/settings" title={slotSettingsText.slots}>
      <SlotSettingsList rows={rows} action={updateSlotSettingsAction} />
    </PageShell>
  );
}
