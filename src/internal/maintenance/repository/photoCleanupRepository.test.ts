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
      data: [{ id: "a", photo_path: "a.jpg" }],
      error: null,
    });
    const order = vi.fn(() => ({ limit }));
    const lt = vi.fn(() => ({ order }));
    const not = vi.fn().mockReturnThis();
    const select = vi.fn(() => ({ not, lt }));
    const from = vi.fn(() => ({ select }));
    makeSupabase.mockReturnValue({ from });
    const repository = createPhotoCleanupRepository(logger);
    const result = await repository.listExpired(
      "2026-08-01T00:00:00.000Z",
      500,
    );
    expect(result).toEqual([{ id: "a", path: "a.jpg" }]);
    expect(from).toHaveBeenCalledWith("parking_sessions");
    expect(not).toHaveBeenCalledWith("photo_path", "is", null);
    expect(not).toHaveBeenCalledWith("left_at", "is", null);
    expect(lt).toHaveBeenCalledWith("left_at", "2026-08-01T00:00:00.000Z");
    expect(order).toHaveBeenCalledWith("left_at", { ascending: true });
    expect(limit).toHaveBeenCalledWith(200);
  });

  it("Storage只返回确认删除的完整路径，失败则不记成功", async () => {
    const remove = vi
      .fn()
      .mockResolvedValue({ data: [{ name: "a.jpg" }], error: null });
    makeSupabase.mockReturnValue({
      storage: { from: vi.fn(() => ({ remove })) },
    });
    const repository = createPhotoCleanupRepository(logger);
    expect(await repository.removeFromStorage(["a.jpg", "b.jpg"])).toEqual([
      "a.jpg",
    ]);
    expect(remove).toHaveBeenCalledWith(["a.jpg", "b.jpg"]);
    remove.mockResolvedValue({ data: null, error: { name: "StorageError" } });
    expect(await repository.removeFromStorage(["a.jpg", "b.jpg"])).toEqual([]);
    expect(await repository.removeFromStorage([])).toEqual([]);
  });

  it("逐条按 ID、原路径和截止时间精确配对，不允许跨记录匹配", async () => {
    const select = vi.fn().mockResolvedValue({ data: [{ id: "a" }], error: null });
    const lt = vi.fn(() => ({ select }));
    const eq = vi.fn().mockReturnThis();
    const update = vi.fn(() => ({ eq }));
    makeSupabase.mockReturnValue({ from: vi.fn(() => ({ update })) });
    const repository = createPhotoCleanupRepository(logger);
    const cutoff = "2026-08-01T00:00:00.000Z";
    expect(
      await repository.clearDeletedPaths(
        [
          { id: "a", path: "a.jpg" },
          { id: "b", path: "b.jpg" },
        ],
        cutoff,
      ),
    ).toBe(2);
    expect(eq.mock.calls).toEqual([
      ["id", "a"],
      ["photo_path", "a.jpg"],
      ["id", "b"],
      ["photo_path", "b.jpg"],
    ]);
    expect(lt).toHaveBeenCalledTimes(2);
    expect(lt).toHaveBeenCalledWith("left_at", cutoff);
    expect(update).toHaveBeenCalledWith({ photo_path: null });
  });

  it("数据库更新失败时不计为已清空", async () => {
    const select = vi.fn().mockResolvedValue({
      data: null,
      error: { name: "PostgrestError" },
    });
    const query = {
      eq: vi.fn().mockReturnThis(),
      lt: vi.fn(() => ({ select })),
    };
    const update = vi.fn(() => query);
    makeSupabase.mockReturnValue({
      from: vi.fn(() => ({ update })),
    });
    const repository = createPhotoCleanupRepository(logger);
    await expect(
      repository.clearDeletedPaths(
        [{ id: "a", path: "a.jpg" }],
        "2026-08-01T00:00:00.000Z",
      ),
    ).rejects.toMatchObject({ code: "photo_cleanup_unavailable" });
  });
});
