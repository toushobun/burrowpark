// @vitest-environment node

import { describe, expect, it } from "vitest";
import type { SlotStatusFacts } from "../entity/parkingDomain";
import {
  calculateHourlySuggestedAmountCents,
  calculateHotelCheckoutAt,
  deriveSlotStatus,
  formatPlateForDisplay,
  getBusinessDate,
  getBusinessDateTime,
  LEASE_EXPIRING_SOON_DAYS,
  normalizePlate,
  PRIVATE_BORROW_REMINDER_MINUTES,
} from "./parkingDomain";

const createSlotFacts = (
  overrides: Partial<SlotStatusFacts> = {},
): SlotStatusFacts => ({
  kind: "regular",
  present_vehicle: null,
  has_open_reservation: false,
  active_lease: null,
  ...overrides,
});

describe("业务时间", () => {
  it("将 UTC 16:30 转换为上海次日业务日期", () => {
    expect(getBusinessDate("2026-11-18T16:30:00.000Z")).toBe("2026-11-19");
  });

  it("业务日期在 UTC 年末与上海跨年时正确换算", () => {
    expect(getBusinessDate("2026-12-31T16:30:00.000Z")).toBe("2027-01-01");
  });

  it.each(["2026-11-19T00:30:00", "2026-11-19"])(
    "拒绝没有明确时区的时间字符串 %s",
    (value) => {
      expect(() => getBusinessDate(value)).toThrow(
        "时间字符串必须明确指定时区。",
      );
    },
  );

  it("带 +08:00 偏移的时间戳仍按正确的业务日期换算", () => {
    expect(getBusinessDate("2026-11-19T00:30:00+08:00")).toBe("2026-11-19");
  });

  it("将业务日期的指定整点转换为对应的 UTC 时间", () => {
    expect(getBusinessDateTime("2026-11-19", 12)).toBe(
      "2026-11-19T04:00:00.000Z",
    );
  });

  it("将凌晨 5:59 进场按前一天计算酒店交到时间", () => {
    expect(
      calculateHotelCheckoutAt("2026-11-18T21:59:00.000Z", 1, {
        hotel_checkout_hour: 12,
        hotel_previous_day_before_hour: 6,
      }),
    ).toBe("2026-11-19T04:00:00.000Z");
  });

  it("将凌晨 6:00 进场按当天计算酒店交到时间", () => {
    expect(
      calculateHotelCheckoutAt("2026-11-18T22:00:00.000Z", 1, {
        hotel_checkout_hour: 12,
        hotel_previous_day_before_hour: 6,
      }),
    ).toBe("2026-11-20T04:00:00.000Z");
  });
});

describe("临停建议金额", () => {
  it.each([
    [0, 500],
    [59, 500],
    [61, 1000],
  ])("停车 %i 分钟时计算建议金额", (durationMinutes, expectedAmount) => {
    expect(
      calculateHourlySuggestedAmountCents(durationMinutes, {
        hourly_price_cents: 500,
      }),
    ).toBe(expectedAmount);
  });
});

describe("车牌格式", () => {
  it("规范化时移除间隔符和空白并转为大写", () => {
    expect(normalizePlate(" 粤b · 12345　")).toBe("粤B12345");
  });

  it("显示时在规范化车牌的第二位后插入间隔符", () => {
    expect(formatPlateForDisplay(" 粤b · 12345 ")).toBe("粤B·12345");
  });

  it("短于三位的车牌不插入间隔符", () => {
    expect(formatPlateForDisplay("粤b")).toBe("粤B");
  });
});

describe("车位状态推导", () => {
  const now = "2026-11-19T03:00:00.000Z";

  it("无车、无预留、无长租的普通车位为空", () => {
    expect(deriveSlotStatus(createSlotFacts(), now)).toBe("empty");
  });

  it("无车、无预留、无长租的私人位为空闲私人位", () => {
    expect(deriveSlotStatus(createSlotFacts({ kind: "private" }), now)).toBe(
      "privateIdle",
    );
  });

  it("无车但有未关闭预留时优先显示预留", () => {
    expect(
      deriveSlotStatus(
        createSlotFacts({
          has_open_reservation: true,
          active_lease: { paid_until: "2026-11-20T04:00:00.000Z" },
        }),
        now,
      ),
    ).toBe("reserved");
  });

  it("无车但有未过期长租时显示长租车不在", () => {
    expect(
      deriveSlotStatus(
        createSlotFacts({
          active_lease: { paid_until: "2026-11-20T04:00:00.000Z" },
        }),
        now,
      ),
    ).toBe("leaseAway");
  });

  it("无车且长租交到时间恰好等于当前时间时显示已过期", () => {
    expect(
      deriveSlotStatus(
        createSlotFacts({
          active_lease: { paid_until: now },
        }),
        now,
      ),
    ).toBe("overdue");
  });

  it("有在场车时优先于预留和长租事实", () => {
    expect(
      deriveSlotStatus(
        createSlotFacts({
          present_vehicle: { billing_type: "hourly" },
          has_open_reservation: true,
          active_lease: { paid_until: "2026-11-20T04:00:00.000Z" },
        }),
        now,
      ),
    ).toBe("occupied");
  });

  it("酒店客交到时间恰好等于当前时间时显示已过期", () => {
    expect(
      deriveSlotStatus(
        createSlotFacts({
          present_vehicle: { billing_type: "hotel_daily", paid_until: now },
        }),
        now,
      ),
    ).toBe("overdue");
  });

  it("酒店客交到时间在今天且尚未到期时显示快到期", () => {
    expect(
      deriveSlotStatus(
        createSlotFacts({
          present_vehicle: {
            billing_type: "hotel_daily",
            paid_until: "2026-11-19T04:00:00.000Z",
          },
        }),
        now,
      ),
    ).toBe("expiringSoon");
  });

  it("酒店客交到时间在明天时显示有车", () => {
    expect(
      deriveSlotStatus(
        createSlotFacts({
          present_vehicle: {
            billing_type: "hotel_daily",
            paid_until: "2026-11-20T04:00:00.000Z",
          },
        }),
        now,
      ),
    ).toBe("occupied");
  });

  it.each(["hourly", "free"] as const)(
    "%s 类型的在场车辆显示有车",
    (billingType) => {
      expect(
        deriveSlotStatus(
          createSlotFacts({
            present_vehicle: { billing_type: billingType },
          }),
          now,
        ),
      ).toBe("occupied");
    },
  );

  it("私人位有在场车且借用期限尚未超过时显示借用中", () => {
    expect(
      deriveSlotStatus(
        createSlotFacts({
          kind: "private",
          present_vehicle: {
            billing_type: "hourly",
            borrow_until: now,
          },
        }),
        now,
      ),
    ).toBe("privateBorrowed");
  });

  it("私人位借用期限超过当前时间后显示已过期", () => {
    expect(
      deriveSlotStatus(
        createSlotFacts({
          kind: "private",
          present_vehicle: {
            billing_type: "hourly",
            borrow_until: "2026-11-19T02:59:59.999Z",
          },
        }),
        now,
      ),
    ).toBe("overdue");
  });
});

describe("业务提醒阈值", () => {
  it("长租快到期阈值为三天", () => {
    expect(LEASE_EXPIRING_SOON_DAYS).toBe(3);
  });

  it("私人位借用提醒阈值为五分钟", () => {
    expect(PRIVATE_BORROW_REMINDER_MINUTES).toBe(5);
  });
});

describe("在场长租车辆状态", () => {
  const now = "2026-11-19T03:00:00.000Z";

  it.each([
    [now, "overdue"],
    ["2026-11-19T04:00:00.000Z", "expiringSoon"],
    ["2026-11-20T04:00:00.000Z", "occupied"],
  ] as const)(
    "交到时间为 %s 时推导长租车辆状态",
    (paidUntil, expectedStatus) => {
      expect(
        deriveSlotStatus(
          createSlotFacts({
            present_vehicle: { billing_type: "lease", paid_until: paidUntil },
          }),
          now,
        ),
      ).toBe(expectedStatus);
    },
  );
});
