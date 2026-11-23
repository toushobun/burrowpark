import { leaseText } from "config/leaseText";
import { getBusinessDate } from "internal/parking";
import { createLeaseAction } from "internal/parking/adapter/next/slotOperationsActions";
import { loadSlotDetail } from "internal/parking/adapter/next/loadSlotDetail";
import { LeaseForm } from "organisms/slots/LeaseForm/LeaseForm";
import { PageShell } from "templates/layout/PageShell/PageShell";

export default async function NewLeasePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const now = new Date();
  const detail = await loadSlotDetail(code, now);
  const today = getBusinessDate(now);
  return (
    <PageShell backHref={"/slots/" + code} title={leaseText.createTitle}>
      <LeaseForm
        mode="create"
        detail={detail}
        today={today}
        action={createLeaseAction}
      />
    </PageShell>
  );
}
