import type { ReactNode } from "react";

import { SlotOperationDialog } from "organisms/slots/SlotOperationDialog/SlotOperationDialog";

export default async function OperationLayout({
  params,
  children,
}: {
  params: Promise<{ code: string }>;
  children: ReactNode;
}) {
  const { code } = await params;
  return <SlotOperationDialog code={code}>{children}</SlotOperationDialog>;
}
