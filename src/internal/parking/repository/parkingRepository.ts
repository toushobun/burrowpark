import "server-only";

import {
  AppError,
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
import type { RpcErrorLike } from "internal/shared/supabase/rpcError";
import type { Logger } from "internal/shared/logging/logger";
import type { AuthenticatedSupabaseClient } from "internal/shared/supabase/authenticatedClient";
import type { Enums, Tables } from "internal/shared/supabase/database.types";

import type {
  MonthlyPayment,
  ParkingBillingType,
  ParkingPricingSettings,
} from "../entity/parkingDomain";

import { parkingMessages } from "../errors";
import type { RecordSession, RecordLeasePayment } from "../entity/records";

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
    session_payments: (Pick<Tables<"payments">, "paid_until"> &
      Partial<
        Pick<
          Tables<"payments">,
          "id" | "amount_cents" | "paid_at" | "purpose" | "method"
        >
      >)[];
  })[];
  reservations: (Pick<
    Tables<"reservations">,
    "slot_code" | "guest_name" | "note"
  > &
    Partial<Pick<Tables<"reservations">, "id">>)[];
  leases: (Pick<
    Tables<"leases">,
    "id" | "slot_code" | "tenant_name" | "phone"
  > &
    Partial<Pick<Tables<"leases">, "starts_on" | "plate" | "note">> & {
      lease_payments: (Pick<Tables<"payments">, "paid_until"> &
        Partial<
          Pick<
            Tables<"payments">,
            "id" | "amount_cents" | "paid_at" | "purpose" | "method"
          >
        >)[];
    })[];
};

export type CheckInRpcInput = {
  slotCode: string;
  plate: string;
  billingType: ParkingBillingType;
  paidUntil: string | null;
  borrowMinutes: number | null;
  amountCents: number | null;
  paymentMethod: Enums<"payment_method"> | null;
};

const recordSessionColumns =
  "id,slot_code,plate,billing_type,entered_at,left_at,session_payments:payments!payments_session_id_fkey(id,amount_cents,method,purpose,paid_at,paid_until)" as const;

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
    "这辆车已经停在 " + safeName + "了",
  );
}

export interface ParkingRepository {
  readSlotFacts(): Promise<SlotFactsRows>;
  readSessionsByDate(start: string, end: string): Promise<RecordSession[]>;
  readSessionsByPlate(plate: string, limit: number): Promise<RecordSession[]>;
  readLeasePayments(input: {
    start?: string;
    end?: string;
    plate?: string;
    tenant?: string;
    slotCode?: string;
  }): Promise<RecordLeasePayment[]>;
  correctSessionPlate(id: string, plate: string): Promise<void>;
  correctPayment(
    id: string,
    cents: number,
    method: Enums<"payment_method">,
  ): Promise<void>;
  deletePayment(id: string): Promise<void>;
  readMonthlyPayments(start: string, end: string): Promise<MonthlyPayment[]>;
  countMonthlyEntries(start: string, end: string): Promise<number>;
  readSlotNames(): Promise<Pick<Tables<"slots">, "code" | "name">[]>;
  getPhotoSignedUrl(photoPath: string): Promise<string | null>;
  getPricingSettings(): Promise<ParkingPricingSettings>;
  updatePricingSettings(input: ParkingPricingSettings): Promise<void>;
  checkInVehicle(input: CheckInRpcInput): Promise<string>;
  savePlatePhoto(sessionId: string, path: string, photo: Blob): Promise<void>;
  deletePlatePhoto(path: string): Promise<void>;
  undoCheckIn(sessionId: string): Promise<void>;
  addRenewal(input: {
    sessionId: string | null;
    leaseId: string | null;
    amountCents: number;
    method: Enums<"payment_method">;
    paidUntil: string;
  }): Promise<string>;
  undoRenewal(paymentId: string): Promise<void>;
  checkOutVehicle(input: {
    sessionId: string;
    amountCents: number | null;
    paymentMethod: Enums<"payment_method"> | null;
  }): Promise<void>;
  undoCheckOut(sessionId: string): Promise<void>;
  updateSlotSettings(
    code: string,
    kind: "regular" | "private",
    isActive: boolean,
  ): Promise<void>;
  createLease(input: {
    slotCode: string;
    tenantName: string;
    phone: string | null;
    plate: string | null;
    startsOn: string;
    note: string | null;
    paidUntil: string;
    amountCents: number;
    paymentMethod: Enums<"payment_method">;
  }): Promise<string>;
  undoCreateLease(id: string): Promise<void>;
  updateLease(
    id: string,
    data: {
      tenant_name: string;
      phone: string | null;
      plate: string | null;
      note: string | null;
    },
  ): Promise<void>;
  endLease(id: string, endedOn: string): Promise<void>;
  undoEndLease(id: string): Promise<void>;
  createReservation(
    slotCode: string,
    guestName: string | null,
    note: string | null,
  ): Promise<string>;
  cancelReservation(id: string): Promise<void>;
  undoReservation(id: string): Promise<void>;
  undoCancelReservation(id: string): Promise<void>;
  extendBorrow(
    sessionId: string,
    minutes: number,
  ): Promise<{
    previous: string;
    current: string;
  }>;
  undoExtendBorrow(
    sessionId: string,
    previous: string,
    expectedCurrent: string,
  ): Promise<void>;
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

  function photoFailure(operation: string, error: unknown): never {
    logger.warn("[parking] plate photo operation failed", {
      operation,
      errorName: error instanceof Error ? error.name : "unknown",
    });
    throw new RepositoryError(
      "plate_photo_failed",
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

  function throwMutationError(operation: string, error: RpcErrorLike): never {
    const code = error.details?.trim();
    if (code === "FAMILY_REQUIRED")
      throw new AuthorizationError(
        "family_required",
        parkingMessages.invalidInput,
      );
    if (code === "PAYMENT_LOCKED")
      throw new ConflictError("payment_locked", parkingMessages.paymentLocked);
    if (code === "PAYMENT_UNAVAILABLE")
      throw new ValidationError(
        "payment_unavailable",
        parkingMessages.invalidInput,
      );
    if (code === "UNDO_UNAVAILABLE")
      throw new ConflictError("undo_unavailable", parkingMessages.cannotUndo);
    if (code === "LEASE_EXISTS")
      throw new ConflictError("lease_exists", parkingMessages.leaseExists);
    if (code === "SLOT_OCCUPIED")
      throw new ConflictError("slot_occupied", parkingMessages.slotOccupied);
    if (code === "LEASE_VEHICLE_PRESENT")
      throw new ConflictError(
        "lease_vehicle_present",
        parkingMessages.leaseVehiclePresent,
      );
    if (code === "RESERVATION_UNAVAILABLE")
      throw new ConflictError(
        "reservation_unavailable",
        parkingMessages.reservationUnavailable,
      );
    if (
      code === "SLOT_UNAVAILABLE" ||
      code === "SESSION_UNAVAILABLE" ||
      code === "LEASE_UNAVAILABLE" ||
      code === "INVALID_INPUT"
    )
      throw new ValidationError(
        "operation_invalid",
        parkingMessages.invalidInput,
      );
    if (isRpcUniqueViolation(error))
      throw new ConflictError(
        "unique_conflict",
        operation === "createLease"
          ? parkingMessages.leaseExists
          : parkingMessages.slotReserved,
      );
    const conflict = toConcurrentModificationError(error, logger, operation);
    if (conflict) throw conflict;
    return fail(operation, error);
  }

  async function runVoidRpc(
    operation:
      | "undo_create_lease"
      | "end_lease"
      | "undo_end_lease"
      | "cancel_reservation"
      | "undo_reservation"
      | "undo_cancel_reservation"
      | "undo_extend_borrow",
    args: {
      p_lease_id?: string;
      p_ended_on?: string;
      p_reservation_id?: string;
      p_session_id?: string;
      p_previous?: string;
      p_expected_current?: string;
    },
  ): Promise<void> {
    try {
      // 调用参数由具体方法限定；类型合并仅限仓库内部。
      const { error } = await supabase.rpc(
        operation,
        args as {
          p_lease_id: string;
          p_ended_on: string;
          p_reservation_id: string;
          p_session_id: string;
          p_previous: string;
          p_expected_current: string;
        },
      );
      if (error) throwMutationError(operation, error);
    } catch (error) {
      if (error instanceof AppError) throw error;
      return fail(operation, error);
    }
  }

  return {
    async readSessionsByDate(start, end) {
      try {
        // 当天续费的车可能在前几天进场且尚未离场，不能只按进出场时间筛选。
        const [sessions, payments] = await Promise.all([
          supabase
            .from("parking_sessions")
            .select(recordSessionColumns)
            .or(
              `and(entered_at.gte.${start},entered_at.lt.${end}),and(left_at.gte.${start},left_at.lt.${end})`,
            )
            .order("entered_at", { ascending: false }),
          supabase
            .from("payments")
            .select("session_id")
            .not("session_id", "is", null)
            .gte("paid_at", start)
            .lt("paid_at", end),
        ]);
        if (sessions.error || !sessions.data)
          return fail("readSessionsByDate", sessions.error);
        if (payments.error || !payments.data)
          return fail("readSessionPaymentsByDate", payments.error);
        const seen = new Set(sessions.data.map((session) => session.id));
        const additionalIds = [
          ...new Set(
            payments.data
              .map((payment) => payment.session_id)
              .filter((id): id is string => id !== null),
          ),
        ].filter((id) => !seen.has(id));
        if (additionalIds.length === 0) return sessions.data;
        const { data, error } = await supabase
          .from("parking_sessions")
          .select(recordSessionColumns)
          .in("id", additionalIds)
          .order("entered_at", { ascending: false });
        if (error || !data) return fail("readPaidSessionsByDate", error);
        return [...sessions.data, ...data].sort(
          (a, b) => Date.parse(b.entered_at) - Date.parse(a.entered_at),
        );
      } catch (error) {
        if (error instanceof RepositoryError) throw error;
        return fail("readSessionsByDate", error);
      }
    },
    async readSessionsByPlate(plate, limit) {
      try {
        const { data, error } = await supabase
          .from("parking_sessions")
          .select(recordSessionColumns)
          .eq("plate", plate)
          .order("entered_at", { ascending: false })
          .limit(Math.min(limit, 50));
        if (error || !data) return fail("readSessionsByPlate", error);
        return data;
      } catch (error) {
        if (error instanceof RepositoryError) throw error;
        return fail("readSessionsByPlate", error);
      }
    },
    async readLeasePayments(input) {
      try {
        let query = supabase
          .from("payments")
          .select(
            "id,amount_cents,method,purpose,paid_at,paid_until,leases:leases!inner(slot_code,tenant_name,plate)",
          )
          .not("lease_id", "is", null);
        if (input.start) query = query.gte("paid_at", input.start);
        if (input.end) query = query.lt("paid_at", input.end);
        if (input.plate) query = query.eq("leases.plate", input.plate);
        if (input.tenant) {
          // 转义用户输入中的 ILIKE 通配符，避免扩大查询范围。
          const escaped = input.tenant.replace(
            /[%_\\]/g,
            (value) => "\\" + value,
          );
          query = query.ilike("leases.tenant_name", "%" + escaped + "%");
        }
        if (input.slotCode)
          query = query.eq("leases.slot_code", input.slotCode);
        if (input.tenant || input.slotCode) query = query.limit(50);
        const { data, error } = await query.order("paid_at", {
          ascending: false,
        });
        if (error || !data) return fail("readLeasePayments", error);
        return data
          .filter((row) => row.leases !== null)
          .map((row) => ({
            id: row.id,
            amount_cents: row.amount_cents,
            method: row.method,
            purpose: row.purpose,
            paid_at: row.paid_at,
            paid_until: row.paid_until,
            leases: row.leases,
          }));
      } catch (error) {
        if (error instanceof RepositoryError) throw error;
        return fail("readLeasePayments", error);
      }
    },
    async correctSessionPlate(id, plate) {
      try {
        const { error } = await supabase.rpc("correct_session_plate", {
          p_session_id: id,
          p_plate: plate,
        });
        if (!error) return;
        const code = findRpcBusinessError(error, {
          PLATE_PRESENT: "plate_present",
          SESSION_UNAVAILABLE: "session_unavailable",
          INVALID_INPUT: "invalid_input",
          FAMILY_REQUIRED: "family_required",
        });
        if (code === "plate_present" || isRpcUniqueViolation(error))
          throw plateOccupiedError(error.hint);
        if (code === "family_required")
          throw new AuthorizationError(code, parkingMessages.invalidInput);
        if (code === "session_unavailable" || code === "invalid_input")
          throw new ValidationError(code, parkingMessages.invalidInput);
        const conflict = toConcurrentModificationError(
          error,
          logger,
          "correctSessionPlate",
        );
        if (conflict) throw conflict;
        return fail("correctSessionPlate", error);
      } catch (error) {
        if (error instanceof AppError) throw error;
        return fail("correctSessionPlate", error);
      }
    },
    async correctPayment(id, cents, method) {
      try {
        const { error } = await supabase.rpc("correct_payment", {
          p_payment_id: id,
          p_amount_cents: cents,
          p_method: method,
        });
        if (error) throwMutationError("correctPayment", error);
      } catch (error) {
        if (error instanceof AppError) throw error;
        return fail("correctPayment", error);
      }
    },
    async deletePayment(id) {
      try {
        const { error } = await supabase.rpc("delete_payment", {
          p_payment_id: id,
        });
        if (error) throwMutationError("deletePayment", error);
      } catch (error) {
        if (error instanceof AppError) throw error;
        return fail("deletePayment", error);
      }
    },
    async updatePricingSettings(input) {
      try {
        const { data, error } = await supabase
          .from("pricing_settings")
          .update(input)
          .eq("id", true)
          .select("id")
          .single();
        if (error || !data) return fail("updatePricingSettings", error);
      } catch (error) {
        if (error instanceof RepositoryError) throw error;
        return fail("updatePricingSettings", error);
      }
    },
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
          ...(input.borrowMinutes !== null
            ? { p_borrow_minutes: input.borrowMinutes }
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
    async savePlatePhoto(sessionId, path, photo) {
      try {
        const { error: uploadError } = await supabase.storage
          .from("plate-photos")
          .upload(path, photo, { contentType: "image/jpeg", upsert: false });
        if (uploadError) return photoFailure("upload", uploadError);

        let linked = false;
        let linkError: unknown = null;
        try {
          const { data, error } = await supabase
            .from("parking_sessions")
            .update({ photo_path: path })
            .eq("id", sessionId)
            .select("id")
            .single();
          linked = !error && !!data;
          linkError = error;
        } catch (error) {
          linkError = error;
        }
        if (!linked) {
          // DB 未记录照片路径时补偿清理，避免撤销无法定位孤立文件。
          let cleanupError: unknown = null;
          try {
            const { error } = await supabase.storage
              .from("plate-photos")
              .remove([path]);
            cleanupError = error;
          } catch (error) {
            cleanupError = error;
          }
          if (cleanupError) {
            logger.warn("[parking] plate photo cleanup failed", {
              operation: "cleanup",
              errorName:
                cleanupError instanceof Error ? cleanupError.name : "unknown",
            });
          }
          return photoFailure("updatePhotoPath", linkError);
        }
      } catch (error) {
        if (error instanceof RepositoryError) throw error;
        return photoFailure("savePlatePhoto", error);
      }
    },
    async deletePlatePhoto(path) {
      try {
        const { error } = await supabase.storage
          .from("plate-photos")
          .remove([path]);
        if (error) return photoFailure("remove", error);
      } catch (error) {
        if (error instanceof RepositoryError) throw error;
        return photoFailure("deletePlatePhoto", error);
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

    async addRenewal(input) {
      try {
        const { data, error } = await supabase
          .from("payments")
          .insert({
            session_id: input.sessionId,
            lease_id: input.leaseId,
            purpose: "renewal",
            amount_cents: input.amountCents,
            method: input.method,
            paid_until: input.paidUntil,
          })
          .select("id")
          .single();
        if (error || !data) return fail("addRenewal", error);
        return data.id;
      } catch (error) {
        if (error instanceof RepositoryError) throw error;
        return fail("addRenewal", error);
      }
    },
    async undoRenewal(paymentId) {
      try {
        const { error } = await supabase.rpc("undo_renewal", {
          p_payment_id: paymentId,
        });
        if (!error) return;
        const code = findRpcBusinessError(error, {
          UNDO_UNAVAILABLE: "undo_unavailable",
          FAMILY_REQUIRED: "family_required",
        });
        if (code === "undo_unavailable" || isRpcUniqueViolation(error))
          throw new ConflictError(
            "undo_unavailable",
            parkingMessages.cannotUndo,
          );
        if (code === "family_required")
          throw new AuthorizationError(code, parkingMessages.invalidInput);
        const conflict = toConcurrentModificationError(
          error,
          logger,
          "undo_renewal",
        );
        if (conflict) throw conflict;
        return fail("undoRenewal", error);
      } catch (error) {
        if (
          error instanceof ConflictError ||
          error instanceof AuthorizationError ||
          error instanceof RepositoryError
        )
          throw error;
        return fail("undoRenewal", error);
      }
    },
    async checkOutVehicle(input) {
      try {
        const { error } = await supabase.rpc("check_out_vehicle", {
          p_session_id: input.sessionId,
          ...(input.amountCents === null
            ? {}
            : { p_amount_cents: input.amountCents }),
          ...(input.paymentMethod === null
            ? {}
            : { p_payment_method: input.paymentMethod }),
        });
        if (!error) return;
        const code = findRpcBusinessError(error, {
          ALREADY_LEFT: "already_left",
          SESSION_UNAVAILABLE: "session_unavailable",
          INVALID_INPUT: "invalid_input",
          FAMILY_REQUIRED: "family_required",
        });
        if (code === "already_left")
          throw new ConflictError(code, parkingMessages.checkoutUnavailable);
        if (code === "session_unavailable" || code === "invalid_input")
          throw new ValidationError(code, parkingMessages.invalidInput);
        if (code === "family_required")
          throw new AuthorizationError(code, parkingMessages.invalidInput);
        if (isRpcUniqueViolation(error))
          throw new ConflictError(
            "already_left",
            parkingMessages.checkoutUnavailable,
          );
        const conflict = toConcurrentModificationError(
          error,
          logger,
          "check_out_vehicle",
        );
        if (conflict) throw conflict;
        return fail("checkOutVehicle", error);
      } catch (error) {
        if (
          error instanceof ConflictError ||
          error instanceof ValidationError ||
          error instanceof AuthorizationError ||
          error instanceof RepositoryError
        )
          throw error;
        return fail("checkOutVehicle", error);
      }
    },
    async undoCheckOut(sessionId) {
      try {
        const { error } = await supabase.rpc("undo_check_out", {
          p_session_id: sessionId,
        });
        if (!error) return;
        const code = findRpcBusinessError(error, {
          UNDO_UNAVAILABLE: "undo_unavailable",
          UNDO_OCCUPIED: "undo_occupied",
          FAMILY_REQUIRED: "family_required",
        });
        if (code === "undo_occupied" || isRpcUniqueViolation(error))
          throw new ConflictError(
            "undo_occupied",
            parkingMessages.checkoutUndoOccupied,
          );
        if (code === "undo_unavailable")
          throw new ConflictError(code, parkingMessages.cannotUndo);
        if (code === "family_required")
          throw new AuthorizationError(code, parkingMessages.invalidInput);
        const conflict = toConcurrentModificationError(
          error,
          logger,
          "undo_check_out",
        );
        if (conflict) throw conflict;
        return fail("undoCheckOut", error);
      } catch (error) {
        if (
          error instanceof ConflictError ||
          error instanceof AuthorizationError ||
          error instanceof RepositoryError
        )
          throw error;
        return fail("undoCheckOut", error);
      }
    },
    async createLease(input) {
      try {
        const { data, error } = await supabase.rpc("create_lease", {
          p_slot_code: input.slotCode,
          p_tenant_name: input.tenantName,
          p_phone: input.phone ?? "",
          p_plate: input.plate ?? "",
          p_starts_on: input.startsOn,
          p_note: input.note ?? "",
          p_paid_until: input.paidUntil,
          p_amount_cents: input.amountCents,
          p_payment_method: input.paymentMethod,
        });
        if (error) throwMutationError("createLease", error);
        if (!data) return fail("createLease", null);
        return data;
      } catch (error) {
        if (error instanceof AppError) throw error;
        return fail("createLease", error);
      }
    },
    undoCreateLease: (id) =>
      runVoidRpc("undo_create_lease", { p_lease_id: id }),
    async updateLease(id, data) {
      try {
        const result = await supabase
          .from("leases")
          .update(data)
          .eq("id", id)
          .is("ended_on", null)
          .select("id")
          .maybeSingle();
        if (result.error) return fail("updateLease", result.error);
        if (!result.data)
          throw new ConflictError(
            "lease_unavailable",
            parkingMessages.leaseUnavailable,
          );
      } catch (error) {
        if (error instanceof AppError) throw error;
        return fail("updateLease", error);
      }
    },
    endLease: (id, endedOn) =>
      runVoidRpc("end_lease", { p_lease_id: id, p_ended_on: endedOn }),
    undoEndLease: (id) => runVoidRpc("undo_end_lease", { p_lease_id: id }),
    async createReservation(slotCode, guestName, note) {
      try {
        const { data, error } = await supabase
          .from("reservations")
          .insert({
            slot_code: slotCode,
            guest_name: guestName,
            note,
          })
          .select("id")
          .single();
        if (error) {
          if (isRpcUniqueViolation(error))
            throw new ConflictError(
              "reservation_exists",
              parkingMessages.slotReserved,
            );
          throwMutationError("createReservation", error);
        }
        if (!data) return fail("createReservation", null);
        return data.id;
      } catch (error) {
        if (error instanceof AppError) throw error;
        return fail("createReservation", error);
      }
    },
    cancelReservation: (id) =>
      runVoidRpc("cancel_reservation", { p_reservation_id: id }),
    undoReservation: (id) =>
      runVoidRpc("undo_reservation", { p_reservation_id: id }),
    undoCancelReservation: (id) =>
      runVoidRpc("undo_cancel_reservation", { p_reservation_id: id }),
    async extendBorrow(sessionId, minutes) {
      try {
        const { data, error } = await supabase.rpc("extend_borrow", {
          p_session_id: sessionId,
          p_minutes: minutes,
        });
        if (error) throwMutationError("extend_borrow", error);
        if (!data?.[0]) return fail("extend_borrow", null);
        return {
          previous: data[0].previous_borrow_until,
          current: data[0].current_borrow_until,
        };
      } catch (error) {
        if (error instanceof AppError) throw error;
        return fail("extend_borrow", error);
      }
    },
    undoExtendBorrow: (sessionId, previous, expectedCurrent) =>
      runVoidRpc("undo_extend_borrow", {
        p_session_id: sessionId,
        p_previous: previous,
        p_expected_current: expectedCurrent,
      }),
    async updateSlotSettings(code, kind, isActive) {
      try {
        const { error } = await supabase.rpc("update_slot_settings", {
          p_code: code,
          p_kind: kind,
          p_is_active: isActive,
        });
        if (!error) return;
        const business = findRpcBusinessError(error, {
          FAMILY_REQUIRED: "family_required",
          SLOT_BUSY: "slot_busy",
          INVALID_KIND: "invalid_kind",
          SLOT_UNAVAILABLE: "slot_unavailable",
        });
        switch (business) {
          case "family_required":
            throw new AuthorizationError(
              business,
              parkingMessages.invalidInput,
            );
          case "slot_busy":
            throw new ConflictError(business, parkingMessages.slotSettingsBusy);
          case "invalid_kind":
            throw new ValidationError(
              business,
              parkingMessages.slotSettingsKindInvalid,
            );
          case "slot_unavailable":
            throw new ValidationError(
              business,
              parkingMessages.slotUnavailable,
            );
        }
        const conflict = toConcurrentModificationError(
          error,
          logger,
          "update_slot_settings",
        );
        if (conflict) throw conflict;
        return fail("updateSlotSettings", error);
      } catch (error) {
        if (
          error instanceof AuthorizationError ||
          error instanceof ConflictError ||
          error instanceof ValidationError ||
          error instanceof RepositoryError
        )
          throw error;
        return fail("updateSlotSettings", error);
      }
    },
    async readMonthlyPayments(start, end) {
      try {
        const { data, error } = await supabase
          .from("payments")
          .select(
            "id,amount_cents,method,purpose,paid_at,lease_id,parking_sessions:parking_sessions!payments_session_id_fkey(slot_code,plate,billing_type),leases:leases!payments_lease_id_fkey(slot_code,tenant_name)",
          )
          .gte("paid_at", start)
          .lt("paid_at", end)
          .order("paid_at", { ascending: false })
          .order("id", { ascending: false });
        if (error || !data) return fail("readMonthlyPayments", error);
        return data.map((row) => ({
          id: row.id,
          amountCents: row.amount_cents,
          method: row.method,
          purpose: row.purpose,
          paidAt: row.paid_at,
          leaseId: row.lease_id,
          slotCode:
            row.leases?.slot_code ?? row.parking_sessions?.slot_code ?? null,
          plate: row.parking_sessions?.plate ?? null,
          tenantName: row.leases?.tenant_name ?? null,
          billingType: row.parking_sessions?.billing_type ?? null,
        }));
      } catch (error) {
        if (error instanceof RepositoryError) throw error;
        return fail("readMonthlyPayments", error);
      }
    },
    async countMonthlyEntries(start, end) {
      try {
        const { count, error } = await supabase
          .from("parking_sessions")
          .select("id", { count: "exact", head: true })
          .gte("entered_at", start)
          .lt("entered_at", end);
        if (error || count === null) return fail("countMonthlyEntries", error);
        return count;
      } catch (error) {
        if (error instanceof RepositoryError) throw error;
        return fail("countMonthlyEntries", error);
      }
    },
    async readSlotNames() {
      try {
        const { data, error } = await supabase
          .from("slots")
          .select("code,name")
          .order("sort_order");
        if (error || !data) return fail("readSlotNames", error);
        return data;
      } catch (error) {
        if (error instanceof RepositoryError) throw error;
        return fail("readSlotNames", error);
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
              "id,slot_code,billing_type,borrow_until,lease_id,plate,entered_at,photo_path,session_payments:payments!payments_session_id_fkey(id,amount_cents,purpose,paid_at,paid_until)",
            )
            .is("left_at", null),
          supabase
            .from("reservations")
            .select("id,slot_code,guest_name,note")
            .is("closed_at", null),
          supabase
            .from("leases")
            .select(
              "id,slot_code,tenant_name,phone,plate,starts_on,note,lease_payments:payments!payments_lease_id_fkey(id,amount_cents,purpose,paid_at,paid_until,method)",
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
