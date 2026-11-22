import { slotSettingsText } from "config/slotSettingsText";
import { PageSkeleton } from "templates/layout/PageSkeleton/PageSkeleton";

export default function Loading() {
  return <PageSkeleton title={slotSettingsText.slots} rows={6} backHref="/settings" />;
}
