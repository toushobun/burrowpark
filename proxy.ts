import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { decideProxyRouting } from "internal/auth/adapter/next/proxyRouting";
import { getAuthContext } from "internal/shared/auth/authContext";
import { RepositoryError } from "internal/shared/errors/appError";
import { createLogger } from "internal/shared/logging/logger";
import type { Database } from "internal/shared/supabase/database.types";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(toSet) {
          toSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          toSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  let status: "authenticated" | "unauthenticated" | "unavailable";
  try {
    const auth = await getAuthContext(supabase, createLogger(crypto.randomUUID()));
    status = auth.isAuthenticated ? "authenticated" : "unauthenticated";
  } catch (error) {
    if (!(error instanceof RepositoryError)) throw error;
    status = "unavailable";
  }

  const decision = decideProxyRouting(request.nextUrl.pathname, status);
  if (decision === "allow") return response;

  const destination = decision === "home" ? "/" : "/login";
  const redirectResponse = NextResponse.redirect(new URL(destination, request.url));
  response.cookies.getAll().forEach((cookie) => redirectResponse.cookies.set(cookie));
  return redirectResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|manifest.webmanifest|apple-touch-icon.png|icons/|api/health(?:/|$)).*)",
  ],
};
