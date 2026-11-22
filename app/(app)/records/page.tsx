import { recordsText } from "config/recordsText";
import { loadRecords } from "internal/parking/adapter/next/loadRecords";
import { recordsCorrectionAction } from "internal/parking/adapter/next/recordsActions";
import { RecordsView } from "organisms/parkingSessions/RecordsView/RecordsView";
import { PageShell } from "templates/layout/PageShell/PageShell";

export default async function RecordsPage({
  searchParams,
}: {
  searchParams: Promise<{
    date?: string | string[];
    plate?: string | string[];
    mode?: string | string[];
    leaseBy?: string | string[];
    leaseQuery?: string | string[];
  }>;
}) {
  const { filter, records, previousDate, nextDate } = await loadRecords(
    await searchParams,
  );
  return (
    <PageShell backHref="/settings" title={recordsText.title}>
      <RecordsView
        key={
          filter.kind === "date"
            ? filter.date
            : filter.kind === "plate"
              ? filter.plate
              : filter.searchBy + filter.query
        }
        filter={filter}
        records={records}
        previousDate={previousDate}
        nextDate={nextDate}
        action={recordsCorrectionAction}
      />
    </PageShell>
  );
}
