import "server-only";

import { RepositoryError } from "internal/shared/errors/appError";
import type { Logger } from "internal/shared/logging/logger";
import type { AuthenticatedSupabaseClient } from "internal/shared/supabase/authenticatedClient";
import { createServiceRoleSupabaseClient } from "internal/shared/supabase/serviceRoleClient";

import { authMessages } from "../errors";

export interface AuthRepository {
  consumeLoginAttempt: (
    ipKey: string,
  ) => Promise<{ allowed: boolean; retryAfterSeconds: number }>;
  signInFamily: (email: string, password: string) => Promise<void>;
  resetLoginAttempts: (ipKey: string) => Promise<void>;
}

export function createAuthRepository(
  authenticated: AuthenticatedSupabaseClient,
  logger: Logger,
): AuthRepository {
  function fail(operation: string, error: unknown): never {
    logger.error("[auth] repository operation failed", {
      operation,
      errorName: error instanceof Error ? error.name : "unknown",
    });
    throw new RepositoryError("auth_unavailable", authMessages.unavailable);
  }

  return {
    async consumeLoginAttempt(ipKey) {
      try {
        const { data, error } = await createServiceRoleSupabaseClient().rpc(
          "consume_login_attempt",
          { p_ip_key: ipKey },
        );
        if (error || !data || data.length !== 1) {
          return fail("consumeLoginAttempt", error);
        }
        return {
          allowed: data[0].allowed,
          retryAfterSeconds: data[0].retry_after_seconds,
        };
      } catch (error) {
        return fail("consumeLoginAttempt", error);
      }
    },
    async signInFamily(email, password) {
      try {
        const { error } = await authenticated.auth.signInWithPassword({
          email,
          password,
        });
        if (error) return fail("signInFamily", error);
      } catch (error) {
        return fail("signInFamily", error);
      }
    },
    async resetLoginAttempts(ipKey) {
      try {
        const { error } = await createServiceRoleSupabaseClient().rpc(
          "reset_login_attempts",
          { p_ip_key: ipKey },
        );
        if (error) return fail("resetLoginAttempts", error);
      } catch (error) {
        return fail("resetLoginAttempts", error);
      }
    },
  };
}
