import { slotSettingsText } from "config/slotSettingsText";
import { SettingsMenu } from "organisms/slots/SettingsMenu/SettingsMenu";
import { PageShell } from "templates/layout/PageShell/PageShell";

export default function SettingsPage() {
  return (
    <PageShell title={slotSettingsText.settings}>
      <SettingsMenu />
    </PageShell>
  );
}
