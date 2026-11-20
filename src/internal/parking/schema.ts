import { z } from "zod";

import { ValidationError } from "internal/shared/errors/appError";

import { parkingMessages } from "./errors";
import { normalizePlate } from "./util/parkingDomain";

const amountSchema = z.string().regex(/^(?:0|[1-9]\d{0,7})(?:\.\d{1,2})?$/, {
  message: parkingMessages.invalidAmount,
});

export const checkInInputSchema = z
  .object({
    slotCode: z.string().regex(/^\d+$/, parkingMessages.invalidInput),
    plate: z
      .string()
      .transform(normalizePlate)
      .refine((value) => value.length >= 2 && value.length <= 10, {
        message: parkingMessages.invalidPlate,
      }),
    billingType: z.enum(["hotel_daily", "hourly", "lease", "free"]),
    days: z.number().int().min(1).max(30).optional(),
    borrowMinutes: z.union([z.literal(10), z.literal(30)]).optional(),
    paymentMethod: z.enum(["wechat", "alipay", "cash"]).optional(),
    amountYuan: amountSchema.optional(),
  })
  .superRefine((value, ctx) => {
    const hotel = value.billingType === "hotel_daily";
    if (hotel && value.days === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["days"],
        message: parkingMessages.invalidDays,
      });
    }
    if (hotel && (!value.paymentMethod || !value.amountYuan)) {
      ctx.addIssue({
        code: "custom",
        path: ["paymentMethod"],
        message: parkingMessages.paymentRequired,
      });
    }
    if (
      !hotel &&
      (value.days !== undefined || value.paymentMethod || value.amountYuan)
    ) {
      ctx.addIssue({ code: "custom", message: parkingMessages.invalidInput });
    }
  });

export type CheckInInput = z.infer<typeof checkInInputSchema>;

export function parseCheckInInput(input: unknown): CheckInInput {
  const result = checkInInputSchema.safeParse(input);
  if (!result.success) {
    throw new ValidationError(
      "check_in_invalid",
      result.error.issues[0]?.message ?? parkingMessages.invalidInput,
    );
  }
  return result.data;
}

export function parseUndoSessionId(value: unknown): string {
  const result = z.string().uuid().safeParse(value);
  if (!result.success) {
    throw new ValidationError("undo_invalid", parkingMessages.invalidInput);
  }
  return result.data;
}

/** FormData 到业务输入的唯一转换处；完整规则仍由 Service 的 zod 检查。 */
export function readCheckInFormData(formData: FormData): unknown {
  const days = formData.get("days");
  const borrowMinutes = formData.get("borrowMinutes");
  return {
    slotCode: formData.get("slotCode"),
    plate: formData.get("plate"),
    billingType: formData.get("billingType"),
    days: days === null || days === "" ? undefined : Number(days),
    borrowMinutes:
      borrowMinutes === null || borrowMinutes === ""
        ? undefined
        : Number(borrowMinutes),
    paymentMethod: formData.get("paymentMethod") || undefined,
    amountYuan: formData.get("amountYuan") || undefined,
  };
}

/** 十进制字符串逐位转分，不经浮点乘法以免产生精度误差。 */
export function parseAmountCents(value: string): number {
  const [yuan, fraction = ""] = value.split(".");
  const cents = Number(yuan) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(cents) || cents <= 0 || cents > 2147483647) {
    throw new ValidationError("amount_invalid", parkingMessages.invalidAmount);
  }
  return cents;
}
