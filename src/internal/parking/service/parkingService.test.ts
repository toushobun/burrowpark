// @vitest-environment node

import { describe, expect, it, vi } from "vitest";

import type {
  ParkingRepository,
  SlotMapFactsRows,
} from "../repository/parkingRepository";
import { createParkingService } from "./parkingService";

const now = new Date("2026-11-19T04:00:00.000Z");

function makeRows(overrides: Partial<SlotMapFactsRows> = {}): SlotMapFactsRows {
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

function makeService(rows: SlotMapFactsRows) {
  const repository: ParkingRepository = {
    readSlotMapFacts: vi.fn().mockResolvedValue(rows),
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
  it("没有占用事实时推导空位和私人位，保留停用标志", async () => {
    const { service, repository } = makeService(makeRows());
    expect(await service.getSlotMap(now)).toEqual([
      { code: "1", name: "1号", isActive: true, status: "empty" },
      { code: "2", name: "2号", isActive: false, status: "privateIdle" },
    ]);
    expect(repository.readSlotMapFacts).toHaveBeenCalledOnce();
  });

  it("普通在场停车按最大收款期限判断，而不是按较早的收款过期判断", async () => {
    const { service } = makeService(
      makeRows({
        sessions: [
          {
            id: "session-1",
            slot_code: "1",
            billing_type: "hotel_daily",
            borrow_until: null,
            lease_id: null,
            session_payments: [
              { paid_until: "2026-11-18T04:00:00.000Z" },
              { paid_until: null },
              { paid_until: "2026-11-22T04:00:00.000Z" },
            ],
          },
        ],
      }),
    );

    expect((await service.getSlotMap(now))[0].status).toBe("occupied");
  });

  it("在场长租车读取长租名下最大期限并推导快到期", async () => {
    const { service } = makeService(
      makeRows({
        sessions: [
          {
            id: "session-2",
            slot_code: "1",
            billing_type: "lease",
            borrow_until: null,
            lease_id: "lease-1",
            session_payments: [{ paid_until: "2026-11-18T04:00:00.000Z" }],
          },
        ],
        leases: [
          {
            id: "lease-1",
            slot_code: "1",
            lease_payments: [
              { paid_until: "2026-11-18T04:00:00.000Z" },
              { paid_until: "2026-11-21T04:00:00.000Z" },
            ],
          },
        ],
      }),
    );

    expect((await service.getSlotMap(now))[0].status).toBe("expiringSoon");
  });

  it("车不在时优先显示未关闭预留，其次显示长租到期状态", async () => {
    const { service } = makeService(
      makeRows({
        reservations: [{ slot_code: "1" }],
        leases: [
          {
            id: "lease-1",
            slot_code: "1",
            lease_payments: [{ paid_until: "2026-11-18T04:00:00.000Z" }],
          },
          {
            id: "lease-2",
            slot_code: "2",
            lease_payments: [{ paid_until: "2026-12-19T04:00:00.000Z" }],
          },
        ],
      }),
    );

    const result = await service.getSlotMap(now);
    expect(result.map((slot) => slot.status)).toEqual([
      "reserved",
      "leaseAway",
    ]);
  });

  it("未登录时拒绝读取仓库数据", async () => {
    const { repository } = makeService(makeRows());
    const service = createParkingService(repository, async () => ({
      isAuthenticated: false,
      userId: null,
      email: null,
    }));

    await expect(service.getSlotMap(now)).rejects.toMatchObject({
      code: "auth_required",
    });
    expect(repository.readSlotMapFacts).not.toHaveBeenCalled();
  });
});
