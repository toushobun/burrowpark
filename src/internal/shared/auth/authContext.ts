import {
  isAuthApiError,
  isAuthSessionMissingError,
} from "@supabase/supabase-js";

import { sharedErrorMessages } from "internal/shared/errors/sharedErrorMessages";
import {
  AuthenticationError,
  RepositoryError,
} from "internal/shared/errors/appError";
import type { Logger } from "internal/shared/logging/logger";
import type { AuthenticatedSupabaseClient } from "internal/shared/supabase/authenticatedClient";

export type AuthContext =
  | { isAuthenticated: true; userId: string; email: string | null }
  | { isAuthenticated: false; userId: null; email: null };

/**
 * 读取当前请求的登录状态。供多个业务模块复用的认证基础能力，
 * 不属于 auth 业务模块本身（登录 / 注册 / OTP 等）。
 */
export async function getAuthContext(
  supabase: AuthenticatedSupabaseClient,
  logger: Logger,
): Promise<AuthContext> {
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) throw error;

    if (!user) {
      return { email: null, isAuthenticated: false, userId: null };
    }

    return { email: user.email ?? null, isAuthenticated: true, userId: user.id };
  } catch (error) {
    if (
      isAuthSessionMissingError(error) ||
      (isAuthApiError(error) &&
        (error.status === 401 || error.status === 403))
    ) {
      return { email: null, isAuthenticated: false, userId: null };
    }

    logger.error("[auth] getUser failed", {
      errorName: error instanceof Error ? error.name : "unknown",
      ...(isAuthApiError(error) ? { status: error.status } : {}),
    });
    throw new RepositoryError(
      "auth_unavailable",
      sharedErrorMessages.authUnavailable,
    );
  }
}

/**
 * Controller 和其他请求边界统一使用这一窄函数读取已认证用户 ID，
 * 避免各模块重复实现相同的登录状态判断。
 */
export async function requireAuthenticatedUserId(
  getAuth: () => Promise<AuthContext>,
): Promise<string> {
  const auth = await getAuth();

  if (!auth.isAuthenticated) {
    throw new AuthenticationError(
      "auth_required",
      sharedErrorMessages.authRequired,
    );
  }

  return auth.userId;
}
