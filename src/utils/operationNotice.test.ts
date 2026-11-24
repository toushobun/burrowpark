import { describe, expect, it } from "vitest";

import {
  emptyDetail,
  leaseAwayDetail,
} from "organisms/slots/SlotDetail/SlotDetail.fixtures";

import { resolveOperationNotice } from "./operationNotice";

const id = "00000000-0000-4000-8000-000000000001";

describe("resolveOperationNotice", () => {
  it("登记车牌取服务器事实而非 URL", () => {
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
    const notice = resolveOperationNotice(
      { done: "checkin", slot: "7", id, photo: "0" },
      detail,
    );
    expect(notice).toEqual({
      kind: "checkin",
      code: "7",
      id,
      message: "已登记 7号 粤B·12345",
      photoSaved: false,
    });
    const wrongId = { done: "checkin" as const, slot: "7", id: "wrong" };
    expect(resolveOperationNotice(wrongId, detail)).toBeNull();
  });

  it("登记提示优先使用真实手机号而不是虚构车牌", () => {
    const detail = {
      ...emptyDetail,
      presentVehicle: {
        sessionId: id,
        plate: null,
        phone: "13800138000",
        billingType: "hourly" as const,
        enteredAt: "2026-11-19T03:00:00.000Z",
        paidUntil: null,
        borrowUntil: null,
        photoUrl: null,
      },
    };
    expect(
      resolveOperationNotice({ done: "checkin", slot: "7", id }, detail)
        ?.message,
    ).toBe("已登记 7号 13800138000");
  });

  it("预留和长租按照 ID 复核并使用真实姓名", () => {
    const reserve = { done: "reserve" as const, slot: "7", id };
    const reservation = { id, guestName: " 张三 ", note: null };
    const withGuest = { ...emptyDetail, reservation };
    const withName = resolveOperationNotice(reserve, withGuest);
    expect(withName?.message).toBe("已预留 7号（张三）");

    const withoutGuest = {
      ...emptyDetail,
      reservation: { ...reservation, guestName: null },
    };
    const withoutName = resolveOperationNotice(reserve, withoutGuest);
    expect(withoutName?.message).toBe("已预留 7号");

    const lease = { done: "lease" as const, slot: "7", id };
    const leased = {
      ...leaseAwayDetail,
      lease: { ...leaseAwayDetail.lease!, id, tenantName: "王先生" },
    };
    const leasedNotice = resolveOperationNotice(lease, leased);
    expect(leasedNotice?.message).toBe("7号已设为长租（王先生）");
  });

  it("操作类型不符、记录 ID 或车位不符时不展示提示", () => {
    const reserve = { done: "reserve" as const, slot: "7", id };
    const lease = { done: "lease" as const, slot: "7", id };
    expect(resolveOperationNotice(reserve, emptyDetail)).toBeNull();
    expect(resolveOperationNotice(lease, leaseAwayDetail)).toBeNull();
    expect(resolveOperationNotice(reserve, null)).toBeNull();
    const wrongSlot = { done: "lease" as const, slot: "8", id };
    expect(resolveOperationNotice(wrongSlot, leaseAwayDetail)).toBeNull();
    expect(resolveOperationNotice(null, leaseAwayDetail)).toBeNull();
  });
});
