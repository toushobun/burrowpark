import { z } from "zod";

const slot = z.string().min(1);
const id = z.uuid();

const operationParamsSchema = z.discriminatedUnion("done", [
  z.strictObject({
    done: z.literal("checkin"),
    slot,
    id,
    photo: z.literal("0").optional(),
  }),
  z.strictObject({ done: z.literal("reserve"), slot, id }),
  z.strictObject({ done: z.literal("lease"), slot, id }),
]);

export type OperationParams = z.infer<typeof operationParamsSchema>;

/** 只解析操作定位信息；实际操作结果必须用服务器车位数据再次验证。 */
export function parseOperationParams(
  params: Record<string, string | string[] | undefined>,
  availableCodes: readonly string[],
): OperationParams | null {
  const result = operationParamsSchema.safeParse(params);
  if (!result.success || !availableCodes.includes(result.data.slot)) {
    return null;
  }
  return result.data;
}
