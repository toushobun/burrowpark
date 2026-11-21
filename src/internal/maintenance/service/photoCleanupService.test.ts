// @vitest-environment node

import { describe, expect, it, vi } from "vitest";
import type { Logger } from "internal/shared/logging/logger";
import type { PhotoCleanupRepository } from "../repository/photoCleanupRepository";
import { createPhotoCleanupService } from "./photoCleanupService";

const logger: Logger = { error: vi.fn(), warn: vi.fn(), info: vi.fn() };
const rows = [{ id: "a", path: "one.jpg" }, { id: "b", path: "two.jpg" }];
function makeRepo(paths: string[]): PhotoCleanupRepository {
  return {
    listExpired: vi.fn().mockResolvedValue(rows),
    removeFromStorage: vi.fn().mockResolvedValue(paths),
    clearDeletedPaths: vi.fn().mockResolvedValue(paths.length),
  };
}
describe("createPhotoCleanupService", () => {
  it("以精确90天截止时间和200条上限读取", async () => {
    const repository = makeRepo(["one.jpg", "two.jpg"]);
    const now = () => new Date("2026-11-21T20:00:00.000Z");
    await createPhotoCleanupService(repository, logger, now).cleanup();
    expect(repository.listExpired).toHaveBeenCalledWith("2026-08-23T20:00:00.000Z", 200);
  });
  it("部分删除失败时只清空成功路径", async () => {
    const repository = makeRepo(["one.jpg"]);
    const result = await createPhotoCleanupService(repository, logger).cleanup();
    expect(repository.clearDeletedPaths).toHaveBeenCalledWith([rows[0]], expect.any(String));
    expect(result).toEqual({ checked: 2, removed: 1, failed: 1 });
  });
  it("Storage整批失败时不清空任何路径", async () => {
    const repository = makeRepo([]);
    const result = await createPhotoCleanupService(repository, logger).cleanup();
    expect(repository.clearDeletedPaths).toHaveBeenCalledWith([], expect.any(String));
    expect(result).toEqual({ checked: 2, removed: 0, failed: 2 });
  });
});
