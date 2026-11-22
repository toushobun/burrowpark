import { z } from "zod";

const checkInParamsSchema = z.object({
  checkedIn: z.string().min(1),
  session: z.uuid(),
  photo: z.literal("0").optional(),
});

export type HomeCheckInParams = {
  code: string;
  sessionId: string;
  photoSaved: boolean;
};

/** URL 只用于定位本次登记，车牌和实际会话归属必须在服务端重新读取。 */
export function parseCheckInParams(
  params: Record<string, string | string[] | undefined>,
  availableCodes: readonly string[],
): HomeCheckInParams | null {
  const result = checkInParamsSchema.safeParse(params);
  if (!result.success || !availableCodes.includes(result.data.checkedIn)) {
    return null;
  }
  return {
    code: result.data.checkedIn,
    sessionId: result.data.session,
    photoSaved: result.data.photo !== "0",
  };
}
