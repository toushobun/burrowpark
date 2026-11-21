import { createRoute, OpenAPIHono } from "@hono/zod-openapi";

import type { AppEnv } from "internal/appEnv";
import { getPhotoCleanupHandler } from "./controller/photoCleanupController";
import { errorResponseSchema, photoCleanupResponseSchema } from "./schema";
import { createOpenApiErrorResponses } from "internal/shared/http/openApiErrorResponses";

export const getPhotoCleanupRoute = createRoute({
  method: "get",
  path: "/photo-cleanup",
  responses: {
    200: {
      content: { "application/json": { schema: photoCleanupResponseSchema } },
      description: "已尝试清理过期照片",
    },
    ...createOpenApiErrorResponses(errorResponseSchema, [401, 500] as const),
  },
});

export const maintenanceRouter = new OpenAPIHono<AppEnv>();
maintenanceRouter.openapi(getPhotoCleanupRoute, getPhotoCleanupHandler);
