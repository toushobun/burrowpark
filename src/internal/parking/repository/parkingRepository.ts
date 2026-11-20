import "server-only";

import {
  AuthorizationError,
  ConflictError,
  RepositoryError,
  ValidationError,
} from "internal/shared/errors/appError";
import {
  findRpcBusinessError,
  isRpcUniqueViolation,
  toConcurrentModificationError,
} from "internal/shared/supabase/rpcError";
import type { Logger } from "internal/shared/logging/logger";
import type { AuthenticatedSupabaseClient } from "internal/shared/supabase/authenticatedClient";
import type { Enums, Tables } from "internal/shared/supabase/database.types";

import type {
  ParkingBillingType,
  ParkingPricingSettings,
} from "../entity/parkingDomain";

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

export type CheckInRpcInput = {
  slotCode: string;
  plate: string;
  billingType: ParkingBillingType;
  paidUntil: string | null;
  borrowUntil: string | null;
  amountCents: number | null;
  paymentMethod: Enums<"payment_method"> | null;
};

const checkInBusinessCodes = {
  SLOT_OCCUPIED: "slot_occupied",
  PLATE_PRESENT: "plate_present",
  SLOT_UNAVAILABLE: "slot_unavailable",
  LEASE_UNAVAILABLE: "lease_unavailable",
  INVALID_INPUT: "invalid_input",
  FAMILY_REQUIRED: "family_required",
} as const;

function plateOccupiedError(name: string | null | undefined): ConflictError {
  // hint 只接收来自车位主数据的受控名称，不展示数据库原始异常内容。
  const safeName = name && /^\d+号$/.test(name) ? name : "其他车位";
  return new ConflictError(
    "plate_present",
    "这辆车已经停在 " + safeName + " 了",
  );
}

export interface ParkingRepository {
  readSlotFacts(): Promise<SlotFactsRows>;
  getPhotoSignedUrl(photoPath: string): Promise<string | null>;
  getPricingSettings(): Promise<ParkingPricingSettings>;
  checkInVehicle(input: CheckInRpcInput): Promise<string>;
  undoCheckIn(sessionId: string): Promise<void>;
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

  async function getPricingSettings(): Promise<ParkingPricingSettings> {
    try {
      const { data, error } = await supabase
        .from("pricing_settings")
        .select(
          "hotel_daily_price_cents,hotel_checkout_hour,hotel_previous_day_before_hour,hourly_price_cents",
        )
        .single();
      if (error || !data) return fail("getPricingSettings", error);
      return data;
    } catch (error) {
      if (error instanceof RepositoryError) throw error;
      return fail("getPricingSettings", error);
    }
  }

  async function resolveUniqueConflict(
    input: CheckInRpcInput,
  ): Promise<ConflictError> {
    // 数据库 UNIQUE 约束是第二道防线；分类依据占用事实，绝不解析原始 message。
    const [slot, plate] = await Promise.all([
      supabase
        .from("parking_sessions")
        .select("id")
        .eq("slot_code", input.slotCode)
        .is("left_at", null)
        .limit(1),
      supabase
        .from("parking_sessions")
        .select("slot_code")
        .eq("plate", input.plate)
        .is("left_at", null)
        .maybeSingle(),
    ]);
    if (slot.error || plate.error) {
      return fail("resolveUniqueConflict", slot.error ?? plate.error);
    }
    if (slot.data?.length) {
      return new ConflictError("slot_occupied", parkingMessages.slotOccupied);
    }
    if (plate.data) {
      const match = await supabase
        .from("slots")
        .select("name")
        .eq("code", plate.data.slot_code)
        .single();
      if (match.error) return fail("resolvePlateSlot", match.error);
      return plateOccupiedError(match.data?.name);
    }
    return new ConflictError("slot_occupied", parkingMessages.slotOccupied);
  }

  return {
    getPhotoSignedUrl: signPhotoUrl,
    getPricingSettings,
    async checkInVehicle(input) {
      try {
        const { data, error } = await supabase.rpc("check_in_vehicle", {
          p_slot_code: input.slotCode,
          p_plate: input.plate,
          p_billing_type: input.billingType,
          ...(input.paidUntil !== null
            ? { p_paid_until: input.paidUntil }
            : {}),
          ...(input.borrowUntil !== null
            ? { p_borrow_until: input.borrowUntil }
            : {}),
          ...(input.amountCents !== null
            ? { p_amount_cents: input.amountCents }
            : {}),
          ...(input.paymentMethod !== null
            ? { p_payment_method: input.paymentMethod }
            : {}),
        });
        if (error) {
          const code = findRpcBusinessError(error, checkInBusinessCodes);
          switch (code) {
            case "slot_occupied":
              throw new ConflictError(code, parkingMessages.slotOccupied);
            case "plate_present":
              throw plateOccupiedError(error.hint);
            case "slot_unavailable":
              throw new ValidationError(code, parkingMessages.slotUnavailable);
            case "lease_unavailable":
              throw new ValidationError(code, parkingMessages.leaseUnavailable);
            case "invalid_input":
              throw new ValidationError(code, parkingMessages.invalidInput);
            case "family_required":
              throw new AuthorizationError(code, parkingMessages.invalidInput);
          }
          if (isRpcUniqueViolation(error)) {
            throw await resolveUniqueConflict(input);
          }
          const conflict = toConcurrentModificationError(
            error,
            logger,
            "check_in_vehicle",
          );
          if (conflict) throw conflict;
          return fail("checkInVehicle", error);
        }
        if (!data) return fail("checkInVehicleEmpty", null);
        return data;
      } catch (error) {
        if (
          error instanceof ConflictError ||
          error instanceof ValidationError ||
          error instanceof AuthorizationError ||
          error instanceof RepositoryError
        )
          throw error;
        return fail("checkInVehicle", error);
      }
    },
    async undoCheckIn(sessionId) {
      try {
        const { error } = await supabase.rpc("undo_check_in", {
          p_session_id: sessionId,
        });
        if (!error) return;
        const code = findRpcBusinessError(error, {
          UNDO_UNAVAILABLE: "undo_unavailable",
          FAMILY_REQUIRED: "family_required",
        });
        if (code === "undo_unavailable" || isRpcUniqueViolation(error)) {
          throw new ConflictError(
            "undo_unavailable",
            parkingMessages.cannotUndo,
          );
        }
        if (code === "family_required") {
          throw new AuthorizationError(code, parkingMessages.invalidInput);
        }
        const conflict = toConcurrentModificationError(
          error,
          logger,
          "undo_check_in",
        );
        if (conflict) throw conflict;
        return fail("undoCheckIn", error);
      } catch (error) {
        if (
          error instanceof ConflictError ||
          error instanceof AuthorizationError ||
          error instanceof RepositoryError
        )
          throw error;
        return fail("undoCheckIn", error);
      }
    },
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
