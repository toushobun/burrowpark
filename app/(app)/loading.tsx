import { slotMapText } from "config/slotMapText";
import { PageSkeleton } from "templates/layout/PageSkeleton/PageSkeleton";

export default function Loading() {
  return <PageSkeleton title={slotMapText.title} rows={4} />;
}
