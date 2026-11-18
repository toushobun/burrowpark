// @vitest-environment node

import { OpenAPIHono } from "@hono/zod-openapi";
import { describe, expect, it, vi } from "vitest";

import type { AppEnv } from "internal/appEnv";
import type { RequestContainer } from "internal/container";
import { healthRouter } from "internal/health/router";
import {
  errorHandlingMiddleware,
  openApiValidationErrorHook,
} from "internal/shared/http/errorResponse";

function createApp() {
  const app = new OpenAPIHono<AppEnv>({
    defaultHook: openApiValidationErrorHook,
  });

  app.use("*", async (c, next) => {
    c.set("container", {} as RequestContainer);
    c.set("requestDependencies", {
      auth: { email: null, isAuthenticated: false, userId: null },
      logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
      requestId: "request-1",
      supabase: {} as never,
    });
    c.set("requestId", "request-1");
    await next();
  });
  app.onError(errorHandlingMiddleware);
  app.route("/health", healthRouter);

  return app;
}

describe("healthRouter", () => {
  it("未登录也返回 200 与 requestId", async () => {
    const response = await createApp().request("/health");

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      requestId: "request-1",
      status: "ok",
    });
  });

  it("未知路径交给上层处理而不是返回健康状态", async () => {
    const response = await createApp().request("/health/unknown");

    expect(response.status).toBe(404);
  });
});
