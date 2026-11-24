import { HomeNavigation } from "molecules/navigation/HomeNavigation/HomeNavigation";
import { slotSettingsText } from "config/slotSettingsText";
import { SettingsMenu } from "organisms/slots/SettingsMenu/SettingsMenu";
import { PageShell } from "templates/layout/PageShell/PageShell";

export default function SettingsPage() {
  return (
    <PageShell
      footer={<HomeNavigation active="profile" />}
      title={slotSettingsText.settings}
    >
      <SettingsMenu />
    </PageShell>
  );
}
