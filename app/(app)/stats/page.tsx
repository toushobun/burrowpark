import { monthlyStatsText } from "config/monthlyStatsText";
import { loadMonthlyStats } from "internal/parking/adapter/next/loadMonthlyStats";
import { MonthlyStats } from "organisms/stats/MonthlyStats/MonthlyStats";
import { PageShell } from "templates/layout/PageShell/PageShell";

export default async function MonthlyStatsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string | string[] }>;
}) {
  const params = await searchParams;
  const { month, currentMonth, stats } = await loadMonthlyStats(params.month);

  return (
    <PageShell title={monthlyStatsText.title}>
      <MonthlyStats
        month={month}
        currentMonth={currentMonth}
        stats={stats}
      />
    </PageShell>
  );
}
