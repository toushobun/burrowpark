import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import type { Database } from "./database.types";

/**
 * 创建携带当前用户 Session、受 RLS 保护的认证 Supabase Client。
 * 默认应使用此工厂；只有确有必要的后台操作才使用 service-role Client。
 */
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
            // Server Components 无法始终写入 cookie。
            // Session 刷新由 proxy.ts 负责。
          }
        },
      },
    },
  );
}

export type AuthenticatedSupabaseClient = Awaited<
  ReturnType<typeof createAuthenticatedSupabaseClient>
>;
