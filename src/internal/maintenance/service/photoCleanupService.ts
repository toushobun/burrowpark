import {
  PLATE_PHOTO_CLEANUP_BATCH_SIZE,
  PLATE_PHOTO_RETENTION_DAYS,
} from "config/platePhotoRetention";
import type { Logger } from "internal/shared/logging/logger";
import type { PhotoCleanupRepository } from "../repository/photoCleanupRepository";

export type PhotoCleanupCounts = {
  checked: number;
  removed: number;
  failed: number;
};
export interface PhotoCleanupService {
  cleanup(): Promise<PhotoCleanupCounts>;
}

export function createPhotoCleanupService(
  repository: PhotoCleanupRepository,
  logger: Logger,
  now: () => Date = () => new Date(),
): PhotoCleanupService {
  return {
    async cleanup() {
      // 只处理已离场超过完整 90×24 小时的记录；上海时间无夏令时。
      const cutoff = new Date(
        now().getTime() - PLATE_PHOTO_RETENTION_DAYS * 86400000,
      ).toISOString();
      const photos = await repository.listExpired(
        cutoff,
        PLATE_PHOTO_CLEANUP_BATCH_SIZE,
      );
      const removedPaths = new Set(
        await repository.removeFromStorage(photos.map((row) => row.path)),
      );
      const confirmed = photos.filter((row) => removedPaths.has(row.path));
      const removed = await repository.clearDeletedPaths(confirmed, cutoff);
      const result = {
        checked: photos.length,
        removed,
        failed: photos.length - removed,
      };
      logger.info("[maintenance] plate photo cleanup", result);
      return result;
    },
  };
}
