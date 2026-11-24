import { checkOutText } from "config/renewAndCheckOutText";
import { checkOutAction } from "internal/parking/adapter/next/checkOutActions";
import { loadCheckOutForm } from "internal/parking/adapter/next/loadCheckOutForm";
import { CheckOutForm } from "organisms/parkingSessions/CheckOutForm/CheckOutForm";
import { PageShell } from "templates/layout/PageShell/PageShell";

export default async function CheckOutPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const form = await loadCheckOutForm(code);
  return (
    <PageShell backHref={"/slots/" + code} title={checkOutText.title}>
      <CheckOutForm form={form} action={checkOutAction} />
    </PageShell>
  );
}
