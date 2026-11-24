import { describe, expect, it } from "vitest";

import {
  parseAmountCents,
  parseMonthlyStatsMonth,
  parseRecordsFilter,
  pricingSettingsInputSchema,
  readPricingSettingsFormData,
  parseCheckInInput,
  parseCheckOutInput,
  parseRenewInput,
  parseUndoSessionId,
  readCheckInFormData,
} from "./schema";
import { parkingMessages } from "./errors";

describe("checkInSchema", () => {
  it("允许仅照片或仅手机号登记，拒绝全部为空", () => {
    const base = { slotCode: "3", billingType: "hourly" };
    const photo = new Blob(["photo"], { type: "image/jpeg" });
    expect(parseCheckInInput({ ...base, photo })).toMatchObject({
      plate: "",
      photo,
    });
    expect(
      parseCheckInInput({ ...base, phone: " 13800138000 " }),
    ).toMatchObject({ plate: "", phone: "13800138000" });
    expect(() => parseCheckInInput(base)).toThrow(
      parkingMessages.identityRequired,
    );
    expect(() => parseCheckInInput({ ...base, phone: "abc" })).toThrow(
      parkingMessages.invalidPhone,
    );
  });

  it("车牌规范化并接收合法酒店客参数", () => {
    const result = parseCheckInInput({
      slotCode: "3",
      plate: "粤b·12345",
      billingType: "hotel_daily",
      days: 2,
      paymentMethod: "wechat",
      amountYuan: "59.05",
    });
    expect(result.plate).toBe("粤B12345");
  });

  it("没有支付方式或酒店天数范围超限时拒绝", () => {
    for (const days of [0, 31]) {
      expect(() =>
        parseCheckInInput({
          slotCode: "3",
          plate: "粤B12345",
          billingType: "hotel_daily",
          days,
          paymentMethod: "cash",
          amountYuan: "30.00",
        }),
      ).toThrow();
    }
    expect(() =>
      parseCheckInInput({
        slotCode: "3",
        plate: "粤B12345",
        billingType: "hotel_daily",
        days: 1,
        amountYuan: "30.00",
      }),
    ).toThrow();
  });

  it("临停免费不可提交酒店收款参数", () => {
    expect(() =>
      parseCheckInInput({
        slotCode: "3",
        plate: "粤B12345",
        billingType: "free",
        paymentMethod: "cash",
        amountYuan: "1.00",
      }),
    ).toThrow();
  });

  it("只接受十分钟或三十分钟借用时长", () => {
    for (const value of [10, 30]) {
      expect(
        parseCheckInInput({
          slotCode: "3",
          plate: "粤B12345",
          billingType: "hourly",
          borrowMinutes: value,
        }).borrowMinutes,
      ).toBe(value);
    }
    expect(() =>
      parseCheckInInput({
        slotCode: "3",
        plate: "粤B12345",
        billingType: "hourly",
        borrowMinutes: 15,
      }),
    ).toThrow();
  });

  it("拒绝过短车牌和非法车位代码", () => {
    expect(() =>
      parseCheckInInput({
        slotCode: "3",
        plate: "粤",
        billingType: "free",
      }),
    ).toThrow();
    expect(() =>
      parseCheckInInput({
        slotCode: "../3",
        plate: "粤B12345",
        billingType: "free",
      }),
    ).toThrow();
  });

  it("金额字符串精确转分且不允许超额或零元", () => {
    expect(parseAmountCents("59.05")).toBe(5905);
    expect(parseAmountCents("0.01")).toBe(1);
    expect(() => parseAmountCents("0")).toThrow();
    expect(() => parseAmountCents("21474836.48")).toThrow();
  });

  it("FormData 仅转换输入，不提前信任客户端数据", () => {
    const formData = new FormData();
    formData.set("slotCode", "3");
    formData.set("plate", "粤b·12345");
    formData.set("billingType", "hourly");
    formData.set("borrowMinutes", "30");
    expect(parseCheckInInput(readCheckInFormData(formData))).toMatchObject({
      plate: "粤B12345",
      borrowMinutes: 30,
    });
  });

  it("撤销必须是合法 UUID", () => {
    expect(parseUndoSessionId("00000000-0000-4000-8000-000000000001")).toBe(
      "00000000-0000-4000-8000-000000000001",
    );
    expect(() => parseUndoSessionId("bad-id")).toThrow();
  });
});

describe("续费与离场校验", () => {
  it("续费方式、天数及金额必须符合规则", () => {
    expect(
      parseRenewInput({
        slotCode: "1",
        mode: "hotel_daily",
        days: 2,
        amountYuan: "30.05",
        paymentMethod: "wechat",
      }).days,
    ).toBe(2);
    expect(() =>
      parseRenewInput({
        slotCode: "1",
        mode: "hotel_daily",
        days: 31,
        amountYuan: "30.05",
        paymentMethod: "wechat",
      }),
    ).toThrow();
    expect(() =>
      parseRenewInput({
        slotCode: "1",
        mode: "lease",
        endDate: "2026/11/30",
        amountYuan: "10",
        paymentMethod: "cash",
      }),
    ).toThrow();
  });
  it("离场不能只提供金额或只提供收款方式", () => {
    const sessionId = "00000000-0000-4000-8000-000000000001";
    expect(parseCheckOutInput({ sessionId }).amountYuan).toBeUndefined();
    expect(() => parseCheckOutInput({ sessionId, amountYuan: "20" })).toThrow();
    expect(() =>
      parseCheckOutInput({ sessionId, paymentMethod: "cash" }),
    ).toThrow();
  });
});

describe("月统计月份参数", () => {
  const now = new Date("2026-10-31T16:00:00.000Z");

  it("合法的 YYYY-MM 原样保留，缺省与格式非法时回退上海本月", () => {
    expect(parseMonthlyStatsMonth("2026-10", now)).toBe("2026-10");
    for (const input of [
      undefined,
      "2026-13",
      "2026-1",
      "2026-00",
      ["2026-10"],
      123,
    ]) {
      expect(parseMonthlyStatsMonth(input, now)).toBe("2026-11");
    }
  });
});

describe("收费设置校验", () => {
  it("钟点只允许0至23的整数", () => {
    const base = {
      hotelDailyYuan: "30",
      hotelCheckoutHour: 12,
      hotelPreviousDayBeforeHour: 6,
      hourlyYuan: "5",
    };
    expect(pricingSettingsInputSchema.safeParse(base).success).toBe(true);
    for (const value of [-1, 24, 2.5]) {
      expect(
        pricingSettingsInputSchema.safeParse({
          ...base,
          hotelCheckoutHour: value,
        }).success,
      ).toBe(false);
    }
  });

  it("凌晨算前一天的钟点不得晚于离场钟点，相等时允许", () => {
    const base = {
      hotelDailyYuan: "30",
      hotelCheckoutHour: 12,
      hotelPreviousDayBeforeHour: 14,
      hourlyYuan: "5",
    };
    const rejected = pricingSettingsInputSchema.safeParse(base);
    expect(rejected.success).toBe(false);
    if (!rejected.success) {
      expect(rejected.error.issues[0]).toMatchObject({
        path: ["hotelPreviousDayBeforeHour"],
        message: parkingMessages.previousDayHourAfterCheckout,
      });
    }
    expect(
      pricingSettingsInputSchema.safeParse({
        ...base,
        hotelPreviousDayBeforeHour: 12,
      }).success,
    ).toBe(true);
  });

  it("表单钟点缺失或为空时不能静默变成0点", () => {
    const form = new FormData();
    form.set("hotelDailyYuan", "30");
    form.set("hourlyYuan", "5");
    form.set("hotelPreviousDayBeforeHour", "6");
    expect(
      pricingSettingsInputSchema.safeParse(readPricingSettingsFormData(form))
        .success,
    ).toBe(false);

    form.set("hotelCheckoutHour", "");
    expect(
      pricingSettingsInputSchema.safeParse(readPricingSettingsFormData(form))
        .success,
    ).toBe(false);

    form.set("hotelPreviousDayBeforeHour", "0");
    form.set("hotelCheckoutHour", "0");
    expect(
      pricingSettingsInputSchema.safeParse(readPricingSettingsFormData(form))
        .success,
    ).toBe(true);

    form.set("hotelCheckoutHour", "1e1");
    expect(
      pricingSettingsInputSchema.safeParse(readPricingSettingsFormData(form))
        .success,
    ).toBe(false);
  });
});

describe("记录查询参数", () => {
  it("日期格式非法或未来日期回到上海今天", () => {
    const now = new Date("2026-11-20T16:10:00.000Z");
    expect(parseRecordsFilter({ date: "2026-02-30" }, now)).toEqual({
      kind: "date",
      date: "2026-11-21",
    });
    expect(parseRecordsFilter({ date: "2026-11-22" }, now)).toEqual({
      kind: "date",
      date: "2026-11-21",
    });
  });
  it("长租查询只接受租户名或合法车位号，非法值不执行搜索", () => {
    const now = new Date("2026-11-21T00:10:00.000Z");
    expect(
      parseRecordsFilter(
        { mode: "lease", leaseBy: "tenant", leaseQuery: "  王先生  " },
        now,
      ),
    ).toEqual({ kind: "lease", searchBy: "tenant", query: "王先生" });
    expect(
      parseRecordsFilter(
        { mode: "lease", leaseBy: "slot", leaseQuery: "007" },
        now,
      ),
    ).toEqual({ kind: "lease", searchBy: "slot", query: "007" });
    expect(
      parseRecordsFilter(
        { mode: "lease", leaseBy: "slot", leaseQuery: "../1" },
        now,
      ),
    ).toEqual({ kind: "lease", searchBy: "slot", query: "" });
    expect(
      parseRecordsFilter({ mode: "lease", leaseQuery: ["王"] }, now),
    ).toEqual({ kind: "lease", searchBy: "tenant", query: "" });
  });
  it("车牌去空格去点并自动大写，非法输入回到今天", () => {
    const now = new Date("2026-11-21T00:10:00.000Z");
    expect(parseRecordsFilter({ plate: "辽a·12345" }, now)).toEqual({
      kind: "plate",
      plate: "辽A12345",
    });
    expect(parseRecordsFilter({ plate: "" }, now)).toEqual({
      kind: "date",
      date: "2026-11-21",
    });
  });
});
