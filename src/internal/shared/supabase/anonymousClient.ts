import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import type { Database } from "./database.types";

/** 仅公开 key、无 Session；仅用于确有必要的未登录只读场景。 */
export function createAnonymousSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !publishableKey) {
    throw new Error(
      "Supabase anonymous client environment variables are missing.",
    );
  }

  return createSupabaseClient<Database>(supabaseUrl, publishableKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
