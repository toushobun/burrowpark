import { z } from "zod";

import { ValidationError } from "internal/shared/errors/appError";

import { parkingMessages } from "./errors";
import { getBusinessMonth, normalizePlate } from "./util/parkingDomain";

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

const paymentMethodSchema = z.enum(["wechat", "alipay", "cash"]);
const slotCodeSchema = z.string().regex(/^\d+$/, parkingMessages.invalidInput);

export const renewInputSchema = z
  .object({
    slotCode: slotCodeSchema,
    mode: z.enum(["hotel_daily", "lease"]),
    days: z.number().int().min(1).max(30).optional(),
    endDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    paymentMethod: paymentMethodSchema,
    amountYuan: amountSchema,
  })
  .superRefine((value, ctx) => {
    if (
      (value.mode === "hotel_daily" && value.days === undefined) ||
      (value.mode === "lease" && !value.endDate) ||
      (value.mode === "hotel_daily" && value.endDate !== undefined) ||
      (value.mode === "lease" && value.days !== undefined)
    ) {
      ctx.addIssue({ code: "custom", message: parkingMessages.invalidInput });
    }
  });
export type RenewInput = z.infer<typeof renewInputSchema>;

export const checkOutInputSchema = z
  .object({
    sessionId: z.string().uuid(),
    paymentMethod: paymentMethodSchema.optional(),
    amountYuan: amountSchema.optional(),
  })
  .superRefine((value, ctx) => {
    if (Boolean(value.paymentMethod) !== Boolean(value.amountYuan)) {
      ctx.addIssue({
        code: "custom",
        message: parkingMessages.paymentRequired,
      });
    }
  });
export type CheckOutInput = z.infer<typeof checkOutInputSchema>;

export function parseRenewInput(input: unknown): RenewInput {
  const result = renewInputSchema.safeParse(input);
  if (!result.success)
    throw new ValidationError(
      "renew_invalid",
      result.error.issues[0]?.message ?? parkingMessages.invalidInput,
    );
  return result.data;
}
export function parseCheckOutInput(input: unknown): CheckOutInput {
  const result = checkOutInputSchema.safeParse(input);
  if (!result.success)
    throw new ValidationError(
      "checkout_invalid",
      result.error.issues[0]?.message ?? parkingMessages.invalidInput,
    );
  return result.data;
}
export function readRenewFormData(data: FormData): unknown {
  const days = data.get("days");
  return {
    slotCode: data.get("slotCode"),
    mode: data.get("mode"),
    days: days === null || days === "" ? undefined : Number(days),
    endDate: data.get("endDate") || undefined,
    paymentMethod: data.get("paymentMethod"),
    amountYuan: data.get("amountYuan"),
  };
}
export function readCheckOutFormData(data: FormData): unknown {
  return {
    sessionId: data.get("sessionId"),
    amountYuan: data.get("amountYuan") || undefined,
    paymentMethod: data.get("paymentMethod") || undefined,
  };
}

const optionalNote = z
  .string()
  .trim()
  .max(500)
  .transform((value) => value || null);
const optionalPhone = z
  .string()
  .trim()
  .max(50)
  .transform((value) => value || null);
const optionalPlate = z
  .string()
  .trim()
  .transform(normalizePlate)
  .refine((value) => !value || (value.length >= 2 && value.length <= 10), {
    message: parkingMessages.invalidPlate,
  })
  .transform((value) => value || null);
const businessDay = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, parkingMessages.invalidInput);
const tenantName = z
  .string()
  .trim()
  .min(1, parkingMessages.invalidInput)
  .max(100);

export const createLeaseInputSchema = z.object({
  slotCode: slotCodeSchema,
  tenantName,
  phone: optionalPhone,
  plate: optionalPlate,
  startsOn: businessDay,
  note: optionalNote,
  paidThrough: businessDay,
  paymentMethod: paymentMethodSchema,
  amountYuan: amountSchema,
});
export const editLeaseInputSchema = z.object({
  leaseId: z.string().uuid(),
  slotCode: slotCodeSchema,
  tenantName,
  phone: optionalPhone,
  plate: optionalPlate,
  note: optionalNote,
});
export const endLeaseInputSchema = z.object({
  leaseId: z.string().uuid(),
  endedOn: businessDay,
});
export const reserveInputSchema = z.object({
  slotCode: slotCodeSchema,
  guestName: z
    .string()
    .trim()
    .max(100)
    .transform((value) => value || null),
  note: optionalNote,
});
export const borrowExtensionSchema = z.object({
  sessionId: z.string().uuid(),
  minutes: z.union([z.literal(10), z.literal(30)]),
});
export const borrowUndoSchema = z.object({
  sessionId: z.string().uuid(),
  previous: z.string().datetime({ offset: true }),
  expectedCurrent: z.string().datetime({ offset: true }),
});

/** 所有新操作复用单一 Zod 错误出口。 */
export function parseParkingOperation<T extends z.ZodType>(
  schema: T,
  input: unknown,
): z.infer<T> {
  const result = schema.safeParse(input);
  if (!result.success)
    throw new ValidationError(
      "operation_invalid",
      result.error.issues[0]?.message ?? parkingMessages.invalidInput,
    );
  return result.data;
}

export function readParkingOperationFormData(formData: FormData): unknown {
  const minutes = formData.get("minutes");
  return {
    slotCode: formData.get("slotCode"),
    leaseId: formData.get("leaseId"),
    reservationId: formData.get("reservationId"),
    sessionId: formData.get("sessionId"),
    tenantName: formData.get("tenantName"),
    phone: formData.get("phone") ?? "",
    plate: formData.get("plate") ?? "",
    startsOn: formData.get("startsOn"),
    endedOn: formData.get("endedOn"),
    paidThrough: formData.get("paidThrough"),
    note: formData.get("note") ?? "",
    guestName: formData.get("guestName") ?? "",
    amountYuan: formData.get("amountYuan"),
    paymentMethod: formData.get("paymentMethod"),
    minutes: minutes === null || minutes === "" ? undefined : Number(minutes),
    previous: formData.get("previous"),
    expectedCurrent: formData.get("expectedCurrent"),
  };
}

export const slotSettingsInputSchema = z.object({
  code: z.string().regex(/^\d+$/, parkingMessages.invalidInput),
  kind: z.enum(["regular", "private"]),
  isActive: z.boolean(),
});
export type SlotSettingsInput = z.infer<typeof slotSettingsInputSchema>;
export function parseSlotSettingsInput(input: unknown): SlotSettingsInput {
  const result = slotSettingsInputSchema.safeParse(input);
  if (!result.success)
    throw new ValidationError(
      "slot_settings_invalid",
      result.error.issues[0]?.message ?? parkingMessages.invalidInput,
    );
  return result.data;
}
export function readSlotSettingsFormData(form: FormData): unknown {
  return {
    code: form.get("code"),
    kind: form.get("kind"),
    isActive: form.get("isActive") === "true",
  };
}

/** URL 月份格式不合法或缺省时回退上海本月。 */
const businessMonthSchema = z
  .string()
  .regex(/^[1-9][0-9]{3}-(?:0[1-9]|1[0-2])$/);

export function parseMonthlyStatsMonth(input: unknown, now: Date): string {
  const result = businessMonthSchema.safeParse(input);
  return result.success ? result.data : getBusinessMonth(now);
}
