import { redirect } from "next/navigation";

import { createServerRequestDependencies } from "internal/shared/context/createServerRequestDependencies";

export async function requireSignedInPage(): Promise<void> {
  const { getAuth } = await createServerRequestDependencies();
  const auth = await getAuth(); // Supabase 不可用时保留 RepositoryError，由 error.tsx 展示。
  if (!auth.isAuthenticated) {
    redirect("/login");
  }
}
