import { renewText } from "config/renewAndCheckOutText";
import { renewAction } from "internal/parking/adapter/next/renewActions";
import { loadRenewForm } from "internal/parking/adapter/next/loadRenewForm";
import { RenewForm } from "organisms/parkingSessions/RenewForm/RenewForm";
import { PageShell } from "templates/layout/PageShell/PageShell";

export default async function RenewPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const form = await loadRenewForm(code);
  return (
    <PageShell
      backHref={form ? "/slots/" + code : "/"}
      title={form?.mode === "lease" ? renewText.leaseTitle : renewText.title}
    >
      <RenewForm form={form} action={renewAction} />
    </PageShell>
  );
}
