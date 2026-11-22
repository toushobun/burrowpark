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

  it("Storage删除成功后仍存在的文件不计为成功，删除失败也不清库", async () => {
    const remove = vi
      .fn()
      .mockResolvedValue({ data: [{ name: "a.jpg" }], error: null });
    const exists = vi.fn().mockResolvedValue({ data: true, error: null });
    makeSupabase.mockReturnValue({
      storage: { from: vi.fn(() => ({ remove, exists })) },
    });
    const repository = createPhotoCleanupRepository(logger);
    expect(await repository.removeFromStorage(["a.jpg", "b.jpg"])).toEqual([
      "a.jpg",
    ]);
    expect(remove).toHaveBeenCalledWith(["a.jpg", "b.jpg"]);
    expect(exists).toHaveBeenCalledWith("b.jpg");
    remove.mockResolvedValue({ data: null, error: { name: "StorageError" } });
    expect(await repository.removeFromStorage(["a.jpg", "b.jpg"])).toEqual([]);
    expect(await repository.removeFromStorage([])).toEqual([]);
  });

  it("照片已在上次任务删除时，确认文件不存在后清理遗留路径", async () => {
    const remove = vi.fn().mockResolvedValue({ data: [], error: null });
    const exists = vi.fn().mockResolvedValue({ data: false, error: null });
    makeSupabase.mockReturnValue({
      storage: { from: vi.fn(() => ({ remove, exists })) },
    });
    const repository = createPhotoCleanupRepository(logger);
    expect(await repository.removeFromStorage(["2026/08/session.jpg"])).toEqual(
      ["2026/08/session.jpg"],
    );
    expect(exists).toHaveBeenCalledWith("2026/08/session.jpg");
  });

  it("Storage 存在性校验失败或抛异常时保留数据库路径", async () => {
    const remove = vi.fn().mockResolvedValue({ data: [], error: null });
    const exists = vi
      .fn()
      .mockResolvedValueOnce({
        data: null,
        error: { name: "StorageApiError" },
      })
      .mockRejectedValueOnce(new Error("private storage detail"));
    makeSupabase.mockReturnValue({
      storage: { from: vi.fn(() => ({ remove, exists })) },
    });
    const repository = createPhotoCleanupRepository(logger);
    vi.mocked(logger.warn).mockClear();
    expect(await repository.removeFromStorage(["a.jpg", "b.jpg"])).toEqual([]);
    expect(exists).toHaveBeenCalledTimes(2);
    const logs = JSON.stringify(vi.mocked(logger.warn).mock.calls);
    expect(logs).not.toContain("a.jpg");
    expect(logs).not.toContain("b.jpg");
    expect(logs).not.toContain("private storage detail");
  });

  it("逐条按 ID、原路径和截止时间精确配对，不允许跨记录匹配", async () => {
    const select = vi
      .fn()
      .mockResolvedValue({ data: [{ id: "a" }], error: null });
    const lt = vi.fn(() => ({ select }));
    const query = { eq: vi.fn().mockReturnThis(), lt };
    const update = vi.fn(() => query);
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
    expect(query.eq.mock.calls).toEqual([
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
