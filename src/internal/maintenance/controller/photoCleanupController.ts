import { createHash, timingSafeEqual } from "node:crypto";

import type { ControllerContext } from "internal/shared/http/controllerContext";
import { AuthenticationError } from "internal/shared/errors/appError";
import { maintenanceMessages } from "../errors";

/** 固定长度摘要再常数时间比较，避免因 Bearer 长度不同泄漏匹配信息。 */
export function isAuthorizedCron(
  header: string | undefined,
  secret: string | undefined,
): boolean {
  if (!secret) return false;
  const expected = createHash("sha256")
    .update("Bearer " + secret)
    .digest();
  const actual = createHash("sha256")
    .update(header ?? "")
    .digest();
  return timingSafeEqual(expected, actual);
}

export const getPhotoCleanupHandler = async (c: ControllerContext) => {
  if (!isAuthorizedCron(c.req.header("authorization"), process.env.CRON_SECRET))
    throw new AuthenticationError(
      "cron_unauthorized",
      maintenanceMessages.unauthorized,
    );
  const result = await c.get("container").maintenance.cleanup();
  return c.json(result, 200);
};
