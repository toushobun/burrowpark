import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import type { Database } from "./database.types";

/** 创建携带当前用户 Session、受 RLS 保护的认证 Supabase Client。 */
export async function createAuthenticatedSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Server Component 不能写 Cookie，由 proxy.ts 刷新并写入响应。
          }
        },
      },
    },
  );
}

export type AuthenticatedSupabaseClient = Awaited<
  ReturnType<typeof createAuthenticatedSupabaseClient>
>;
