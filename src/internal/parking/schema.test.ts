import { describe, expect, it } from "vitest";

import {
  parseAmountCents,
  parseMonthlyStatsMonth,
  parseRecordsFilter,
  parseCheckInInput,
  parseCheckOutInput,
  parseRenewInput,
  parseUndoSessionId,
  readCheckInFormData,
} from "./schema";

describe("checkInSchema", () => {
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
