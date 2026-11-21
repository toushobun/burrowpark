import "server-only";

import type { Logger } from "internal/shared/logging/logger";
import { RepositoryError } from "internal/shared/errors/appError";
import { createServiceRoleSupabaseClient } from "internal/shared/supabase/serviceRoleClient";
import { maintenanceMessages } from "../errors";

export type ExpiredPlatePhoto = { id: string; path: string };

export interface PhotoCleanupRepository {
  listExpired(cutoff: string, limit: number): Promise<ExpiredPlatePhoto[]>;
  removeFromStorage(paths: string[]): Promise<string[]>;
  clearDeletedPaths(rows: ExpiredPlatePhoto[], cutoff: string): Promise<number>;
}

/** 仅此 Repository 创建 service_role Client，校验 Cron Secret 后才由惰性 Container 实例化。 */
export function createPhotoCleanupRepository(
  logger: Logger,
): PhotoCleanupRepository {
  const supabase = createServiceRoleSupabaseClient();

  function fail(operation: string, error: unknown): never {
    logger.error("[maintenance] repository operation failed", {
      operation,
      errorName: error instanceof Error ? error.name : "unknown",
    });
    throw new RepositoryError(
      "photo_cleanup_unavailable",
      maintenanceMessages.unavailable,
    );
  }

  return {
    async listExpired(cutoff, limit) {
      try {
        const { data, error } = await supabase
          .from("parking_sessions")
          .select("id,photo_path")
          .not("photo_path", "is", null)
          .not("left_at", "is", null)
          .lt("left_at", cutoff)
          .order("left_at", { ascending: true })
          .limit(Math.min(limit, 200));
        if (error || !data) return fail("listExpired", error);
        return data
          .filter(
            (row): row is { id: string; photo_path: string } =>
              typeof row.photo_path === "string",
          )
          .map((row) => ({ id: row.id, path: row.photo_path }));
      } catch (error) {
        if (error instanceof RepositoryError) throw error;
        return fail("listExpired", error);
      }
    },
    async removeFromStorage(paths) {
      if (!paths.length) return [];
      try {
        const bucket = supabase.storage.from("plate-photos");
        const { data, error } = await bucket.remove(paths);
        if (error) {
          logger.warn("[maintenance] storage remove failed", {
            errorName: error.name,
          });
          return [];
        }
        const requested = new Set(paths);
        const deleted = new Set(
          (data ?? [])
            .map((entry) => entry.name)
            .filter(
              (path): path is string =>
                typeof path === "string" && requested.has(path),
            ),
        );
        // Storage 已删除而数据库清空失败时，重试删除可能返回空数组。
        // 只有 Storage 确认对象不存在，才允许清空遗留的 photo_path。
        const unchecked = paths.filter((path) => !deleted.has(path));
        const concurrency = 10;
        for (let offset = 0; offset < unchecked.length; offset += concurrency) {
          const results = await Promise.all(
            unchecked.slice(offset, offset + concurrency).map(async (path) => {
              try {
                const { data: exists, error: checkError } =
                  await bucket.exists(path);
                if (checkError) {
                  logger.warn("[maintenance] storage existence check failed", {
                    errorName: checkError.name,
                  });
                  return null;
                }
                return exists === false ? path : null;
              } catch (checkError) {
                logger.warn("[maintenance] storage existence check failed", {
                  errorName:
                    checkError instanceof Error ? checkError.name : "unknown",
                });
                return null;
              }
            }),
          );
          results.forEach((path) => {
            if (path) deleted.add(path);
          });
        }
        return [...deleted];
      } catch (error) {
        logger.warn("[maintenance] storage remove failed", {
          errorName: error instanceof Error ? error.name : "unknown",
        });
        return [];
      }
    },
    async clearDeletedPaths(rows, cutoff) {
      if (!rows.length) return 0;
      try {
        let removed = 0;
        // 每条记录与删除成功的原路径精确配对，避免两个独立 IN 条件交叉匹配。
        // 分批并发，避免 200 条逐条串行请求拖慢 Hobby Cron。
        const concurrency = 10;
        for (let offset = 0; offset < rows.length; offset += concurrency) {
          const results = await Promise.all(
            rows.slice(offset, offset + concurrency).map(async (row) => {
              const { data, error } = await supabase
                .from("parking_sessions")
                .update({ photo_path: null })
                .eq("id", row.id)
                .eq("photo_path", row.path)
                .lt("left_at", cutoff)
                .select("id");
              if (error || !data) return fail("clearDeletedPaths", error);
              return data.length;
            }),
          );
          removed += results.reduce((sum, count) => sum + count, 0);
        }
        return removed;
      } catch (error) {
        if (error instanceof RepositoryError) throw error;
        return fail("clearDeletedPaths", error);
      }
    },
  };
}
