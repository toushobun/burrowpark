import { z } from "@hono/zod-openapi";

export const healthResponseSchema = z
  .object({
    requestId: z.string(),
    status: z.literal("ok"),
  })
  .openapi("HealthResponse");

export const errorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    details: z.unknown().optional(),
    message: z.string(),
    requestId: z.string().optional(),
    status: z.number(),
  }),
});
