import { describe, expect, it } from "vitest";

import {
  parseAmountCents,
  parseCheckInInput,
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
