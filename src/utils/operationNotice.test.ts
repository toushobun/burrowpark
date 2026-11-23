import { describe, expect, it } from "vitest";

import {
  emptyDetail,
  leaseAwayDetail,
} from "organisms/slots/SlotDetail/SlotDetail.fixtures";

import { resolveOperationNotice } from "./operationNotice";

const id = "00000000-0000-4000-8000-000000000001";

describe("resolveOperationNotice", () => {
  it("已登记的车牌取服务器事实而不是 URL", () => {
    const detail = {
      ...emptyDetail,
      presentVehicle: {
        sessionId: id,
        plate: "粤B12345",
        billingType: "hourly" as const,
        enteredAt: "2026-11-19T03:00:00.000Z",
        paidUntil: null,
        borrowUntil: null,
        photoUrl: null,
      },
    };
    expect(
      resolveOperationNotice(
        { done: "checkin", slot: "7", id, photo: "0" },
        detail,
      ),
    ).toEqual({
      kind: "checkin",
      code: "7",
      id,
      message: "已登记 7号 粤B·12345",
      photoSaved: false,
    });
    expect(
      resolveOperationNotice({ done: "checkin", slot: "7", id: "wrong" }, detail),
    ).toBeNull();
  });

  it("预留和长租按 id 复核并使用实际姓名", () => {
    const reservationDetail = {
      ...emptyDetail,
      reservation: { id, guestName: " 张三 ", note: null },
    };
    expect(
      resolveOperationNotice(
        { done: "reserve", slot: "7", id },
        reservationDetail,
      )?.message,
    ).toBe("已预留 7号（张三）");

    const noNameDetail = {
      ...reservationDetail,
      reservation: { id, guestName: null, note: null },
    };
    expect(
      resolveOperationNotice(
        { done: "reserve", slot: "7", id },
        noNameDetail,
      )?.message,
    ).toBe("已预留 7号");

    const leaseDetail = {
      ...leaseAwayDetail,
      lease: { ...leaseAwayDetail.lease!, id, tenantName: "王先生" },
    };
    expect(
      resolveOperationNotice(
        { done: "lease", slot: "7", id },
        leaseDetail,
      )?.message,
    ).toBe("7号已设为长租（王先生）");
  });

  it("操作类型不符、记录 id 不符或车位不符时一律不展示", () => {
    expect(
      resolveOperationNotice({ done: "reserve", slot: "7", id }, emptyDetail),
    ).toBeNull();
    expect(
      resolveOperationNotice({ done: "lease", slot: "7", id }, leaseAwayDetail),
    ).toBeNull();
    expect(
      resolveOperationNotice({ done: "reserve", slot: "7", id }, null),
    ).toBeNull();
    expect(
      resolveOperationNotice({ done: "lease", slot: "8", id }, leaseAwayDetail),
    ).toBeNull();
    expect(resolveOperationNotice(null, leaseAwayDetail)).toBeNull();
  });
});
