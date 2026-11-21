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
export function createPhotoCleanupRepository(logger: Logger): PhotoCleanupRepository {
  const supabase = createServiceRoleSupabaseClient();

  function fail(operation: string, error: unknown): never {
    logger.error("[maintenance] repository operation failed", {
      operation, errorName: error instanceof Error ? error.name : "unknown",
    });
    throw new RepositoryError("photo_cleanup_unavailable", maintenanceMessages.unavailable);
  }

  return {
    async listExpired(cutoff, limit) {
      try {
        const { data, error } = await supabase.from("parking_sessions")
          .select("id,photo_path").not("photo_path", "is", null)
          .not("left_at", "is", null).lt("left_at", cutoff)
          .order("left_at", { ascending: true }).limit(Math.min(limit, 200));
        if (error || !data) return fail("listExpired", error);
        return data.filter((row): row is { id: string; photo_path: string } =>
          typeof row.photo_path === "string").map((row) => ({ id: row.id, path: row.photo_path }));
      } catch (error) {
        if (error instanceof RepositoryError) throw error;
        return fail("listExpired", error);
      }
    },
    async removeFromStorage(paths) {
      if (!paths.length) return [];
      try {
        const { data, error } = await supabase.storage.from("plate-photos").remove(paths);
        if (error) {
          logger.warn("[maintenance] storage remove failed", { errorName: error.name });
          return [];
        }
        const requested = new Set(paths);
        return (data ?? []).map((entry) => entry.name)
          .filter((path): path is string => typeof path === "string" && requested.has(path));
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
        const { data, error } = await supabase.from("parking_sessions")
          .update({ photo_path: null })
          .in("id", rows.map((row) => row.id))
          .in("photo_path", rows.map((row) => row.path))
          .lt("left_at", cutoff)
          .select("id");
        if (error || !data) return fail("clearDeletedPaths", error);
        return data.length;
      } catch (error) {
        if (error instanceof RepositoryError) throw error;
        return fail("clearDeletedPaths", error);
      }
    },
  };
}
