import { slotSettingsText } from "config/slotSettingsText";
import { SettingsMenu } from "organisms/slots/SettingsMenu/SettingsMenu";
import { PageShell } from "templates/layout/PageShell/PageShell";

export default function SettingsPage() {
  return (
    <PageShell embedded title={slotSettingsText.settings}>
      <SettingsMenu />
    </PageShell>
  );
}
