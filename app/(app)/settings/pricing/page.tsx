import { pricingSettingsText } from "config/pricingSettingsText";
import { updatePricingSettingsAction } from "internal/parking/adapter/next/pricingSettingsActions";
import { loadPricingSettings } from "internal/parking/adapter/next/loadPricingSettings";
import { PricingSettingsForm } from "organisms/slots/PricingSettingsForm/PricingSettingsForm";
import { PageShell } from "templates/layout/PageShell/PageShell";

export default async function PricingSettingsPage() {
  const settings = await loadPricingSettings();
  return (
    <PageShell title={pricingSettingsText.title}>
      <PricingSettingsForm
        initial={settings}
        action={updatePricingSettingsAction}
      />
    </PageShell>
  );
}
