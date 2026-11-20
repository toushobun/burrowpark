import type { SlotStatus } from "theme/slotStatusTokens";
import type {
  ParkingPricingSettings,
  ParkingTimestamp,
  SlotStatusFacts,
} from "../entity/parkingDomain";

const BUSINESS_TIMEZONE_OFFSET_MS = 8 * 60 * 60 * 1000;
const HOUR_IN_MS = 60 * 60 * 1000;

export const LEASE_EXPIRING_SOON_DAYS = 3;
export const PRIVATE_BORROW_REMINDER_MINUTES = 5;

const parseTimestamp = (value: ParkingTimestamp): Date => {
  if (
    typeof value === "string" &&
    !/(?:Z|[+-][0-9]{2}:[0-9]{2})$/i.test(value)
  ) {
    throw new RangeError("时间字符串必须明确指定时区。");
  }

  const date =
    value instanceof Date ? new Date(value.getTime()) : new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new RangeError("时间无效。");
  }

  return date;
};

const parseBusinessDate = (businessDate: string): Date => {
  if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(businessDate)) {
    throw new RangeError("业务日期必须使用 YYYY-MM-DD 格式。");
  }

  const date = new Date(businessDate + "T00:00:00.000Z");

  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== businessDate
  ) {
    throw new RangeError("业务日期无效。");
  }

  return date;
};

const assertHour = (hour: number, fieldName: string): void => {
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) {
    throw new RangeError(fieldName + " 必须是 0 至 23 的整数。");
  }
};

const addBusinessDays = (businessDate: string, days: number): string => {
  const date = parseBusinessDate(businessDate);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

const getBusinessHour = (instant: ParkingTimestamp): number => {
  const shifted = new Date(
    parseTimestamp(instant).getTime() + BUSINESS_TIMEZONE_OFFSET_MS,
  );

  return shifted.getUTCHours();
};

/** 将时间点转换为 Asia/Shanghai 的业务日期。 */
export const getBusinessDate = (instant: ParkingTimestamp): string => {
  const shifted = new Date(
    parseTimestamp(instant).getTime() + BUSINESS_TIMEZONE_OFFSET_MS,
  );

  return shifted.toISOString().slice(0, 10);
};

/** 将业务时间点格式化为「12:30」。 */
export const formatBusinessTime = (instant: ParkingTimestamp): string => {
  const shifted = new Date(
    parseTimestamp(instant).getTime() + BUSINESS_TIMEZONE_OFFSET_MS,
  );
  const hour = String(shifted.getUTCHours()).padStart(2, "0");
  const minute = String(shifted.getUTCMinutes()).padStart(2, "0");

  return hour + ":" + minute;
};

/** 将业务时间点格式化为「11月19日 12:00」。 */
export const formatBusinessDateTime = (instant: ParkingTimestamp): string => {
  const shifted = new Date(
    parseTimestamp(instant).getTime() + BUSINESS_TIMEZONE_OFFSET_MS,
  );
  return (
    String(shifted.getUTCMonth() + 1) +
    "月" +
    String(shifted.getUTCDate()) +
    "日 " +
    formatBusinessTime(instant)
  );
};

/** 将业务时间点格式化为「11月19日」。 */
export const formatBusinessDate = (instant: ParkingTimestamp): string => {
  const shifted = new Date(
    parseTimestamp(instant).getTime() + BUSINESS_TIMEZONE_OFFSET_MS,
  );

  return (
    String(shifted.getUTCMonth() + 1) +
    "月" +
    String(shifted.getUTCDate()) +
    "日"
  );
};

/** 按完整经过的分钟显示停车时长，不足一分钟时向下取整。 */
export const formatElapsed = (
  from: ParkingTimestamp,
  now: ParkingTimestamp,
): string => {
  const elapsedMinutes = Math.max(
    0,
    Math.floor(
      (parseTimestamp(now).getTime() - parseTimestamp(from).getTime()) / 60000,
    ),
  );
  const hours = Math.floor(elapsedMinutes / 60);
  const minutes = elapsedMinutes % 60;

  return hours
    ? "已停 " + hours + " 小时 " + minutes + " 分"
    : "已停 " + minutes + " 分";
};

/** 将业务日期的指定整点转换为 UTC ISO 时间，可直接作为 timestamptz 使用。 */
export const getBusinessDateTime = (
  businessDate: string,
  hour: number,
): string => {
  assertHour(hour, "hour");

  const date = parseBusinessDate(businessDate);
  return new Date(
    date.getTime() + hour * HOUR_IN_MS - BUSINESS_TIMEZONE_OFFSET_MS,
  ).toISOString();
};

/** 根据进场时间、住宿天数和计费设置计算酒店客交到时间。 */
export const calculateHotelCheckoutAt = (
  enteredAt: ParkingTimestamp,
  days: number,
  settings: Pick<
    ParkingPricingSettings,
    "hotel_checkout_hour" | "hotel_previous_day_before_hour"
  >,
): string => {
  if (!Number.isInteger(days) || days < 1) {
    throw new RangeError("住宿天数必须是正整数。");
  }

  assertHour(settings.hotel_checkout_hour, "hotel_checkout_hour");
  assertHour(
    settings.hotel_previous_day_before_hour,
    "hotel_previous_day_before_hour",
  );

  const enteredBusinessDate = getBusinessDate(enteredAt);
  const baseBusinessDate =
    getBusinessHour(enteredAt) < settings.hotel_previous_day_before_hour
      ? addBusinessDays(enteredBusinessDate, -1)
      : enteredBusinessDate;

  return getBusinessDateTime(
    addBusinessDays(baseBusinessDate, days),
    settings.hotel_checkout_hour,
  );
};

/** 按小时向上取整计算临停建议金额，最低按一小时收费。 */
export const calculateHourlySuggestedAmountCents = (
  durationMinutes: number,
  settings: Pick<ParkingPricingSettings, "hourly_price_cents">,
): number => {
  if (!Number.isFinite(durationMinutes) || durationMinutes < 0) {
    throw new RangeError("停车时长必须是非负有限数值。");
  }

  if (
    !Number.isSafeInteger(settings.hourly_price_cents) ||
    settings.hourly_price_cents <= 0
  ) {
    throw new RangeError("hourly_price_cents 必须是正整数。");
  }

  const billableHours = Math.max(1, Math.ceil(durationMinutes / 60));
  const amount = billableHours * settings.hourly_price_cents;

  if (!Number.isSafeInteger(amount)) {
    throw new RangeError("建议金额超出安全整数范围。");
  }

  return amount;
};

/** 规范化车牌存储值：转大写并移除间隔符和空白字符。 */
export const normalizePlate = (plate: string): string =>
  plate.replace(/[·\s\u3000]/gu, "").toUpperCase();

/** 格式化车牌显示值：在规范化车牌的第二位后插入间隔符。 */
export const formatPlateForDisplay = (plate: string): string => {
  const normalizedPlate = normalizePlate(plate);

  if (normalizedPlate.length <= 2) {
    return normalizedPlate;
  }

  return normalizedPlate.slice(0, 2) + "·" + normalizedPlate.slice(2);
};

/** 根据车位事实和当前时刻推导地图、列表共用的显示状态。 */
export const deriveSlotStatus = (
  facts: SlotStatusFacts,
  now: ParkingTimestamp,
): SlotStatus => {
  const nowDate = parseTimestamp(now);
  const nowTime = nowDate.getTime();

  if (facts.present_vehicle) {
    if (facts.kind === "private") {
      const borrowUntil = facts.present_vehicle.borrow_until;

      return borrowUntil && nowTime >= parseTimestamp(borrowUntil).getTime()
        ? "overdue"
        : "privateBorrowed";
    }

    if (
      facts.present_vehicle.billing_type === "hotel_daily" ||
      facts.present_vehicle.billing_type === "lease"
    ) {
      const paidUntil = facts.present_vehicle.paid_until;

      if (paidUntil) {
        const paidUntilDate = parseTimestamp(paidUntil);

        if (nowTime >= paidUntilDate.getTime()) {
          return "overdue";
        }

        const paidUntilBusinessDate = getBusinessDate(paidUntilDate);
        const currentBusinessDate = getBusinessDate(nowDate);
        const expiringSoon =
          facts.present_vehicle.billing_type === "lease"
            ? paidUntilBusinessDate <=
              addBusinessDays(currentBusinessDate, LEASE_EXPIRING_SOON_DAYS)
            : paidUntilBusinessDate === currentBusinessDate;

        if (expiringSoon) {
          return "expiringSoon";
        }
      }
    }

    return "occupied";
  }

  if (facts.has_open_reservation) {
    return "reserved";
  }

  if (facts.active_lease) {
    const paidUntil = facts.active_lease.paid_until;

    return paidUntil && nowTime >= parseTimestamp(paidUntil).getTime()
      ? "overdue"
      : "leaseAway";
  }

  return facts.kind === "private" ? "privateIdle" : "empty";
};

/** 酒店客以原交到时间顺延，已过期也不改用当前时刻。 */
export const extendHotelPaidUntil = (
  paidUntil: ParkingTimestamp,
  days: number,
): string => {
  if (!Number.isInteger(days) || days < 1 || days > 30) {
    throw new RangeError("续费天数应在 1～30 天内。");
  }
  return new Date(
    parseTimestamp(paidUntil).getTime() + days * 24 * HOUR_IN_MS,
  ).toISOString();
};

/** 月末日期顺延至下月的最后有效日期，按上海业务日期计算。 */
export const nextLeaseRenewDate = (paidUntil: ParkingTimestamp): string => {
  const current = parseBusinessDate(getBusinessDate(paidUntil));
  const year = current.getUTCFullYear();
  const month = current.getUTCMonth();
  const next = new Date(Date.UTC(year, month + 1, 1));
  const last = new Date(Date.UTC(year, month + 2, 0)).getUTCDate();
  next.setUTCDate(Math.min(current.getUTCDate(), last));
  return next.toISOString().slice(0, 10);
};

/** 选中的长租到期日一律结束于上海时间 23:59:59。 */
export const leaseDateToPaidUntil = (businessDate: string): string =>
  new Date(
    Date.parse(getBusinessDateTime(businessDate, 0)) + 86400000 - 1000,
  ).toISOString();

/** 超时不足一天按一天计费；不足一小时也向上取整显示。 */
export const calculateHotelOverstay = (
  paidUntil: ParkingTimestamp,
  now: ParkingTimestamp,
  dailyPriceCents: number,
): { days: number; hours: number; suggestedCents: number } => {
  const exceeded = Math.max(
    0,
    parseTimestamp(now).getTime() - parseTimestamp(paidUntil).getTime(),
  );
  const days = Math.ceil(exceeded / 86400000);
  return {
    days,
    hours: Math.ceil(exceeded / HOUR_IN_MS),
    suggestedCents: days * dailyPriceCents,
  };
};
/** 提醒说明只依赖业务事实和传入时刻，避免浏览器自行计时。 */
export const describeSlotReminder = (
  kind: "hotel_daily" | "lease" | "private",
  deadline: ParkingTimestamp,
  now: ParkingTimestamp,
): string => {
  const deadlineTime = parseTimestamp(deadline).getTime();
  const nowTime = parseTimestamp(now).getTime();
  const difference = nowTime - deadlineTime;
  if (difference === 0) return "超时 0 分钟";
  if (difference > 0) {
    const minutes = Math.max(1, Math.ceil(difference / 60000));
    if (kind === "private") return "超时 " + minutes + " 分钟";
    if (difference > 86400000) {
      return "超时 " + Math.ceil(difference / 86400000) + " 天";
    }
    return "超时 " + Math.max(1, Math.ceil(difference / HOUR_IN_MS)) + " 小时";
  }
  if (kind === "private") {
    return "借用还剩 " + Math.max(1, Math.ceil(-difference / 60000)) + " 分钟";
  }
  if (kind === "lease") return formatBusinessDate(deadline) + "到期";
  if (getBusinessDate(deadline) === getBusinessDate(now)) {
    return "今天 " + formatBusinessTime(deadline) + " 到期";
  }
  return formatBusinessDateTime(deadline) + " 到期";
};
