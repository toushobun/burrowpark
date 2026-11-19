import "server-only";

import { RepositoryError } from "internal/shared/errors/appError";
import type { Logger } from "internal/shared/logging/logger";
import type { AuthenticatedSupabaseClient } from "internal/shared/supabase/authenticatedClient";
import type { Tables } from "internal/shared/supabase/database.types";

import { parkingMessages } from "../errors";

export type SlotMapFactsRows = {
  slots: Pick<Tables<"slots">, "code" | "name" | "kind" | "is_active">[];
  sessions: (Pick<
    Tables<"parking_sessions">,
    "id" | "slot_code" | "billing_type" | "borrow_until" | "lease_id"
  > & { session_payments: Pick<Tables<"payments">, "paid_until">[] })[];
  reservations: Pick<Tables<"reservations">, "slot_code">[];
  leases: (Pick<Tables<"leases">, "id" | "slot_code"> & {
    lease_payments: Pick<Tables<"payments">, "paid_until">[];
  })[];
};

export interface ParkingRepository {
  readSlotMapFacts(): Promise<SlotMapFactsRows>;
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
    throw new RepositoryError("parking_unavailable", parkingMessages.unavailable);
  }

  return {
    async readSlotMapFacts() {
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
              "id,slot_code,billing_type,borrow_until,lease_id,session_payments:payments!payments_session_id_fkey(paid_until)",
            )
            .is("left_at", null),
          supabase
            .from("reservations")
            .select("slot_code")
            .is("closed_at", null),
          supabase
            .from("leases")
            .select(
              "id,slot_code,lease_payments:payments!payments_lease_id_fkey(paid_until)",
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
        return fail("readSlotMapFacts", error);
      }
    },
  };
}
