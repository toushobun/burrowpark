import type { ControllerContext } from "internal/shared/http/controllerContext";

/** 存活检查：不访问数据库，只确认 API 层与请求上下文正常工作。 */
export const getHealthHandler = (c: ControllerContext) =>
  c.json({ requestId: c.get("requestId"), status: "ok" as const }, 200);
