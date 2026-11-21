// @vitest-environment node

import { describe, expect, it, vi } from "vitest";
import type { Logger } from "internal/shared/logging/logger";

const makeSupabase = vi.hoisted(() => vi.fn());
vi.mock("internal/shared/supabase/serviceRoleClient", () => ({
  createServiceRoleSupabaseClient: makeSupabase,
}));

import { createPhotoCleanupRepository } from "./photoCleanupRepository";

const logger: Logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };

describe("photoCleanupRepository", () => {
  it("只筛选离场和照片均非空的记录，按离场时间升序且最多200条", async () => {
    const limit = vi.fn().mockResolvedValue({
      data: [{ id: "a", photo_path: "a.jpg" }], error: null,
    });
    const order = vi.fn(() => ({ limit }));
    const lt = vi.fn(() => ({ order }));
    const not = vi.fn().mockReturnThis();
    const select = vi.fn(() => ({ not, lt }));
    const from = vi.fn(() => ({ select }));
    makeSupabase.mockReturnValue({ from });
    const repository = createPhotoCleanupRepository(logger);
    const result = await repository.listExpired("2026-08-01T00:00:00.000Z", 500);
    expect(result).toEqual([{ id: "a", path: "a.jpg" }]);
    expect(from).toHaveBeenCalledWith("parking_sessions");
    expect(not).toHaveBeenCalledWith("photo_path", "is", null);
    expect(not).toHaveBeenCalledWith("left_at", "is", null);
    expect(lt).toHaveBeenCalledWith("left_at", "2026-08-01T00:00:00.000Z");
    expect(order).toHaveBeenCalledWith("left_at", { ascending: true });
    expect(limit).toHaveBeenCalledWith(200);
  });

  it("Storage只返回确认删除的完整路径，失败则不记成功", async () => {
    const remove = vi.fn().mockResolvedValue({ data: [{ name: "a.jpg" }], error: null });
    makeSupabase.mockReturnValue({
      storage: { from: vi.fn(() => ({ remove })) },
    });
    const repository = createPhotoCleanupRepository(logger);
    expect(await repository.removeFromStorage(["a.jpg", "b.jpg"])).toEqual(["a.jpg"]);
    expect(remove).toHaveBeenCalledWith(["a.jpg", "b.jpg"]);
    remove.mockResolvedValue({ data: null, error: { name: "StorageError" } });
    expect(await repository.removeFromStorage(["a.jpg", "b.jpg"])).toEqual([]);
    expect(await repository.removeFromStorage([])).toEqual([]);
  });

  it("只清空符合已删ID、原路径和截止时间的记录", async () => {
    const select = vi.fn().mockResolvedValue({ data: [{ id: "a" }], error: null });
    const lt = vi.fn(() => ({ select }));
    const inFilter = vi.fn().mockReturnThis();
    const eq = vi.fn().mockReturnThis();
    const update = vi.fn(() => ({ in: inFilter, lt, eq }));
    makeSupabase.mockReturnValue({ from: vi.fn(() => ({ update })) });
    const repository = createPhotoCleanupRepository(logger);
    expect(await repository.clearDeletedPaths([{ id: "a", path: "a.jpg" }], "2026-08-01T00:00:00.000Z")).toBe(1);
    expect(inFilter).toHaveBeenCalledWith("id", ["a"]);
    expect(inFilter).toHaveBeenCalledWith("photo_path", ["a.jpg"]);
    expect(lt).toHaveBeenCalledWith("left_at", "2026-08-01T00:00:00.000Z");
  });
});
