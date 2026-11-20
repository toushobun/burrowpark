// @vitest-environment node

import { describe, expect, it, vi } from "vitest";

import type {
  ParkingRepository,
  SlotFactsRows,
} from "../repository/parkingRepository";
import { createParkingService } from "./parkingService";

const now = new Date("2026-11-19T03:00:00.000Z");

function makeRows(overrides: Partial<SlotFactsRows> = {}): SlotFactsRows {
  return {
    slots: [
      { code: "1", name: "1号", kind: "regular", is_active: true },
      { code: "2", name: "2号", kind: "private", is_active: false },
    ],
    sessions: [],
    reservations: [],
    leases: [],
    ...overrides,
  };
}

function makeSession(
  overrides: Partial<SlotFactsRows["sessions"][number]> = {},
): SlotFactsRows["sessions"][number] {
  return {
    id: "session-1",
    slot_code: "1",
    billing_type: "hotel_daily",
    plate: "粤B12345",
    entered_at: "2026-11-19T01:00:00.000Z",
    photo_path: "photo.png",
    borrow_until: null,
    lease_id: null,
    session_payments: [],
    ...overrides,
  };
}

function makeLease(
  overrides: Partial<SlotFactsRows["leases"][number]> = {},
): SlotFactsRows["leases"][number] {
  return {
    id: "lease-1",
    slot_code: "1",
    tenant_name: "王先生",
    phone: "13800000000",
    lease_payments: [],
    ...overrides,
  };
}

function makeService(rows: SlotFactsRows) {
  const repository: ParkingRepository = {
    readSlotFacts: vi.fn().mockResolvedValue(rows),
    getPhotoSignedUrl: vi.fn().mockResolvedValue("https://example.com/photo"),
    getPricingSettings: vi.fn().mockResolvedValue({
      hotel_daily_price_cents: 3000,
      hotel_checkout_hour: 12,
      hotel_previous_day_before_hour: 6,
      hourly_price_cents: 500,
    }),
    checkInVehicle: vi.fn().mockResolvedValue("00000000-0000-4000-8000-000000000001"),
    undoCheckIn: vi.fn().mockResolvedValue(undefined),
  };
  const getAuth = vi.fn().mockResolvedValue({
    isAuthenticated: true,
    userId: "family",
    email: null,
  });
  return {
    repository,
    getAuth,
    service: createParkingService(repository, getAuth),
  };
}

describe("createParkingService", () => {
  it("首页没有占用事实时推导空位和私人位，保留停用标志", async () => {
    const { service, repository } = makeService(makeRows());
    expect(await service.getSlotMap(now)).toEqual([
      { code: "1", name: "1号", isActive: true, status: "empty" },
      { code: "2", name: "2号", isActive: false, status: "privateIdle" },
    ]);
    expect(repository.readSlotFacts).toHaveBeenCalledOnce();
  });

  it("首页即使有照片也不生成签名地址", async () => {
    const { service, repository } = makeService(
      makeRows({ sessions: [makeSession()] }),
    );

    await service.getSlotMap(now);

    expect(repository.getPhotoSignedUrl).not.toHaveBeenCalled();
  });

  it("详情只签当前车位照片，忽略其他在场车位", async () => {
    const { service, repository } = makeService(
      makeRows({
        sessions: [
          makeSession({ photo_path: "slot-1.png" }),
          makeSession({
            id: "session-2",
            slot_code: "2",
            photo_path: "slot-2.png",
          }),
        ],
      }),
    );

    await service.getSlotDetail("1", now);

    expect(repository.getPhotoSignedUrl).toHaveBeenCalledOnce();
    expect(repository.getPhotoSignedUrl).toHaveBeenCalledWith("slot-1.png");
  });

  it("详情没有照片或停用时不生成签名地址", async () => {
    const { service, repository } = makeService(
      makeRows({
        sessions: [
          makeSession({ photo_path: null }),
          makeSession({
            id: "session-2",
            slot_code: "2",
            photo_path: "inactive.png",
          }),
        ],
      }),
    );

    expect(
      (await service.getSlotDetail("1", now))?.presentVehicle?.photoUrl,
    ).toBeNull();
    await service.getSlotDetail("2", now);
    await service.getSlotDetail("not-exist", now);

    expect(repository.getPhotoSignedUrl).not.toHaveBeenCalled();
  });

  it("首页普通在场停车按最大收款期限判断", async () => {
    const { service } = makeService(
      makeRows({
        sessions: [
          makeSession({
            session_payments: [
              { paid_until: "2026-11-18T04:00:00.000Z" },
              { paid_until: null },
              { paid_until: "2026-11-22T04:00:00.000Z" },
            ],
          }),
        ],
      }),
    );

    expect((await service.getSlotMap(now))[0].status).toBe("occupied");
  });

  it("首页在场长租车读取长租名下最大期限并推导快到期", async () => {
    const { service } = makeService(
      makeRows({
        sessions: [
          makeSession({
            billing_type: "lease",
            lease_id: "lease-1",
            session_payments: [{ paid_until: "2026-11-18T04:00:00.000Z" }],
          }),
        ],
        leases: [
          makeLease({
            lease_payments: [
              { paid_until: "2026-11-18T04:00:00.000Z" },
              { paid_until: "2026-11-21T04:00:00.000Z" },
            ],
          }),
        ],
      }),
    );

    expect((await service.getSlotMap(now))[0].status).toBe("expiringSoon");
  });

  it("首页车不在时优先显示预留，其次显示长租", async () => {
    const { service } = makeService(
      makeRows({
        reservations: [{ slot_code: "1", guest_name: null, note: null }],
        leases: [
          makeLease({
            lease_payments: [{ paid_until: "2026-11-18T04:00:00.000Z" }],
          }),
          makeLease({
            id: "lease-2",
            slot_code: "2",
            lease_payments: [{ paid_until: "2026-12-19T04:00:00.000Z" }],
          }),
        ],
      }),
    );

    const result = await service.getSlotMap(now);
    expect(result.map((slot) => slot.status)).toEqual([
      "reserved",
      "leaseAway",
    ]);
  });

  it("详情页车位不存在时返回 null", async () => {
    const { service, repository } = makeService(makeRows());
    expect(await service.getSlotDetail("not-exist", now)).toBeNull();
    expect(repository.readSlotFacts).toHaveBeenCalledOnce();
    expect(repository.getPhotoSignedUrl).not.toHaveBeenCalled();
  });

  it("详情页空车位只包含基础信息", async () => {
    const { service } = makeService(makeRows());
    expect(await service.getSlotDetail("1", now)).toEqual({
      code: "1",
      name: "1号",
      isActive: true,
      status: "empty",
      kind: "regular",
      presentVehicle: null,
      reservation: null,
      lease: null,
    });
  });

  it("详情页酒店客当天交到中午时推导快到期并保留照片", async () => {
    const { service, repository } = makeService(
      makeRows({
        sessions: [
          makeSession({
            session_payments: [{ paid_until: "2026-11-19T04:00:00.000Z" }],
          }),
        ],
      }),
    );

    expect(await service.getSlotDetail("1", now)).toMatchObject({
      status: "expiringSoon",
      presentVehicle: {
        plate: "粤B12345",
        billingType: "hotel_daily",
        enteredAt: "2026-11-19T01:00:00.000Z",
        paidUntil: "2026-11-19T04:00:00.000Z",
        photoUrl: "https://example.com/photo",
      },
    });
    expect(repository.getPhotoSignedUrl).toHaveBeenCalledOnce();
    expect(repository.getPhotoSignedUrl).toHaveBeenCalledWith("photo.png");
  });

  it("详情页临停不计算缴费期限", async () => {
    const { service } = makeService(
      makeRows({ sessions: [makeSession({ billing_type: "hourly" })] }),
    );

    expect(await service.getSlotDetail("1", now)).toMatchObject({
      status: "occupied",
      presentVehicle: { billingType: "hourly", paidUntil: null },
    });
  });

  it("详情页在租长租车不在时显示租户、电话和交到日期", async () => {
    const { service } = makeService(
      makeRows({
        leases: [
          makeLease({
            lease_payments: [{ paid_until: "2026-11-30T04:00:00.000Z" }],
          }),
        ],
      }),
    );

    expect(await service.getSlotDetail("1", now)).toMatchObject({
      status: "leaseAway",
      presentVehicle: null,
      lease: {
        tenantName: "王先生",
        phone: "13800000000",
        paidUntil: "2026-11-30T04:00:00.000Z",
      },
    });
  });

  it("详情页私人位借用中保持借到时间", async () => {
    const { service } = makeService(
      makeRows({
        slots: [{ code: "2", name: "2号", kind: "private", is_active: true }],
        sessions: [
          makeSession({
            slot_code: "2",
            billing_type: "hourly",
            borrow_until: "2026-11-19T04:30:00.000Z",
          }),
        ],
      }),
    );

    expect(await service.getSlotDetail("2", now)).toMatchObject({
      status: "privateBorrowed",
      kind: "private",
      presentVehicle: { borrowUntil: "2026-11-19T04:30:00.000Z" },
    });
  });

  it("私人位借用超时后保留私人位类型供详情操作判断", async () => {
    const { service } = makeService(
      makeRows({
        slots: [{ code: "2", name: "2号", kind: "private", is_active: true }],
        sessions: [
          makeSession({
            slot_code: "2",
            billing_type: "hourly",
            borrow_until: "2026-11-19T02:00:00.000Z",
          }),
        ],
      }),
    );

    expect(await service.getSlotDetail("2", now)).toMatchObject({
      status: "overdue",
      kind: "private",
      presentVehicle: { borrowUntil: "2026-11-19T02:00:00.000Z" },
    });
  });

  it("停用车位即使有车辆预留长租也不返回隐私且不签照片", async () => {
    const { service, repository } = makeService(
      makeRows({
        sessions: [
          makeSession({
            slot_code: "2",
            photo_path: "inactive-secret.png",
          }),
        ],
        reservations: [
          { slot_code: "2", guest_name: "李女士", note: "保密备注" },
        ],
        leases: [
          makeLease({
            slot_code: "2",
            lease_payments: [{ paid_until: "2026-11-30T04:00:00.000Z" }],
          }),
        ],
      }),
    );

    expect(await service.getSlotDetail("2", now)).toEqual({
      code: "2",
      name: "2号",
      isActive: false,
      status: "privateBorrowed",
      kind: "private",
      presentVehicle: null,
      reservation: null,
      lease: null,
    });
    expect(repository.getPhotoSignedUrl).not.toHaveBeenCalled();
  });

  it("同一车位有多条收款时详情取最大 paid_until 且首页状态一致", async () => {
    const { service } = makeService(
      makeRows({
        sessions: [
          makeSession({
            session_payments: [
              { paid_until: "2026-11-18T04:00:00.000Z" },
              { paid_until: "2026-11-20T04:00:00.000Z" },
              { paid_until: null },
              { paid_until: "2026-11-19T04:00:00.000Z" },
            ],
          }),
        ],
      }),
    );

    const detail = await service.getSlotDetail("1", now);
    const map = await service.getSlotMap(now);
    expect(detail?.presentVehicle?.paidUntil).toBe("2026-11-20T04:00:00.000Z");
    expect(detail?.status).toBe(map[0].status);
    expect(map[0]).toEqual({
      code: "1",
      name: "1号",
      isActive: true,
      status: "occupied",
    });
    expect(JSON.stringify(map)).not.toContain("粤B12345");
    expect(JSON.stringify(map)).not.toContain("13800000000");
  });

  it("未登录时拒绝首页和详情读取", async () => {
    const { repository } = makeService(makeRows());
    const service = createParkingService(repository, async () => ({
      isAuthenticated: false,
      userId: null,
      email: null,
    }));

    await expect(service.getSlotMap(now)).rejects.toMatchObject({
      code: "auth_required",
    });
    await expect(service.getSlotDetail("1", now)).rejects.toMatchObject({
      code: "auth_required",
    });
    expect(repository.readSlotFacts).not.toHaveBeenCalled();
    expect(repository.getPhotoSignedUrl).not.toHaveBeenCalled();
  });
  it("登记表单复用车位事实读取并返回在租与预留信息", async () => {
    const { service, repository } = makeService(makeRows({
      reservations: [{ slot_code: "1", guest_name: "旅客", note: null }],
      leases: [makeLease()],
    }));
    const result = await service.getCheckInForm("1", now);
    expect(result).toMatchObject({
      code: "1",
      name: "1号",
      kind: "regular",
      hasLease: true,
      hasReservation: true,
      occupied: false,
    });
    expect(repository.readSlotFacts).toHaveBeenCalledOnce();
    expect(repository.getPricingSettings).toHaveBeenCalledOnce();
    expect(repository.getPhotoSignedUrl).not.toHaveBeenCalled();
  });

  it("酒店客计算交到时间并把元精确转成分", async () => {
    const { service, repository } = makeService(makeRows());
    const result = await service.checkIn({
      slotCode: "1", plate: "粤b·12345", billingType: "hotel_daily",
      days: 2, amountYuan: "59.05", paymentMethod: "wechat",
    }, now);
    expect(result.plate).toBe("粤B12345");
    expect(repository.checkInVehicle).toHaveBeenCalledWith({
      slotCode: "1", plate: "粤B12345", billingType: "hotel_daily",
      paidUntil: "2026-11-21T04:00:00.000Z",
      borrowUntil: null, amountCents: 5905, paymentMethod: "wechat",
    });
  });

  it("临停免费不读取收费设置且不产生预交金额", async () => {
    const { service, repository } = makeService(makeRows());
    for (const billingType of ["hourly", "free"] as const) {
      await service.checkIn({ slotCode: "1", plate: "粤B12345", billingType }, now);
    }
    expect(repository.getPricingSettings).not.toHaveBeenCalled();
    expect(repository.checkInVehicle).toHaveBeenCalledWith(expect.objectContaining({
      billingType: "hourly", paidUntil: null, amountCents: null,
      paymentMethod: null, borrowUntil: null,
    }));
  });

  it("私人位借用使用同一个 now 加十分钟计算期限", async () => {
    const { service, repository } = makeService(makeRows());
    await service.checkIn({
      slotCode: "2", plate: "粤b88888", billingType: "hourly", borrowMinutes: 10,
    }, now);
    expect(repository.checkInVehicle).toHaveBeenCalledWith(expect.objectContaining({
      borrowUntil: "2026-11-19T03:10:00.000Z",
      paidUntil: null,
    }));
  });

  it("无在租长租也可提交计费类型，但必须由 RPC 最终拒绝", async () => {
    const { service, repository } = makeService(makeRows());
    await service.checkIn({ slotCode: "1", plate: "粤B12345", billingType: "lease" }, now);
    expect(repository.checkInVehicle).toHaveBeenCalledWith(expect.objectContaining({
      billingType: "lease", paymentMethod: null,
    }));
  });

  it("拒绝缺失收款方式、非法天数和负金额", async () => {
    const { service, repository } = makeService(makeRows());
    await expect(service.checkIn({
      slotCode: "1", plate: "粤B12345", billingType: "hotel_daily", days: 1,
      amountYuan: "30.00",
    }, now)).rejects.toMatchObject({ code: "check_in_invalid" });
    await expect(service.checkIn({
      slotCode: "1", plate: "粤B12345", billingType: "hotel_daily", days: 31,
      amountYuan: "30.00", paymentMethod: "cash",
    }, now)).rejects.toMatchObject({ code: "check_in_invalid" });
    await expect(service.checkIn({
      slotCode: "1", plate: "粤B12345", billingType: "hotel_daily", days: 1,
      amountYuan: "-1", paymentMethod: "cash",
    }, now)).rejects.toMatchObject({ code: "check_in_invalid" });
    expect(repository.checkInVehicle).not.toHaveBeenCalled();
  });

  it("拒绝不合法的借用时长及普通方式携带收款参数", async () => {
    const { service, repository } = makeService(makeRows());
    await expect(service.checkIn({
      slotCode: "1", plate: "粤B12345", billingType: "hourly", borrowMinutes: 45,
    }, now)).rejects.toMatchObject({ code: "check_in_invalid" });
    await expect(service.checkIn({
      slotCode: "1", plate: "粤B12345", billingType: "free", paymentMethod: "cash",
    }, now)).rejects.toMatchObject({ code: "check_in_invalid" });
    expect(repository.checkInVehicle).not.toHaveBeenCalled();
  });

  it("撤销先验证 UUID 再调用 RPC", async () => {
    const { service, repository } = makeService(makeRows());
    await expect(service.undoCheckIn("not-uuid")).rejects.toMatchObject({
      code: "undo_invalid",
    });
    await service.undoCheckIn("00000000-0000-4000-8000-000000000001");
    expect(repository.undoCheckIn).toHaveBeenCalledOnce();
    expect(repository.undoCheckIn).toHaveBeenCalledWith("00000000-0000-4000-8000-000000000001");
  });

  it("未登录时登记、撤销与表单读取均不碰 Repository", async () => {
    const { repository } = makeService(makeRows());
    const service = createParkingService(repository, async () => ({
      isAuthenticated: false, userId: null, email: null,
    }));
    await expect(service.checkIn({}, now)).rejects.toMatchObject({ code: "auth_required" });
    await expect(service.undoCheckIn("not-uuid")).rejects.toMatchObject({ code: "auth_required" });
    await expect(service.getCheckInForm("1", now)).rejects.toMatchObject({ code: "auth_required" });
    expect(repository.checkInVehicle).not.toHaveBeenCalled();
    expect(repository.undoCheckIn).not.toHaveBeenCalled();
    expect(repository.readSlotFacts).not.toHaveBeenCalled();
  });

});
