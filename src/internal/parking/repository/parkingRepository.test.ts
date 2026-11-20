// @vitest-environment node

import { describe, expect, it, vi } from "vitest";

import type { Logger } from "internal/shared/logging/logger";
import type { AuthenticatedSupabaseClient } from "internal/shared/supabase/authenticatedClient";

import { createParkingRepository } from "./parkingRepository";

const logger: Logger = {
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
};

function makeClient(failedTable?: string, photoPath: string | null = null) {
  const queries: { table: string; columns: string; filter: string }[] = [];
  const tables: Record<string, unknown[]> = {
    slots: [{ code: "1", name: "1号", kind: "regular", is_active: true }],
    parking_sessions: photoPath
      ? [
          {
            id: "session-1",
            slot_code: "1",
            billing_type: "hourly",
            lease_id: null,
            borrow_until: null,
            entered_at: "2026-11-19T02:00:00.000Z",
            plate: "粤B12345",
            photo_path: photoPath,
            session_payments: [],
          },
        ]
      : [],
    reservations: [],
    leases: [],
  };
  const from = vi.fn((table: string) => ({
    select(columns: string) {
      const finish = (filter: string) => {
        queries.push({ table, columns, filter });
        return Promise.resolve({
          data: failedTable === table ? null : tables[table],
          error: failedTable === table ? new Error("secret db failure") : null,
        });
      };
      return {
        order: (column: string) => finish(column),
        is: (column: string, value: null) => finish(column + "=" + value),
      };
    },
  }));
  const createSignedUrl = vi.fn().mockResolvedValue({
    data: { signedUrl: "https://example.com/signed-photo" },
    error: null,
  });

  return {
    client: {
      from,
      storage: { from: vi.fn(() => ({ createSignedUrl })) },
    } as unknown as AuthenticatedSupabaseClient,
    from,
    queries,
    createSignedUrl,
  };
}

describe("createParkingRepository", () => {
  it("只发起四组固定查询，补齐详情列而不增加逐车位查询", async () => {
    const { client, from, queries } = makeClient();

    const repository = createParkingRepository(client, logger);
    const result = await repository.readSlotFacts();

    expect(from).toHaveBeenCalledTimes(4);
    expect(queries).toHaveLength(4);
    expect(queries.map((query) => query.table)).toEqual([
      "slots",
      "parking_sessions",
      "reservations",
      "leases",
    ]);
    expect(queries[1].columns).toContain("payments!payments_session_id_fkey");
    expect(queries[1].columns).toContain("plate,entered_at,photo_path");
    expect(queries[2].columns).toContain("guest_name,note");
    expect(queries[3].columns).toContain("payments!payments_lease_id_fkey");
    expect(queries[3].columns).toContain("tenant_name,phone");
    expect(queries.map((query) => query.filter)).toEqual([
      "sort_order",
      "left_at=null",
      "closed_at=null",
      "ended_on=null",
    ]);
    expect(result.slots).toHaveLength(1);
  });

  it("详情请求照片时生成十分钟有效的签名地址，读取事实不签名", async () => {
    const { client, from, createSignedUrl } = makeClient(
      undefined,
      "family/secret.png",
    );

    const repository = createParkingRepository(client, logger);
    const result = await repository.readSlotFacts();

    expect(from).toHaveBeenCalledTimes(4);
    expect(createSignedUrl).not.toHaveBeenCalled();
    expect(result.sessions[0].photo_path).toBe("family/secret.png");
    expect(await repository.getPhotoSignedUrl("family/secret.png")).toBe(
      "https://example.com/signed-photo",
    );
    expect(createSignedUrl).toHaveBeenCalledWith("family/secret.png", 600);
  });

  it("签名失败只记录不带车牌和路径的警告，不抛异常", async () => {
    const { client, createSignedUrl } = makeClient(
      undefined,
      "family/secret.png",
    );
    createSignedUrl.mockResolvedValueOnce({
      data: null,
      error: new Error("secret storage failure"),
    });
    vi.mocked(logger.warn).mockClear();

    const result = await createParkingRepository(
      client,
      logger,
    ).getPhotoSignedUrl("family/secret.png");

    expect(result).toBeNull();
    expect(logger.warn).toHaveBeenCalledOnce();
    const warning = JSON.stringify(vi.mocked(logger.warn).mock.calls);
    expect(warning).not.toContain("粤B12345");
    expect(warning).not.toContain("family/secret.png");
    expect(warning).not.toContain("secret storage failure");
  });

  it("签名过程抛出异常时返回 null", async () => {
    const { client, createSignedUrl } = makeClient(
      undefined,
      "family/secret.png",
    );
    createSignedUrl.mockRejectedValueOnce(new Error("secret exception"));

    const result = await createParkingRepository(
      client,
      logger,
    ).getPhotoSignedUrl("family/secret.png");

    expect(result).toBeNull();
  });

  it("数据库失败转换为安全的 RepositoryError，不泄漏原始信息", async () => {
    const { client } = makeClient("leases");
    vi.mocked(logger.error).mockClear();

    await expect(
      createParkingRepository(client, logger).readSlotFacts(),
    ).rejects.toMatchObject({
      code: "parking_unavailable",
      message: "车位状态暂时无法读取，请稍后重试。",
    });
    expect(logger.error).toHaveBeenCalledOnce();
  });
});

function makeRpcClient(
  response: {
    data: string | null;
    error: {
      code: string;
      details?: string | null;
      hint?: string | null;
      message?: string;
    } | null;
  },
  options: { slotOccupied?: boolean; plateSlot?: string } = {},
) {
  const rpc = vi.fn().mockResolvedValue(response);
  const from = vi.fn((table: string) => ({
    select: vi.fn((columns: string) => ({
      single: vi.fn().mockResolvedValue({
        data:
          table === "pricing_settings"
            ? {
                hotel_daily_price_cents: 3000,
                hotel_checkout_hour: 12,
                hotel_previous_day_before_hour: 6,
                hourly_price_cents: 500,
              }
            : { name: "4号" },
        error: null,
      }),
      eq: vi.fn(() => ({
        single: vi
          .fn()
          .mockResolvedValue({ data: { name: "4号" }, error: null }),
        is: vi.fn(() => ({
          limit: vi.fn().mockResolvedValue({
            data: options.slotOccupied ? [{ id: "occupied" }] : [],
            error: null,
          }),
          maybeSingle: vi.fn().mockResolvedValue({
            data: options.plateSlot ? { slot_code: options.plateSlot } : null,
            error: null,
          }),
        })),
      })),
    })),
  }));
  return {
    rpc,
    from,
    client: { rpc, from } as unknown as AuthenticatedSupabaseClient,
  };
}

const rpcInput = {
  slotCode: "3",
  plate: "粤B12345",
  billingType: "hotel_daily" as const,
  paidUntil: "2026-11-21T04:00:00.000Z",
  borrowMinutes: null,
  amountCents: 6000,
  paymentMethod: "wechat" as const,
};

describe("ParkingRepository RPC", () => {
  it("登记 RPC 传入全部受控参数并返回新停车记录 id", async () => {
    const { client, rpc } = makeRpcClient({
      data: "00000000-0000-4000-8000-000000000001",
      error: null,
    });
    const id = await createParkingRepository(client, logger).checkInVehicle(
      rpcInput,
    );
    expect(id).toBe("00000000-0000-4000-8000-000000000001");
    expect(rpc).toHaveBeenCalledWith("check_in_vehicle", {
      p_slot_code: "3",
      p_plate: "粤B12345",
      p_billing_type: "hotel_daily",
      p_paid_until: "2026-11-21T04:00:00.000Z",
      p_amount_cents: 6000,
      p_payment_method: "wechat",
    });
  });

  it("私人位直接传借用分钟数，不使用应用服务器时钟", async () => {
    const { client, rpc } = makeRpcClient({
      data: "00000000-0000-4000-8000-000000000001",
      error: null,
    });
    await createParkingRepository(client, logger).checkInVehicle({
      ...rpcInput,
      billingType: "hourly",
      paidUntil: null,
      amountCents: null,
      paymentMethod: null,
      borrowMinutes: 30,
    });
    expect(rpc).toHaveBeenCalledWith("check_in_vehicle", {
      p_slot_code: "3",
      p_plate: "粤B12345",
      p_billing_type: "hourly",
      p_borrow_minutes: 30,
    });
  });

  it("从 pricing_settings 读取收费参数", async () => {
    const { client } = makeRpcClient({ data: null, error: null });
    expect(
      await createParkingRepository(client, logger).getPricingSettings(),
    ).toMatchObject({ hotel_daily_price_cents: 3000 });
  });

  it("车位占用业务码映射为 ConflictError", async () => {
    const { client } = makeRpcClient({
      data: null,
      error: { code: "P0001", details: "SLOT_OCCUPIED" },
    });
    await expect(
      createParkingRepository(client, logger).checkInVehicle(rpcInput),
    ).rejects.toMatchObject({
      name: "ConflictError",
      code: "slot_occupied",
      message: "这个车位刚刚被登记了",
    });
  });

  it("同车牌冲突仅使用安全 hint 拼出车位号", async () => {
    const { client } = makeRpcClient({
      data: null,
      error: { code: "P0001", details: "PLATE_PRESENT", hint: "4号" },
    });
    await expect(
      createParkingRepository(client, logger).checkInVehicle(rpcInput),
    ).rejects.toMatchObject({
      name: "ConflictError",
      code: "plate_present",
      message: "这辆车已经停在 4号了",
    });
  });

  it("23505 竞争冲突按当前占用事实区分车位和车牌", async () => {
    const collision = {
      data: null,
      error: { code: "23505", message: "secret index name" },
    };
    const slot = makeRpcClient(collision, { slotOccupied: true });
    await expect(
      createParkingRepository(slot.client, logger).checkInVehicle(rpcInput),
    ).rejects.toMatchObject({ code: "slot_occupied" });

    const plate = makeRpcClient(collision, { plateSlot: "4" });
    await expect(
      createParkingRepository(plate.client, logger).checkInVehicle(rpcInput),
    ).rejects.toMatchObject({
      code: "plate_present",
      message: "这辆车已经停在 4号了",
    });
  });

  it("输入与缺少长租错误映射为 ValidationError", async () => {
    for (const [details, code] of [
      ["INVALID_INPUT", "invalid_input"],
      ["LEASE_UNAVAILABLE", "lease_unavailable"],
      ["SLOT_UNAVAILABLE", "slot_unavailable"],
    ]) {
      const { client } = makeRpcClient({
        data: null,
        error: { code: "P0001", details },
      });
      await expect(
        createParkingRepository(client, logger).checkInVehicle(rpcInput),
      ).rejects.toMatchObject({ name: "ValidationError", code });
    }
  });

  it("非家庭账号权限错误映射为 AuthorizationError", async () => {
    const { client } = makeRpcClient({
      data: null,
      error: { code: "42501", details: "FAMILY_REQUIRED" },
    });
    await expect(
      createParkingRepository(client, logger).checkInVehicle(rpcInput),
    ).rejects.toMatchObject({ name: "AuthorizationError" });
  });

  it("撤销成功与不允许撤销分别正确处理", async () => {
    const success = makeRpcClient({ data: null, error: null });
    await createParkingRepository(success.client, logger).undoCheckIn(
      "00000000-0000-4000-8000-000000000001",
    );
    expect(success.rpc).toHaveBeenCalledWith("undo_check_in", {
      p_session_id: "00000000-0000-4000-8000-000000000001",
    });

    const failed = makeRpcClient({
      data: null,
      error: { code: "P0001", details: "UNDO_UNAVAILABLE" },
    });
    await expect(
      createParkingRepository(failed.client, logger).undoCheckIn(
        "00000000-0000-4000-8000-000000000001",
      ),
    ).rejects.toMatchObject({
      name: "ConflictError",
      message: "已经不能撤销了",
    });
  });

  it("撤销时遇到 23505 也映射为不能撤销", async () => {
    const { client } = makeRpcClient({
      data: null,
      error: { code: "23505", message: "private index" },
    });
    await expect(
      createParkingRepository(client, logger).undoCheckIn(
        "00000000-0000-4000-8000-000000000001",
      ),
    ).rejects.toMatchObject({ code: "undo_unavailable" });
  });

  it("未知原始 RPC 错误不泄漏数据库 message", async () => {
    const { client } = makeRpcClient({
      data: null,
      error: { code: "XX000", message: "secret table leak" },
    });
    await expect(
      createParkingRepository(client, logger).checkInVehicle(rpcInput),
    ).rejects.toMatchObject({
      name: "RepositoryError",
      code: "parking_unavailable",
    });
  });
});
