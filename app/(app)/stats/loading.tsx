import { monthlyStatsText } from "config/monthlyStatsText";
import { PageSkeleton } from "templates/layout/PageSkeleton/PageSkeleton";

export default function Loading() {
  return <PageSkeleton title={monthlyStatsText.title} rows={5} backHref="/settings" />;
}
