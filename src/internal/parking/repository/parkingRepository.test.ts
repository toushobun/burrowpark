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

    const result = await createParkingRepository(
      client,
      logger,
    ).readSlotFacts();

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

  it("存在进场照片时生成十分钟有效的签名地址", async () => {
    const { client, from, createSignedUrl } = makeClient(
      undefined,
      "family/secret.png",
    );

    const result = await createParkingRepository(client, logger).readSlotFacts();

    expect(from).toHaveBeenCalledTimes(4);
    expect(createSignedUrl).toHaveBeenCalledWith("family/secret.png", 600);
    expect(result.sessions[0].photoUrl).toBe(
      "https://example.com/signed-photo",
    );
  });

  it("签名失败只记录不带车牌和路径的警告，仍返回车位事实", async () => {
    const { client, createSignedUrl } = makeClient(
      undefined,
      "family/secret.png",
    );
    createSignedUrl.mockResolvedValueOnce({
      data: null,
      error: new Error("secret storage failure"),
    });
    vi.mocked(logger.warn).mockClear();

    const result = await createParkingRepository(client, logger).readSlotFacts();

    expect(result.sessions[0].photoUrl).toBeNull();
    expect(logger.warn).toHaveBeenCalledOnce();
    const warning = JSON.stringify(vi.mocked(logger.warn).mock.calls);
    expect(warning).not.toContain("粤B12345");
    expect(warning).not.toContain("family/secret.png");
    expect(warning).not.toContain("secret storage failure");
  });

  it("签名过程抛出异常时仍返回车位事实", async () => {
    const { client, createSignedUrl } = makeClient(
      undefined,
      "family/secret.png",
    );
    createSignedUrl.mockRejectedValueOnce(new Error("secret exception"));

    const result = await createParkingRepository(client, logger).readSlotFacts();

    expect(result.sessions[0].photoUrl).toBeNull();
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
