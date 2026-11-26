import { monthlyStatsText } from "config/monthlyStatsText";
import { PageSkeleton } from "templates/layout/PageSkeleton/PageSkeleton";

export default function Loading() {
  return (
    <PageSkeleton
      title={monthlyStatsText.title}
      rowColumns={[3, 1, 1, 1, 1]}
      backHref="/settings"
    />
  );
}
