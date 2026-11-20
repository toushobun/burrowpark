import { checkInText } from "config/checkInText";
import {
  checkInAction,
  undoCheckInAction,
} from "internal/parking/adapter/next/checkInActions";
import { loadCheckInForm } from "internal/parking/adapter/next/loadCheckInForm";
import { CheckInForm } from "organisms/parkingSessions/CheckInForm/CheckInForm";
import { PageShell } from "templates/layout/PageShell/PageShell";

export default async function CheckInPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const form = await loadCheckInForm(code, new Date());

  return (
    <PageShell title={checkInText.title}>
      <CheckInForm
        action={checkInAction}
        form={form}
        undoAction={undoCheckInAction}
      />
    </PageShell>
  );
}
