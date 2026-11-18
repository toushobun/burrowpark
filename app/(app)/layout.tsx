import type { ReactNode } from "react";

import { requireSignedInPage } from "internal/auth/adapter/next/requireSignedInPage";

export default async function AuthenticatedLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireSignedInPage();
  return children;
}
