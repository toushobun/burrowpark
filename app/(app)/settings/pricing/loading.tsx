import { pricingSettingsText } from "config/pricingSettingsText";
import { PageSkeleton } from "templates/layout/PageSkeleton/PageSkeleton";

export default function Loading() {
  return <PageSkeleton title={pricingSettingsText.title} rows={6} backHref="/settings" />;
}
