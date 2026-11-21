// @vitest-environment node

import { OpenAPIHono } from "@hono/zod-openapi";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AppEnv } from "internal/appEnv";
import type { RequestContainer } from "internal/container";
import { errorHandlingMiddleware } from "internal/shared/http/errorResponse";
import { sameOriginMiddleware } from "internal/shared/middleware/sameOriginMiddleware";
import { maintenanceRouter } from "./router";

afterEach(() => { vi.unstubAllEnvs(); });
function createApp(cleanup = vi.fn().mockResolvedValue({ checked: 2, removed: 1, failed: 1 })) {
  const app = new OpenAPIHono<AppEnv>();
  app.use("*", async (c, next) => {
    c.set("requestId", "test-request");
    c.set("container", { maintenance: { cleanup } } as unknown as RequestContainer);
    await next();
  });
  app.use("*", sameOriginMiddleware);
  app.onError(errorHandlingMiddleware);
  app.route("/cron", maintenanceRouter);
  return { app, cleanup };
}

describe("photo cleanup route", () => {
  it("没带凭证返回401且不执行维护", async () => {
    vi.stubEnv("CRON_SECRET", "a-secret");
    const { app, cleanup } = createApp();
    const res = await app.request("/cron/photo-cleanup");
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: {
      code: "cron_unauthorized", message: "未授权的定时任务。",
      status: 401, requestId: "test-request",
    } });
    expect(cleanup).not.toHaveBeenCalled();
  });
  it("错误凭证和缺少环境密钥均返回401", async () => {
    vi.stubEnv("CRON_SECRET", "a-secret");
    const { app, cleanup } = createApp();
    const bad = await app.request("/cron/photo-cleanup", {
      headers: { authorization: "Bearer wrong" },
    });
    expect(bad.status).toBe(401);
    vi.stubEnv("CRON_SECRET", "");
    const unset = await app.request("/cron/photo-cleanup", {
      headers: { authorization: "Bearer a-secret" },
    });
    expect(unset.status).toBe(401);
    expect(cleanup).not.toHaveBeenCalled();
  });
  it("正确密钥且不带Origin的GET允许清理", async () => {
    vi.stubEnv("CRON_SECRET", "a-secret");
    const { app, cleanup } = createApp();
    const res = await app.request("/cron/photo-cleanup", {
      headers: { authorization: "Bearer a-secret" },
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ checked: 2, removed: 1, failed: 1 });
    expect(cleanup).toHaveBeenCalledOnce();
  });
});
