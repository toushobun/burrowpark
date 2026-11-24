import type { ReactNode } from "react";

import { requireSignedInPage } from "internal/auth/adapter/next/requireSignedInPage";
import { OperationFeedbackProvider } from "providers/OperationFeedbackProvider";

export default async function AuthenticatedLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireSignedInPage();
  return <OperationFeedbackProvider>{children}</OperationFeedbackProvider>;
}
