// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const getUserMock = vi.hoisted(() =>
  vi.fn().mockResolvedValue({
    data: { user: { email: "a@b.com", id: "u1" } },
    error: null,
  }),
);

vi.mock("internal/shared/supabase/authenticatedClient", () => ({
  createAuthenticatedSupabaseClient: vi.fn().mockResolvedValue({
    auth: { getUser: getUserMock },
  }),
}));

import { createRequestDependencies } from "internal/shared/context/requestDependencies";

beforeEach(() => {
  getUserMock.mockClear();
});

describe("createRequestDependencies", () => {
  it("组装 requestId、logger、getAuth 和 supabase，初始不读取认证", async () => {
    const dependencies = await createRequestDependencies();

    expect(dependencies.requestId).toEqual(expect.any(String));
    expect(dependencies.getAuth).toEqual(expect.any(Function));
    expect(dependencies.logger).toBeDefined();
    expect(dependencies.supabase).toBeDefined();
    expect(getUserMock).not.toHaveBeenCalled();
  });

  it("同一请求 getAuth 调用两次只发起一次 getUser", async () => {
    const dependencies = await createRequestDependencies();

    const first = dependencies.getAuth();
    const second = dependencies.getAuth();

    expect(first).toBe(second);
    await expect(first).resolves.toEqual({
      email: "a@b.com",
      isAuthenticated: true,
      userId: "u1",
    });
    expect(getUserMock).toHaveBeenCalledOnce();
  });

  it("每次调用生成不同的 requestId 与认证缓存", async () => {
    const first = await createRequestDependencies();
    const second = await createRequestDependencies();

    expect(first.requestId).not.toBe(second.requestId);
    await Promise.all([first.getAuth(), second.getAuth()]);
    expect(getUserMock).toHaveBeenCalledTimes(2);
  });
});
