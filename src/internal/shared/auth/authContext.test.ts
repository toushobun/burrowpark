// @vitest-environment node

import {
  AuthApiError,
  AuthRetryableFetchError,
  AuthSessionMissingError,
} from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import {
  getAuthContext,
  requireAuthenticatedUserId,
} from "internal/shared/auth/authContext";
import { RepositoryError } from "internal/shared/errors/appError";
import { sharedErrorMessages } from "internal/shared/errors/sharedErrorMessages";
import type { Logger } from "internal/shared/logging/logger";
import type { AuthenticatedSupabaseClient } from "internal/shared/supabase/authenticatedClient";

function createSupabaseStub(
  user: { id: string; email?: string } | null,
  error: Error | null = null,
) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user }, error }),
    },
  } as unknown as AuthenticatedSupabaseClient;
}

function createLoggerStub(): Logger {
  return { error: vi.fn(), info: vi.fn(), warn: vi.fn() };
}

describe("getAuthContext", () => {
  it("已登录时返回 isAuthenticated: true 与用户信息", async () => {
    const supabase = createSupabaseStub({
      email: "user@example.com",
      id: "user-1",
    });

    await expect(getAuthContext(supabase, createLoggerStub())).resolves.toEqual(
      {
        email: "user@example.com",
        isAuthenticated: true,
        userId: "user-1",
      },
    );
  });

  it("没有用户时返回 isAuthenticated: false", async () => {
    const supabase = createSupabaseStub(null);

    await expect(getAuthContext(supabase, createLoggerStub())).resolves.toEqual(
      {
        email: null,
        isAuthenticated: false,
        userId: null,
      },
    );
  });

  it("会话缺失时视为未登录", async () => {
    const supabase = createSupabaseStub(null, new AuthSessionMissingError());

    await expect(getAuthContext(supabase, createLoggerStub())).resolves.toEqual(
      {
        email: null,
        isAuthenticated: false,
        userId: null,
      },
    );
  });

  it.each([400, 401, 403, 404])(
    "AuthApiError %i 时视为未登录",
    async (status) => {
      const supabase = createSupabaseStub(
        null,
        new AuthApiError("session rejected", status, "invalid_session"),
      );

      await expect(
        getAuthContext(supabase, createLoggerStub()),
      ).resolves.toEqual({
        email: null,
        isAuthenticated: false,
        userId: null,
      });
    },
  );

  it.each([
    new AuthRetryableFetchError("x", 0),
    new AuthApiError("x", 500, "unexpected_failure"),
  ])("Supabase 服务异常 %s 抛出 RepositoryError", async (error) => {
    const logger = createLoggerStub();
    const supabase = createSupabaseStub(null, error);

    await expect(getAuthContext(supabase, logger)).rejects.toMatchObject({
      code: "auth_unavailable",
      message: sharedErrorMessages.authUnavailable,
    });
    expect(logger.error).toHaveBeenCalledOnce();
  });

  it("网络错误抛出安全的 RepositoryError 并记录安全字段", async () => {
    const supabase = createSupabaseStub(null, new Error("secret-network-info"));
    const logger = createLoggerStub();

    await expect(getAuthContext(supabase, logger)).rejects.toMatchObject({
      code: "auth_unavailable",
      message: sharedErrorMessages.authUnavailable,
    });
    expect(logger.error).toHaveBeenCalledWith("[auth] getUser failed", {
      errorName: "Error",
    });
    expect(JSON.stringify(vi.mocked(logger.error).mock.calls)).not.toContain(
      "secret-network-info",
    );
  });

  it("意外抛出的错误也转换为 RepositoryError", async () => {
    const supabase = createSupabaseStub(null);
    vi.spyOn(supabase.auth, "getUser").mockRejectedValue(
      new Error("network down"),
    );

    await expect(
      getAuthContext(supabase, createLoggerStub()),
    ).rejects.toBeInstanceOf(RepositoryError);
  });
});

describe("requireAuthenticatedUserId", () => {
  it("惰性读取认证上下文并返回用户 ID", async () => {
    const getAuth = vi.fn().mockResolvedValue({
      email: null,
      isAuthenticated: true,
      userId: "u1",
    });

    await expect(requireAuthenticatedUserId(getAuth)).resolves.toBe("u1");
    expect(getAuth).toHaveBeenCalledOnce();
  });

  it("未登录时抛出 AuthenticationError", async () => {
    await expect(
      requireAuthenticatedUserId(async () => ({
        email: null,
        isAuthenticated: false,
        userId: null,
      })),
    ).rejects.toMatchObject({ code: "auth_required" });
  });
});
