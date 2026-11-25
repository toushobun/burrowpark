import { slotDetailText } from "config/slotDetailText";
import { SlotDetailContent } from "organisms/slots/SlotDetail/SlotDetailContent";
import { PageShell } from "templates/layout/PageShell/PageShell";

export default async function SlotDetailPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  return (
    <PageShell backHref="/" title={slotDetailText.pageTitle}>
      <SlotDetailContent code={code} />
    </PageShell>
  );
}
