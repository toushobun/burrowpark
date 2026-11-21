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
  }>;
}) {
  const { filter, records, previousDate, nextDate } = await loadRecords(
    await searchParams,
  );
  return (
    <PageShell title={recordsText.title}>
      <RecordsView
        filter={filter}
        records={records}
        previousDate={previousDate}
        nextDate={nextDate}
        action={recordsCorrectionAction}
      />
    </PageShell>
  );
}
