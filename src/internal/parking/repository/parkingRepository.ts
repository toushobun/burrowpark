import "server-only";

import { RepositoryError } from "internal/shared/errors/appError";
import type { Logger } from "internal/shared/logging/logger";
import type { AuthenticatedSupabaseClient } from "internal/shared/supabase/authenticatedClient";
import type { Tables } from "internal/shared/supabase/database.types";

import { parkingMessages } from "../errors";

export type SlotFactsRows = {
  slots: Pick<Tables<"slots">, "code" | "name" | "kind" | "is_active">[];
  sessions: (Pick<
    Tables<"parking_sessions">,
    | "id"
    | "slot_code"
    | "billing_type"
    | "borrow_until"
    | "lease_id"
    | "plate"
    | "entered_at"
    | "photo_path"
  > & {
    session_payments: Pick<Tables<"payments">, "paid_until">[];
  })[];
  reservations: Pick<
    Tables<"reservations">,
    "slot_code" | "guest_name" | "note"
  >[];
  leases: (Pick<
    Tables<"leases">,
    "id" | "slot_code" | "tenant_name" | "phone"
  > & {
    lease_payments: Pick<Tables<"payments">, "paid_until">[];
  })[];
};

export interface ParkingRepository {
  readSlotFacts(): Promise<SlotFactsRows>;
  getPhotoSignedUrl(photoPath: string): Promise<string | null>;
}

export function createParkingRepository(
  supabase: AuthenticatedSupabaseClient,
  logger: Logger,
): ParkingRepository {
  function fail(operation: string, error: unknown): never {
    logger.error("[parking] repository operation failed", {
      operation,
      errorName: error instanceof Error ? error.name : "unknown",
    });
    throw new RepositoryError(
      "parking_unavailable",
      parkingMessages.unavailable,
    );
  }

  async function signPhotoUrl(photoPath: string): Promise<string | null> {

    try {
      const { data, error } = await supabase.storage
        .from("plate-photos")
        .createSignedUrl(photoPath, 600);

      if (error || !data?.signedUrl) {
        logger.warn("[parking] plate photo signing failed", {
          errorName: error?.name ?? "unknown",
        });
        return null;
      }

      return data.signedUrl;
    } catch (error) {
      logger.warn("[parking] plate photo signing failed", {
        errorName: error instanceof Error ? error.name : "unknown",
      });
      return null;
    }
  }

  return {
    getPhotoSignedUrl: signPhotoUrl,
    async readSlotFacts() {
      try {
        // 关联收款在同一次数据库请求中读取，避免按车位 N+1 查询。
        const [slots, sessions, reservations, leases] = await Promise.all([
          supabase
            .from("slots")
            .select("code,name,kind,is_active")
            .order("sort_order"),
          supabase
            .from("parking_sessions")
            .select(
              "id,slot_code,billing_type,borrow_until,lease_id,plate,entered_at,photo_path,session_payments:payments!payments_session_id_fkey(paid_until)",
            )
            .is("left_at", null),
          supabase
            .from("reservations")
            .select("slot_code,guest_name,note")
            .is("closed_at", null),
          supabase
            .from("leases")
            .select(
              "id,slot_code,tenant_name,phone,lease_payments:payments!payments_lease_id_fkey(paid_until)",
            )
            .is("ended_on", null),
        ]);

        if (slots.error || !slots.data) {
          return fail("readSlots", slots.error);
        }
        if (sessions.error || !sessions.data) {
          return fail("readPresentSessions", sessions.error);
        }
        if (reservations.error || !reservations.data) {
          return fail("readOpenReservations", reservations.error);
        }
        if (leases.error || !leases.data) {
          return fail("readActiveLeases", leases.error);
        }

        return {
          slots: slots.data,
          sessions: sessions.data,
          reservations: reservations.data,
          leases: leases.data,
        };
      } catch (error) {
        if (error instanceof RepositoryError) throw error;
        return fail("readSlotFacts", error);
      }
    },
  };
}
