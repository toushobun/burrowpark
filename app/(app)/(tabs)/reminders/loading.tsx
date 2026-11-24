import { slotMapText } from "config/slotMapText";
import { PageSkeleton } from "templates/layout/PageSkeleton/PageSkeleton";

export default function Loading() {
  return <PageSkeleton embedded title={slotMapText.reminders} />;
}
