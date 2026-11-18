import { createRoute, OpenAPIHono } from "@hono/zod-openapi";

import type { AppEnv } from "internal/appEnv";
import { getHealthHandler } from "internal/health/controller/healthController";
import {
  errorResponseSchema,
  healthResponseSchema,
} from "internal/health/schema";
import { createOpenApiErrorResponses } from "internal/shared/http/openApiErrorResponses";

const errorResponses = createOpenApiErrorResponses(errorResponseSchema, [
  500,
] as const);

export const getHealthRoute = createRoute({
  method: "get",
  path: "/",
  responses: {
    200: {
      content: { "application/json": { schema: healthResponseSchema } },
      description: "服务正常",
    },
    ...errorResponses,
  },
});

export const healthRouter = new OpenAPIHono<AppEnv>();

healthRouter.openapi(getHealthRoute, getHealthHandler);
