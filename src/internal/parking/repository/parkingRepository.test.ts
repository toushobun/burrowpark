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

describe("续费与离场 Repository", () => {
  it("离场 RPC 只传受控的收款参数且无收款时省略可选字段", async () => {
    const { client, rpc } = makeRpcClient({ data: null, error: null });
    const repository = createParkingRepository(client, logger);
    await repository.checkOutVehicle({
      sessionId: "00000000-0000-4000-8000-000000000001",
      amountCents: 2500,
      paymentMethod: "wechat",
    });
    expect(rpc).toHaveBeenCalledWith("check_out_vehicle", {
      p_session_id: "00000000-0000-4000-8000-000000000001",
      p_amount_cents: 2500,
      p_payment_method: "wechat",
    });
    await repository.checkOutVehicle({
      sessionId: "00000000-0000-4000-8000-000000000001",
      amountCents: null,
      paymentMethod: null,
    });
    expect(rpc).toHaveBeenLastCalledWith("check_out_vehicle", {
      p_session_id: "00000000-0000-4000-8000-000000000001",
    });
  });
  it("离场重复与不完整收款错误分别映射冲突与校验错误", async () => {
    for (const [details, code] of [
      ["ALREADY_LEFT", "already_left"],
      ["INVALID_INPUT", "invalid_input"],
    ] as const) {
      const { client } = makeRpcClient({
        data: null,
        error: { code: "P0001", details },
      });
      await expect(
        createParkingRepository(client, logger).checkOutVehicle({
          sessionId: "00000000-0000-4000-8000-000000000001",
          amountCents: null,
          paymentMethod: null,
        }),
      ).rejects.toMatchObject({ code });
    }
  });
  it("撤销离场碰到唯一索引映射为稳定的车位占用提示", async () => {
    const { client } = makeRpcClient({
      data: null,
      error: { code: "23505", message: "secret" },
    });
    await expect(
      createParkingRepository(client, logger).undoCheckOut(
        "00000000-0000-4000-8000-000000000001",
      ),
    ).rejects.toMatchObject({
      name: "ConflictError",
      message: "这个车位已经停了别的车，不能撤销",
    });
  });
  it("撤销续费超时映射为不能撤销，非家庭权限不泄漏底层错误", async () => {
    const unavailable = makeRpcClient({
      data: null,
      error: {
        code: "P0001",
        details: "UNDO_UNAVAILABLE",
      },
    });
    await expect(
      createParkingRepository(unavailable.client, logger).undoRenewal(
        "00000000-0000-4000-8000-000000000001",
      ),
    ).rejects.toMatchObject({ code: "undo_unavailable" });
    const denied = makeRpcClient({
      data: null,
      error: {
        code: "42501",
        details: "FAMILY_REQUIRED",
      },
    });
    await expect(
      createParkingRepository(denied.client, logger).undoCheckOut(
        "00000000-0000-4000-8000-000000000001",
      ),
    ).rejects.toMatchObject({ name: "AuthorizationError" });
  });
  it("续费只对 payments 执行一次插入并返回收款 id", async () => {
    const single = vi.fn().mockResolvedValue({
      data: { id: "00000000-0000-4000-8000-000000000002" },
      error: null,
    });
    const select = vi.fn().mockReturnValue({ single });
    const insert = vi.fn().mockReturnValue({ select });
    const from = vi.fn().mockReturnValue({ insert });
    const client = { from } as unknown as AuthenticatedSupabaseClient;
    const id = await createParkingRepository(client, logger).addRenewal({
      sessionId: "00000000-0000-4000-8000-000000000001",
      leaseId: null,
      amountCents: 4000,
      method: "cash",
      paidUntil: "2026-12-21T04:00:00.000Z",
    });
    expect(id).toBe("00000000-0000-4000-8000-000000000002");
    expect(from).toHaveBeenCalledWith("payments");
    expect(insert).toHaveBeenCalledWith({
      session_id: "00000000-0000-4000-8000-000000000001",
      lease_id: null,
      purpose: "renewal",
      amount_cents: 4000,
      method: "cash",
      paid_until: "2026-12-21T04:00:00.000Z",
    });
  });
});

describe("长租、预留和再借的 Repository", () => {
  it("建立长租通过 create_lease 一次性写两张表", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: "00000000-0000-4000-8000-000000000001",
      error: null,
    });
    const client = { rpc } as unknown as AuthenticatedSupabaseClient;
    const result = await createParkingRepository(client, logger).createLease({
      slotCode: "1",
      tenantName: "王先生",
      phone: null,
      plate: "粤B12345",
      startsOn: "2026-11-19",
      note: null,
      paidUntil: "2026-12-19T15:59:59.000Z",
      amountCents: 30000,
      paymentMethod: "cash",
    });
    expect(result).toBe("00000000-0000-4000-8000-000000000001");
    expect(rpc).toHaveBeenCalledOnce();
    expect(rpc).toHaveBeenCalledWith(
      "create_lease",
      expect.objectContaining({
        p_amount_cents: 30000,
        p_payment_method: "cash",
      }),
    );
  });

  it("长租唯一索引冲突转为业务错误而不是数据库错误", async () => {
    const client = {
      rpc: vi.fn().mockResolvedValue({
        data: null,
        error: { code: "23505", details: null, message: "secret table" },
      }),
    } as unknown as AuthenticatedSupabaseClient;
    await expect(
      createParkingRepository(client, logger).createLease({
        slotCode: "1",
        tenantName: "王先生",
        phone: null,
        plate: null,
        startsOn: "2026-11-19",
        note: null,
        paidUntil: "2026-12-19T15:59:59.000Z",
        amountCents: 1000,
        paymentMethod: "cash",
      }),
    ).rejects.toMatchObject({
      name: "ConflictError",
      message: "这个车位已经有长租了",
    });
  });

  it("预留只对 reservations 插入一次并返回 ID", async () => {
    const single = vi.fn().mockResolvedValue({
      data: { id: "00000000-0000-4000-8000-000000000002" },
      error: null,
    });
    const select = vi.fn().mockReturnValue({ single });
    const insert = vi.fn().mockReturnValue({ select });
    const client = {
      from: vi.fn().mockReturnValue({ insert }),
    } as unknown as AuthenticatedSupabaseClient;
    expect(
      await createParkingRepository(client, logger).createReservation(
        "1",
        null,
        "下午到",
      ),
    ).toBe("00000000-0000-4000-8000-000000000002");
    expect(insert).toHaveBeenCalledWith({
      slot_code: "1",
      guest_name: null,
      note: "下午到",
    });
  });

  it("预留唯一索引冲突显示安全业务错误", async () => {
    const single = vi.fn().mockResolvedValue({
      data: null,
      error: { code: "23505", details: "", message: "secret table" },
    });
    const client = {
      from: vi.fn().mockReturnValue({
        insert: vi
          .fn()
          .mockReturnValue({ select: vi.fn().mockReturnValue({ single }) }),
      }),
    } as unknown as AuthenticatedSupabaseClient;
    await expect(
      createParkingRepository(client, logger).createReservation(
        "1",
        null,
        null,
      ),
    ).rejects.toMatchObject({
      name: "ConflictError",
      message: "这个车位已经有预留了",
    });
  });

  it("借用顺延使用原借到和新借到时间的数据库返回值", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [
        {
          previous_borrow_until: "2026-11-19T04:00:00.000Z",
          current_borrow_until: "2026-11-19T04:10:00.000Z",
        },
      ],
      error: null,
    });
    const client = { rpc } as unknown as AuthenticatedSupabaseClient;
    const result = await createParkingRepository(client, logger).extendBorrow(
      "00000000-0000-4000-8000-000000000003",
      10,
    );
    expect(result).toEqual({
      previous: "2026-11-19T04:00:00.000Z",
      current: "2026-11-19T04:10:00.000Z",
    });
    expect(rpc).toHaveBeenCalledWith("extend_borrow", {
      p_session_id: "00000000-0000-4000-8000-000000000003",
      p_minutes: 10,
    });
  });

  it("撤销借用的版本不匹配会返回明确冲突", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: { code: "P0001", details: "UNDO_UNAVAILABLE" },
    });
    const client = { rpc } as unknown as AuthenticatedSupabaseClient;
    await expect(
      createParkingRepository(client, logger).undoExtendBorrow(
        "00000000-0000-4000-8000-000000000003",
        "2026-11-19T04:00:00.000Z",
        "2026-11-19T04:10:00.000Z",
      ),
    ).rejects.toMatchObject({
      name: "ConflictError",
      message: "已经不能撤销了",
    });
  });
});

describe("车位设置 Repository", () => {
  it("使用单个 update_slot_settings RPC", async () => {
    const rpc = vi.fn().mockResolvedValue({ error: null });
    const client = { rpc } as unknown as AuthenticatedSupabaseClient;
    await createParkingRepository(client, logger).updateSlotSettings(
      "7",
      "private",
      false,
    );
    expect(rpc).toHaveBeenCalledOnce();
    expect(rpc).toHaveBeenCalledWith("update_slot_settings", {
      p_code: "7",
      p_kind: "private",
      p_is_active: false,
    });
  });
  it("车位正在使用时映射 ConflictError", async () => {
    const client = {
      rpc: vi.fn().mockResolvedValue({
        error: {
          code: "P0001",
          details: "SLOT_BUSY",
          message: "internal database details",
        },
      }),
    } as unknown as AuthenticatedSupabaseClient;
    await expect(
      createParkingRepository(client, logger).updateSlotSettings(
        "7",
        "private",
        false,
      ),
    ).rejects.toMatchObject({
      name: "ConflictError",
      code: "slot_busy",
      message: "有车、预留或长租的车位不能修改设置。",
    });
  });
  it("非家庭账号时映射 AuthorizationError", async () => {
    const client = {
      rpc: vi.fn().mockResolvedValue({
        error: { code: "42501", details: "FAMILY_REQUIRED" },
      }),
    } as unknown as AuthenticatedSupabaseClient;
    await expect(
      createParkingRepository(client, logger).updateSlotSettings(
        "7",
        "regular",
        true,
      ),
    ).rejects.toMatchObject({ name: "AuthorizationError" });
  });
});

describe("月统计 Repository", () => {
  const start = "2026-10-31T16:00:00.000Z";
  const end = "2026-11-30T16:00:00.000Z";

  function makeMonthlyClient(failTable?: string) {
    const paymentRows = [
      {
        id: "p-1",
        amount_cents: 12345,
        method: "wechat",
        purpose: "prepay",
        paid_at: "2026-11-01T04:00:00.000Z",
        lease_id: null,
        parking_sessions: {
          slot_code: "1",
          plate: "粤B12345",
          billing_type: "hotel_daily",
        },
        leases: null,
      },
      {
        id: "p-2",
        amount_cents: 500,
        method: "cash",
        purpose: "renewal",
        paid_at: "2026-11-02T04:00:00.000Z",
        lease_id: "lease-1",
        parking_sessions: null,
        leases: { slot_code: "2", tenant_name: "张女士" },
      },
      {
        id: "p-3",
        amount_cents: 100,
        method: "alipay",
        purpose: "settlement",
        paid_at: "2026-11-03T04:00:00.000Z",
        lease_id: null,
        parking_sessions: null,
        leases: null,
      },
    ];
    const payments = {
      gte: vi.fn(),
      lt: vi.fn(),
      order: vi.fn(),
    };
    payments.gte.mockReturnValue(payments);
    payments.lt.mockReturnValue(payments);
    payments.order
      .mockReturnValueOnce(payments)
      .mockResolvedValueOnce({
        data: failTable === "payments" ? null : paymentRows,
        error: failTable === "payments" ? new Error("private error") : null,
      });

    const entries = { gte: vi.fn(), lt: vi.fn() };
    entries.gte.mockReturnValue(entries);
    entries.lt.mockResolvedValue({
      count: failTable === "parking_sessions" ? null : 4,
      error:
        failTable === "parking_sessions" ? new Error("private error") : null,
    });

    const slots = { order: vi.fn() };
    slots.order.mockResolvedValue({
      data: failTable === "slots" ? null : [{ code: "1", name: "1号" }],
      error: failTable === "slots" ? new Error("private error") : null,
    });
    const selects = {
      payments: vi.fn(() => payments),
      parking_sessions: vi.fn(() => entries),
      slots: vi.fn(() => slots),
    };
    const from = vi.fn((table: keyof typeof selects) => ({
      select: selects[table],
    }));
    return {
      client: { from } as unknown as AuthenticatedSupabaseClient,
      payments,
      entries,
      slots,
      selects,
    };
  }

  it("payments 以 paid_at 半开区间查询并按 paid_at 倒序", async () => {
    const { client, payments, selects } = makeMonthlyClient();
    const repository = createParkingRepository(client, logger);
    const rows = await repository.readMonthlyPayments(start, end);
    expect(selects.payments).toHaveBeenCalledWith(
      expect.stringContaining("parking_sessions!payments_session_id_fkey"),
    );
    expect(selects.payments).toHaveBeenCalledWith(
      expect.stringContaining("leases!payments_lease_id_fkey"),
    );
    expect(payments.gte).toHaveBeenCalledWith("paid_at", start);
    expect(payments.lt).toHaveBeenCalledWith("paid_at", end);
    expect(payments.order).toHaveBeenNthCalledWith(1, "paid_at", {
      ascending: false,
    });
    expect(payments.order).toHaveBeenNthCalledWith(2, "id", {
      ascending: false,
    });
    expect(rows).toMatchObject([
      { slotCode: "1", plate: "粤B12345", billingType: "hotel_daily" },
      { slotCode: "2", tenantName: "张女士", leaseId: "lease-1" },
      { slotCode: null, tenantName: null, plate: null, billingType: null },
    ]);
  });

  it("parking_sessions 用 exact head 计数和 entered_at 半开区间", async () => {
    const { client, entries, selects } = makeMonthlyClient();
    const repository = createParkingRepository(client, logger);
    expect(await repository.countMonthlyEntries(start, end)).toBe(4);
    expect(selects.parking_sessions).toHaveBeenCalledWith("id", {
      count: "exact",
      head: true,
    });
    expect(entries.gte).toHaveBeenCalledWith("entered_at", start);
    expect(entries.lt).toHaveBeenCalledWith("entered_at", end);
  });

  it("slots 一次性读取车位名称而非当前在场事实", async () => {
    const { client, slots, selects } = makeMonthlyClient();
    const repository = createParkingRepository(client, logger);
    const names = await repository.readSlotNames();
    expect(names).toEqual([{ code: "1", name: "1号" }]);
    expect(selects.slots).toHaveBeenCalledWith("code,name");
    expect(slots.order).toHaveBeenCalledWith("sort_order");
  });

  it("数据库读取失败转换为安全 RepositoryError", async () => {
    for (const [table, call] of [
      ["payments", "readMonthlyPayments"],
      ["parking_sessions", "countMonthlyEntries"],
      ["slots", "readSlotNames"],
    ] as const) {
      const { client } = makeMonthlyClient(table);
      const repository = createParkingRepository(client, logger);
      const result =
        call === "readMonthlyPayments"
          ? repository.readMonthlyPayments(start, end)
          : call === "countMonthlyEntries"
            ? repository.countMonthlyEntries(start, end)
            : repository.readSlotNames();
      await expect(result).rejects.toMatchObject({
        code: "parking_unavailable",
        message: "车位状态暂时无法读取，请稍后重试。",
      });
    }
  });
});
