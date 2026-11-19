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

function makeClient(failedTable?: string) {
  const queries: { table: string; columns: string; filter: string }[] = [];
  const tables: Record<string, unknown[]> = {
    slots: [{ code: "1", name: "1号", kind: "regular", is_active: true }],
    parking_sessions: [],
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

  return {
    client: { from } as unknown as AuthenticatedSupabaseClient,
    from,
    queries,
  };
}

describe("createParkingRepository", () => {
  it("只发起四组固定查询，收款通过外键关联读取而不是逐车位查询", async () => {
    const { client, from, queries } = makeClient();

    const result = await createParkingRepository(client, logger).readSlotMapFacts();

    expect(from).toHaveBeenCalledTimes(4);
    expect(queries).toHaveLength(4);
    expect(queries.map((query) => query.table)).toEqual([
      "slots",
      "parking_sessions",
      "reservations",
      "leases",
    ]);
    expect(queries[1].columns).toContain("payments!payments_session_id_fkey");
    expect(queries[3].columns).toContain("payments!payments_lease_id_fkey");
    expect(queries.map((query) => query.filter)).toEqual([
      "sort_order",
      "left_at=null",
      "closed_at=null",
      "ended_on=null",
    ]);
    expect(result.slots).toHaveLength(1);
  });

  it("数据库失败转换为安全的 RepositoryError，不泄漏原始信息", async () => {
    const { client } = makeClient("leases");

    await expect(
      createParkingRepository(client, logger).readSlotMapFacts(),
    ).rejects.toMatchObject({
      code: "parking_unavailable",
      message: "车位状态暂时无法读取，请稍后重试。",
    });
  });
});
