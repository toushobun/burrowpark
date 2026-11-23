import { leaseText } from "config/leaseText";
import { getBusinessDate } from "internal/parking";
import { editLeaseAction } from "internal/parking/adapter/next/slotOperationsActions";
import { loadSlotDetail } from "internal/parking/adapter/next/loadSlotDetail";
import { LeaseForm } from "organisms/slots/LeaseForm/LeaseForm";
import { PageShell } from "templates/layout/PageShell/PageShell";

export default async function EditLeasePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const now = new Date();
  const detail = await loadSlotDetail(code, now);
  return (
    <PageShell title={leaseText.editTitle}>
      <LeaseForm
        mode="edit"
        detail={detail}
        today={getBusinessDate(now)}
        action={editLeaseAction}
      />
    </PageShell>
  );
}
