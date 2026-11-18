// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

import { sharedErrorMessages } from "internal/shared/errors/sharedErrorMessages";

const getUserMock = vi.hoisted(() => vi.fn());

vi.mock("internal/shared/supabase/authenticatedClient", () => ({
  createAuthenticatedSupabaseClient: vi.fn().mockResolvedValue({
    auth: { getUser: getUserMock },
  }),
}));

import { apiRouter } from "internal/router";

const healthUrl = "https://burrowpark.example/api/health";
const sameOrigin = "https://burrowpark.example";

beforeEach(() => {
  getUserMock.mockClear();
});

describe("apiRouter", () => {
  it("跨源 POST 返回统一 403 且不泄露内部信息", async () => {
    const response = await apiRouter.request(healthUrl, {
      body: "{}",
      headers: {
        "content-type": "application/json",
        origin: "https://evil.example",
      },
      method: "POST",
    });

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      error: {
        code: "forbidden",
        message: sharedErrorMessages.originInvalid,
        requestId: expect.any(String),
        status: 403,
      },
    });
  });

  it("同源损坏的 JSON 请求返回统一 400", async () => {
    const response = await apiRouter.request(healthUrl, {
      body: "{",
      headers: {
        "content-type": "application/json",
        origin: sameOrigin,
      },
      method: "POST",
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: {
        code: "validation_error",
        message: sharedErrorMessages.validationInvalid,
        requestId: expect.any(String),
        status: 400,
      },
    });
  });

  it("GET 不受同源校验影响，health 不触发 getUser", async () => {
    const response = await apiRouter.request(healthUrl);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      requestId: expect.any(String),
      status: "ok",
    });
    expect(getUserMock).not.toHaveBeenCalled();
  });
});
