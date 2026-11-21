import { z } from "@hono/zod-openapi";

export const photoCleanupResponseSchema = z
  .object({
    checked: z.number().int().nonnegative(),
    removed: z.number().int().nonnegative(),
    failed: z.number().int().nonnegative(),
  })
  .openapi("PhotoCleanupResponse");

export const errorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    details: z.unknown().optional(),
    message: z.string(),
    requestId: z.string().optional(),
    status: z.number(),
  }),
});
