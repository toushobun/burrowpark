import { monthlyStatsText } from "config/monthlyStatsText";
import {
  requireAuthenticatedUserId,
  type AuthContext,
} from "internal/shared/auth/authContext";
import type { SlotStatus } from "theme/slotStatusTokens";
import {
  ConflictError,
  RepositoryError,
  ValidationError,
} from "internal/shared/errors/appError";

import { parkingMessages } from "../errors";
import type { RecordSession, RecordLeasePayment } from "../entity/records";
import { buildPlatePhotoPath } from "../util/photoPath";
import {
  parseAmountCents,
  parseCheckInInput,
  parseCheckOutInput,
  parseRenewInput,
  parseUndoSessionId,
  parseSlotSettingsInput,
  recordPlateCorrectionSchema,
  recordPaymentCorrectionSchema,
  recordPaymentDeletionSchema,
  type RecordsFilter,
  pricingSettingsInputSchema,
  createLeaseInputSchema,
  editLeaseInputSchema,
  endLeaseInputSchema,
  reserveInputSchema,
  borrowExtensionSchema,
  borrowUndoSchema,
  parseParkingOperation,
} from "../schema";

import type {
  MonthlyPaymentSummary,
  ParkingBillingType,
  ParkingPricingSettings,
  ParkingSlotKind,
  SlotStatusFacts,
} from "../entity/parkingDomain";
import type {
  ParkingRepository,
  SlotFactsRows,
} from "../repository/parkingRepository";
import {
  calculateHotelCheckoutAt,
  calculateHourlySuggestedAmountCents,
  calculateHotelOverstay,
  deriveSlotStatus,
  extendHotelPaidUntil,
  leaseDateToPaidUntil,
  nextLeaseRenewDate,
  describeSlotReminder,
  formatPlateForDisplay,
  formatBusinessDateTime,
  getBusinessMonthRange,
  getBusinessDate,
  getBusinessDateTime,
  summarizeMonthlyPayments,
  PRIVATE_BORROW_REMINDER_MINUTES,
} from "../util/parkingDomain";

export type SlotSettingsRow = {
  code: string;
  name: string;
  kind: "regular" | "private";
  isActive: boolean;
  blockedReason: "occupied" | "reserved" | "leased" | "aisle" | null;
};

export type SlotMapSlot = {
  code: string;
  name: string;
  isActive: boolean;
  status: SlotStatus;
};

export type SlotDetail = SlotMapSlot & {
  kind: ParkingSlotKind;
  presentVehicle: {
    sessionId?: string;
    plate: string | null;
    phone?: string | null;
    billingType: ParkingBillingType;
    enteredAt: string;
    paidUntil: string | null;
    borrowUntil: string | null;
    photoUrl: string | null;
  } | null;
  reservation: {
    id?: string | null;
    guestName: string | null;
    note: string | null;
  } | null;
  lease: {
    id?: string;
    startsOn?: string | null;
    plate?: string | null;
    note?: string | null;
    recentPayments?: {
      id: string;
      paidAt: string;
      amountCents: number;
      method: "wechat" | "alipay" | "cash";
    }[];
    tenantName: string;
    phone: string | null;
    paidUntil: string | null;
  } | null;
};

export type CheckInFormData = {
  code: string;
  name: string;
  kind: ParkingSlotKind;
  isActive: boolean;
  occupied: boolean;
  hasLease: boolean;
  defaultLeasePlate?: string | null;
  hasReservation: boolean;
  pricing: ParkingPricingSettings;
  now: string;
};

export type CheckInResult = {
  sessionId: string;
  plate: string;
  photoSaved: boolean;
};

export type RenewFormData = {
  code: string;
  name: string;
  mode: "hotel_daily" | "lease";
  sessionId: string | null;
  leaseId: string | null;
  paidUntil: string;
  defaultEndDate: string | null;
  hotelDailyPriceCents: number;
  plate: string | null;
};
export type CheckOutFormData = {
  code: string;
  name: string;
  sessionId: string;
  plate: string | null;
  phone?: string | null;
  billingType: ParkingBillingType;
  enteredAt: string;
  now: string;
  paidUntil: string | null;
  totalPaidCents: number | null;
  suggestedAmountCents: number;
  overstayHours: number;
};
export type RenewalResult = { paymentId: string; paidUntil: string };
export type CheckOutResult = { sessionId: string };
export type SlotReminder = {
  code: string;
  name: string;
  displayName: string;
  status: SlotStatus;
  deadline: string;
  description: string;
};

export type MonthlyStats = MonthlyPaymentSummary & {
  entryCount: number;
  payments: {
    id: string;
    paidAtText: string;
    slotName: string;
    customer: string;
    amountCents: number;
    method: keyof MonthlyPaymentSummary["byMethod"];
  }[];
};

export type RecordResults = {
  sessions: (RecordSession & { slotName: string })[];
  leasePayments: (RecordLeasePayment & {
    slotName: string;
    tenantName: string;
  })[];
};
export interface ParkingService {
  getPricingSettings(): Promise<ParkingPricingSettings>;
  updatePricingSettings(input: unknown): Promise<void>;
  getRecords(filter: RecordsFilter): Promise<RecordResults>;
  correctSessionPlate(input: unknown): Promise<void>;
  correctPayment(input: unknown): Promise<void>;
  deletePayment(input: unknown): Promise<void>;
  getSlotMap(now: Date): Promise<SlotMapSlot[]>;
  getMonthlyStats(month: string): Promise<MonthlyStats>;
  getReminders(now: Date): Promise<SlotReminder[]>;
  getSlotDetail(code: string, now: Date): Promise<SlotDetail | null>;
  getCheckInForm(code: string, now: Date): Promise<CheckInFormData | null>;
  checkIn(input: unknown, now: Date): Promise<CheckInResult>;
  undoCheckIn(sessionId: unknown): Promise<void>;
  getRenewForm(code: string, now: Date): Promise<RenewFormData | null>;
  renew(input: unknown): Promise<RenewalResult>;
  undoRenewal(paymentId: unknown): Promise<void>;
  getCheckOutForm(code: string, now: Date): Promise<CheckOutFormData | null>;
  checkOut(input: unknown): Promise<CheckOutResult>;
  undoCheckOut(sessionId: unknown): Promise<void>;
  createLease(input: unknown): Promise<{ leaseId: string }>;
  undoCreateLease(id: unknown): Promise<void>;
  editLease(input: unknown): Promise<void>;
  endLease(input: unknown): Promise<{ leaseId: string }>;
  undoEndLease(id: unknown): Promise<void>;
  reserve(input: unknown): Promise<{ reservationId: string }>;
  cancelReservation(id: unknown): Promise<{ reservationId: string }>;
  undoReservation(id: unknown): Promise<void>;
  undoCancelReservation(id: unknown): Promise<void>;
  extendBorrow(input: unknown): Promise<{
    sessionId: string;
    previous: string;
    current: string;
  }>;
  undoExtendBorrow(input: unknown): Promise<void>;
  getSlotSettings(): Promise<SlotSettingsRow[]>;
  updateSlotSettings(input: unknown): Promise<void>;
}

function latestPaidUntil(
  payments: { paid_until: string | null }[],
): string | null {
  let latest: string | null = null;

  for (const payment of payments) {
    if (
      payment.paid_until &&
      (!latest || Date.parse(payment.paid_until) > Date.parse(latest))
    ) {
      latest = payment.paid_until;
    }
  }

  return latest;
}

/** 首页和详情共用同一组车位事实及状态推导输入。 */
function assembleSlotFacts(facts: SlotFactsRows) {
  const sessionsBySlot = new Map(
    facts.sessions.map((session) => [session.slot_code, session]),
  );
  const reservationsBySlot = new Map(
    facts.reservations.map((reservation) => [
      reservation.slot_code,
      reservation,
    ]),
  );
  const leasesBySlot = new Map(
    facts.leases.map((lease) => [lease.slot_code, lease]),
  );
  const leasesById = new Map(facts.leases.map((lease) => [lease.id, lease]));

  return facts.slots.map((slot) => {
    const session = sessionsBySlot.get(slot.code);
    const reservation = reservationsBySlot.get(slot.code);
    const lease = leasesBySlot.get(slot.code);
    const sessionLease = session?.lease_id
      ? leasesById.get(session.lease_id)
      : undefined;
    const sessionPaidUntil = session
      ? session.billing_type === "lease"
        ? latestPaidUntil(sessionLease?.lease_payments ?? [])
        : latestPaidUntil(session.session_payments)
      : null;
    const leasePaidUntil = lease ? latestPaidUntil(lease.lease_payments) : null;
    const statusFacts: SlotStatusFacts = {
      kind: slot.kind,
      present_vehicle: session
        ? {
            billing_type: session.billing_type,
            borrow_until: session.borrow_until,
            paid_until: sessionPaidUntil,
          }
        : null,
      has_open_reservation: Boolean(reservation),
      active_lease: lease ? { paid_until: leasePaidUntil } : null,
    };

    return {
      slot,
      session,
      reservation,
      lease,
      sessionPaidUntil,
      leasePaidUntil,
      statusFacts,
    };
  });
}

export function createParkingService(
  repository: ParkingRepository,
  getAuth: () => Promise<AuthContext>,
): ParkingService {
  return {
    async getRecords(filter) {
      await requireAuthenticatedUserId(getAuth);
      const byDate = filter.kind === "date";
      const start = byDate ? getBusinessDateTime(filter.date, 0) : undefined;
      const end = byDate
        ? getBusinessDateTime(
            getBusinessDate(new Date(Date.parse(start!) + 86400000)),
            0,
          )
        : undefined;
      const leaseFilter = byDate
        ? { start, end }
        : filter.kind === "plate"
          ? filter.plate
            ? { plate: filter.plate }
            : null
          : filter.query
            ? filter.searchBy === "tenant"
              ? { tenant: filter.query }
              : { slotCode: filter.query }
            : null;
      const [sessions, leasePayments, slots] = await Promise.all([
        byDate
          ? repository.readSessionsByDate(start!, end!)
          : filter.kind === "plate" && filter.plate
            ? repository.readSessionsByPlate(filter.plate, 50)
            : Promise.resolve([]),
        leaseFilter
          ? repository.readLeasePayments(leaseFilter)
          : Promise.resolve([]),
        repository.readSlotNames(),
      ]);
      const slotNames = new Map(slots.map((slot) => [slot.code, slot.name]));
      return {
        sessions: sessions.map((session) => ({
          ...session,
          slotName: slotNames.get(session.slot_code) ?? session.slot_code,
        })),
        leasePayments: leasePayments.map((payment) => ({
          ...payment,
          slotName:
            slotNames.get(payment.leases.slot_code) ?? payment.leases.slot_code,
          tenantName: payment.leases.tenant_name,
        })),
      };
    },
    async correctSessionPlate(input) {
      await requireAuthenticatedUserId(getAuth);
      const value = parseParkingOperation(recordPlateCorrectionSchema, input);
      await repository.correctSessionPlate(value.sessionId, value.plate);
    },
    async correctPayment(input) {
      await requireAuthenticatedUserId(getAuth);
      const value = parseParkingOperation(recordPaymentCorrectionSchema, input);
      await repository.correctPayment(
        value.paymentId,
        parseAmountCents(value.amountYuan),
        value.method,
      );
    },
    async deletePayment(input) {
      await requireAuthenticatedUserId(getAuth);
      const value = parseParkingOperation(recordPaymentDeletionSchema, input);
      await repository.deletePayment(value.paymentId);
    },
    async getPricingSettings() {
      await requireAuthenticatedUserId(getAuth);
      return repository.getPricingSettings();
    },
    async updatePricingSettings(input) {
      await requireAuthenticatedUserId(getAuth);
      const value = parseParkingOperation(pricingSettingsInputSchema, input);
      await repository.updatePricingSettings({
        hotel_daily_price_cents: parseAmountCents(value.hotelDailyYuan),
        hotel_checkout_hour: value.hotelCheckoutHour,
        hotel_previous_day_before_hour: value.hotelPreviousDayBeforeHour,
        hourly_price_cents: parseAmountCents(value.hourlyYuan),
      });
    },
    async getMonthlyStats(month) {
      await requireAuthenticatedUserId(getAuth);
      const { start, end } = getBusinessMonthRange(month);
      const [payments, entryCount, slots] = await Promise.all([
        repository.readMonthlyPayments(start, end),
        repository.countMonthlyEntries(start, end),
        repository.readSlotNames(),
      ]);
      const slotNames = new Map(slots.map((slot) => [slot.code, slot.name]));
      return {
        ...summarizeMonthlyPayments(payments),
        entryCount,
        payments: payments.map((payment) => ({
          id: payment.id,
          paidAtText: formatBusinessDateTime(payment.paidAt),
          slotName:
            (payment.slotCode && slotNames.get(payment.slotCode)) ||
            payment.slotCode ||
            monthlyStatsText.unknownSlot,
          customer:
            payment.tenantName ??
            (payment.plate
              ? formatPlateForDisplay(payment.plate)
              : (payment.phone ?? monthlyStatsText.unknownCustomer)),
          amountCents: payment.amountCents,
          method: payment.method,
        })),
      };
    },
    async getSlotSettings() {
      await requireAuthenticatedUserId(getAuth);
      const facts = await repository.readSlotFacts();
      return assembleSlotFacts(facts).map(
        ({ slot, session, reservation, lease }) => ({
          code: slot.code,
          name: slot.name,
          kind: slot.kind === "private" ? "private" : "regular",
          isActive: slot.is_active,
          blockedReason: session
            ? "occupied"
            : reservation
              ? "reserved"
              : lease
                ? "leased"
                : slot.kind === "aisle"
                  ? "aisle"
                  : null,
        }),
      );
    },

    async updateSlotSettings(input) {
      await requireAuthenticatedUserId(getAuth);
      const value = parseSlotSettingsInput(input);
      const facts = await repository.readSlotFacts();
      const match = assembleSlotFacts(facts).find(
        ({ slot }) => slot.code === value.code,
      );
      if (!match)
        throw new ValidationError(
          "slot_unavailable",
          parkingMessages.slotUnavailable,
        );
      if (match.slot.kind === "aisle")
        throw new ValidationError(
          "invalid_kind",
          parkingMessages.slotSettingsKindInvalid,
        );
      if (match.session || match.reservation || match.lease)
        throw new ConflictError("slot_busy", parkingMessages.slotSettingsBusy);
      await repository.updateSlotSettings(
        value.code,
        value.kind,
        value.isActive,
      );
    },
    async getCheckInForm(code, now) {
      await requireAuthenticatedUserId(getAuth);
      if (!/^\d+$/.test(code)) {
        throw new ValidationError("slot_invalid", parkingMessages.invalidInput);
      }
      const [facts, pricing] = await Promise.all([
        repository.readSlotFacts(),
        repository.getPricingSettings(),
      ]);
      const match = assembleSlotFacts(facts).find(
        ({ slot }) => slot.code === code,
      );
      if (!match) return null;
      return {
        code: match.slot.code,
        name: match.slot.name,
        kind: match.slot.kind,
        isActive: match.slot.is_active,
        occupied: Boolean(match.session),
        hasLease: Boolean(match.lease),
        ...(match.lease?.plate ? { defaultLeasePlate: match.lease.plate } : {}),
        hasReservation: Boolean(match.reservation),
        pricing,
        now: now.toISOString(),
      };
    },

    async checkIn(input, now) {
      await requireAuthenticatedUserId(getAuth);
      const value = parseCheckInInput(input);
      const hotel = value.billingType === "hotel_daily";
      const pricing = hotel ? await repository.getPricingSettings() : null;
      const paidUntil =
        hotel && pricing
          ? calculateHotelCheckoutAt(now, value.days!, pricing)
          : null;
      const amountCents = hotel ? parseAmountCents(value.amountYuan!) : null;
      let validPhoto: Blob | undefined;
      if (value.photo) {
        try {
          const header = new Uint8Array(
            await value.photo.slice(0, 3).arrayBuffer(),
          );
          if (
            header.length === 3 &&
            header[0] === 0xff &&
            header[1] === 0xd8 &&
            header[2] === 0xff
          ) {
            validPhoto = value.photo;
          }
        } catch {
          // 无效附件不能作为唯一识别信息。
        }
      }
      const photoRequired = !value.plate && !value.phone;
      if (photoRequired && !validPhoto) {
        throw new ValidationError(
          "check_in_invalid",
          parkingMessages.requiredPhotoFailed,
        );
      }

      // 仅照片登记先上传，再由 RPC 原子绑定照片及停车记录。
      const preparedId = photoRequired ? crypto.randomUUID() : undefined;
      const preparedPath = preparedId
        ? buildPlatePhotoPath(now, preparedId)
        : undefined;
      if (preparedPath && validPhoto) {
        try {
          await repository.uploadPlatePhoto(preparedPath, validPhoto);
        } catch {
          throw new RepositoryError(
            "plate_photo_failed",
            parkingMessages.requiredPhotoFailed,
          );
        }
      }
      let sessionId: string;
      try {
        sessionId = await repository.checkInVehicle({
          slotCode: value.slotCode,
          plate: value.plate,
          ...(value.phone ? { phone: value.phone } : {}),
          ...(preparedPath ? { photoPath: preparedPath } : {}),
          ...(preparedId ? { sessionId: preparedId } : {}),
          billingType: value.billingType,
          paidUntil,
          borrowMinutes: value.borrowMinutes ?? null,
          amountCents,
          paymentMethod: hotel ? value.paymentMethod! : null,
        });
      } catch (error) {
        // 业务冲突明确表示未写入；未知数据库异常可能已提交，保留照片避免破坏记录。
        if (
          preparedPath &&
          (error instanceof ConflictError || error instanceof ValidationError)
        ) {
          try {
            await repository.deletePlatePhoto(preparedPath);
          } catch {
            // 删除失败已由 Repository 记录。
          }
        }
        throw error;
      }
      let photoSaved = Boolean(preparedPath);
      if (validPhoto && !preparedPath) {
        try {
          await repository.savePlatePhoto(
            sessionId,
            buildPlatePhotoPath(now, sessionId),
            validPhoto,
          );
          photoSaved = true;
        } catch {
          // 有其他识别信息时照片仍为可选附件。
        }
      }
      return { sessionId, plate: value.plate, photoSaved };
    },

    async undoCheckIn(sessionId) {
      await requireAuthenticatedUserId(getAuth);
      const id = parseUndoSessionId(sessionId);
      const facts = await repository.readSlotFacts();
      const photoPath = facts.sessions.find(
        (session) => session.id === id,
      )?.photo_path;
      await repository.undoCheckIn(id);
      if (photoPath) {
        try {
          await repository.deletePlatePhoto(photoPath);
        } catch {
          // 撤销已由 RPC 完成，照片删除失败不会回滚撤销。
        }
      }
    },

    async getRenewForm(code) {
      await requireAuthenticatedUserId(getAuth);
      if (!/^\d+$/.test(code))
        throw new ValidationError("slot_invalid", parkingMessages.invalidInput);
      const [facts, pricing] = await Promise.all([
        repository.readSlotFacts(),
        repository.getPricingSettings(),
      ]);
      const match = assembleSlotFacts(facts).find(
        ({ slot }) => slot.code === code,
      );
      if (!match || !match.slot.is_active || match.slot.kind === "private")
        return null;
      const hotel = match.session?.billing_type === "hotel_daily";
      const lease =
        match.lease &&
        (!match.session || match.session.billing_type === "lease");
      const paidUntil = hotel
        ? match.sessionPaidUntil
        : lease
          ? match.leasePaidUntil
          : null;
      if (!paidUntil) return null;
      return {
        code,
        name: match.slot.name,
        mode: hotel ? "hotel_daily" : "lease",
        sessionId: hotel ? (match.session?.id ?? null) : null,
        leaseId: lease ? (match.lease?.id ?? null) : null,
        paidUntil,
        defaultEndDate: lease ? nextLeaseRenewDate(paidUntil) : null,
        hotelDailyPriceCents: pricing.hotel_daily_price_cents,
        plate: match.session?.plate ?? null,
      };
    },

    async renew(input) {
      await requireAuthenticatedUserId(getAuth);
      const value = parseRenewInput(input);
      const facts = await repository.readSlotFacts();
      const match = assembleSlotFacts(facts).find(
        ({ slot }) => slot.code === value.slotCode,
      );
      if (!match || !match.slot.is_active || match.slot.kind === "private")
        throw new ValidationError(
          "renew_unavailable",
          parkingMessages.renewUnavailable,
        );
      const hotel =
        value.mode === "hotel_daily" &&
        match.session?.billing_type === "hotel_daily";
      const lease =
        value.mode === "lease" &&
        match.lease &&
        (!match.session || match.session.billing_type === "lease");
      const currentPaidUntil = hotel
        ? match.sessionPaidUntil
        : lease
          ? match.leasePaidUntil
          : null;
      if (!currentPaidUntil)
        throw new ValidationError(
          "renew_unavailable",
          parkingMessages.renewUnavailable,
        );
      let paidUntil: string;
      if (hotel) {
        paidUntil = extendHotelPaidUntil(currentPaidUntil, value.days!);
      } else {
        try {
          paidUntil = leaseDateToPaidUntil(value.endDate!);
        } catch {
          throw new ValidationError(
            "renew_date_invalid",
            parkingMessages.renewDateInvalid,
          );
        }
        if (Date.parse(paidUntil) <= Date.parse(currentPaidUntil))
          throw new ValidationError(
            "renew_date_invalid",
            parkingMessages.renewDateInvalid,
          );
      }
      const paymentId = await repository.addRenewal({
        sessionId: hotel ? (match.session?.id ?? null) : null,
        leaseId: lease ? (match.lease?.id ?? null) : null,
        amountCents: parseAmountCents(value.amountYuan),
        method: value.paymentMethod,
        paidUntil,
      });
      return { paymentId, paidUntil };
    },

    async undoRenewal(paymentId) {
      await requireAuthenticatedUserId(getAuth);
      await repository.undoRenewal(parseUndoSessionId(paymentId));
    },

    async getCheckOutForm(code, now) {
      await requireAuthenticatedUserId(getAuth);
      if (!/^\d+$/.test(code))
        throw new ValidationError("slot_invalid", parkingMessages.invalidInput);
      const [facts, pricing] = await Promise.all([
        repository.readSlotFacts(),
        repository.getPricingSettings(),
      ]);
      const match = assembleSlotFacts(facts).find(
        ({ slot }) => slot.code === code,
      );
      if (!match?.slot.is_active || !match.session) return null;
      const vehicle = match.session;
      const minutes = Math.max(
        0,
        (now.getTime() - Date.parse(vehicle.entered_at)) / 60000,
      );
      const overstay =
        vehicle.billing_type === "hotel_daily" && match.sessionPaidUntil
          ? calculateHotelOverstay(
              match.sessionPaidUntil,
              now,
              pricing.hotel_daily_price_cents,
            )
          : null;
      return {
        code,
        name: match.slot.name,
        sessionId: vehicle.id,
        plate: vehicle.plate,
        ...(vehicle.phone ? { phone: vehicle.phone } : {}),
        billingType: vehicle.billing_type,
        enteredAt: vehicle.entered_at,
        now: now.toISOString(),
        paidUntil: match.sessionPaidUntil,
        totalPaidCents:
          vehicle.billing_type === "lease"
            ? null
            : vehicle.session_payments
                .filter(
                  (p) => p.purpose === "prepay" || p.purpose === "renewal",
                )
                .reduce((sum, p) => sum + (p.amount_cents ?? 0), 0),
        suggestedAmountCents:
          match.slot.kind === "private"
            ? 0
            : vehicle.billing_type === "hourly"
              ? calculateHourlySuggestedAmountCents(minutes, pricing)
              : (overstay?.suggestedCents ?? 0),
        overstayHours: overstay?.hours ?? 0,
      };
    },

    async checkOut(input) {
      await requireAuthenticatedUserId(getAuth);
      const value = parseCheckOutInput(input);
      await repository.checkOutVehicle({
        sessionId: value.sessionId,
        amountCents: value.amountYuan
          ? parseAmountCents(value.amountYuan)
          : null,
        paymentMethod: value.paymentMethod ?? null,
      });
      return { sessionId: value.sessionId };
    },

    async undoCheckOut(sessionId) {
      await requireAuthenticatedUserId(getAuth);
      await repository.undoCheckOut(parseUndoSessionId(sessionId));
    },

    async createLease(input) {
      await requireAuthenticatedUserId(getAuth);
      const value = parseParkingOperation(createLeaseInputSchema, input);
      const facts = await repository.readSlotFacts();
      const match = assembleSlotFacts(facts).find(
        ({ slot }) => slot.code === value.slotCode,
      );
      if (!match?.slot.is_active || match.slot.kind !== "regular")
        throw new ValidationError(
          "slot_unavailable",
          parkingMessages.slotUnavailable,
        );
      if (match.lease)
        throw new ConflictError("lease_exists", parkingMessages.leaseExists);
      if (match.session || match.reservation)
        throw new ConflictError("slot_occupied", parkingMessages.slotOccupied);
      let paidUntil: string;
      try {
        leaseDateToPaidUntil(value.startsOn);
        paidUntil = leaseDateToPaidUntil(value.paidThrough);
      } catch {
        throw new ValidationError(
          "lease_date_invalid",
          parkingMessages.leaseDateInvalid,
        );
      }
      if (value.paidThrough <= value.startsOn)
        throw new ValidationError(
          "lease_date_invalid",
          parkingMessages.leaseDateInvalid,
        );
      const leaseId = await repository.createLease({
        slotCode: value.slotCode,
        tenantName: value.tenantName,
        phone: value.phone,
        plate: value.plate,
        startsOn: value.startsOn,
        note: value.note,
        paidUntil,
        amountCents: parseAmountCents(value.amountYuan),
        paymentMethod: value.paymentMethod,
      });
      return { leaseId };
    },
    async undoCreateLease(id) {
      await requireAuthenticatedUserId(getAuth);
      await repository.undoCreateLease(parseUndoSessionId(id));
    },
    async editLease(input) {
      await requireAuthenticatedUserId(getAuth);
      const value = parseParkingOperation(editLeaseInputSchema, input);
      const facts = await repository.readSlotFacts();
      const lease = facts.leases.find(
        (item) =>
          item.id === value.leaseId && item.slot_code === value.slotCode,
      );
      if (!lease)
        throw new ValidationError(
          "lease_unavailable",
          parkingMessages.leaseUnavailable,
        );
      await repository.updateLease(value.leaseId, {
        tenant_name: value.tenantName,
        phone: value.phone,
        plate: value.plate,
        note: value.note,
      });
    },
    async endLease(input) {
      await requireAuthenticatedUserId(getAuth);
      const value = parseParkingOperation(endLeaseInputSchema, input);
      const facts = await repository.readSlotFacts();
      const lease = facts.leases.find((entry) => entry.id === value.leaseId);
      if (!lease)
        throw new ValidationError(
          "lease_unavailable",
          parkingMessages.leaseUnavailable,
        );
      try {
        leaseDateToPaidUntil(value.endedOn);
      } catch {
        throw new ValidationError(
          "lease_date_invalid",
          parkingMessages.leaseDateInvalid,
        );
      }
      if (lease.starts_on && value.endedOn < lease.starts_on)
        throw new ValidationError(
          "lease_date_invalid",
          parkingMessages.leaseDateInvalid,
        );
      await repository.endLease(value.leaseId, value.endedOn);
      return { leaseId: value.leaseId };
    },
    async undoEndLease(id) {
      await requireAuthenticatedUserId(getAuth);
      await repository.undoEndLease(parseUndoSessionId(id));
    },
    async reserve(input) {
      await requireAuthenticatedUserId(getAuth);
      const value = parseParkingOperation(reserveInputSchema, input);
      const facts = await repository.readSlotFacts();
      const match = assembleSlotFacts(facts).find(
        ({ slot }) => slot.code === value.slotCode,
      );
      if (match?.reservation)
        throw new ConflictError(
          "reservation_exists",
          parkingMessages.slotReserved,
        );
      if (
        !match?.slot.is_active ||
        match.slot.kind !== "regular" ||
        match.session ||
        match.lease
      )
        throw new ValidationError(
          "slot_unavailable",
          parkingMessages.slotUnavailable,
        );
      const reservationId = await repository.createReservation(
        value.slotCode,
        value.guestName,
        value.note,
      );
      return { reservationId };
    },
    async cancelReservation(id) {
      await requireAuthenticatedUserId(getAuth);
      const reservationId = parseUndoSessionId(id);
      const facts = await repository.readSlotFacts();
      if (!facts.reservations.some((res) => res.id === reservationId))
        throw new ConflictError(
          "reservation_unavailable",
          parkingMessages.reservationUnavailable,
        );
      await repository.cancelReservation(reservationId);
      return { reservationId };
    },
    async undoReservation(id) {
      await requireAuthenticatedUserId(getAuth);
      await repository.undoReservation(parseUndoSessionId(id));
    },
    async undoCancelReservation(id) {
      await requireAuthenticatedUserId(getAuth);
      await repository.undoCancelReservation(parseUndoSessionId(id));
    },
    async extendBorrow(input) {
      await requireAuthenticatedUserId(getAuth);
      const value = parseParkingOperation(borrowExtensionSchema, input);
      const facts = await repository.readSlotFacts();
      const match = assembleSlotFacts(facts).find(
        ({ slot, session }) =>
          slot.kind === "private" &&
          slot.is_active &&
          session?.id === value.sessionId,
      );
      if (!match)
        throw new ValidationError(
          "borrow_unavailable",
          parkingMessages.invalidInput,
        );
      const result = await repository.extendBorrow(
        value.sessionId,
        value.minutes,
      );
      return { sessionId: value.sessionId, ...result };
    },
    async undoExtendBorrow(input) {
      await requireAuthenticatedUserId(getAuth);
      const value = parseParkingOperation(borrowUndoSchema, input);
      await repository.undoExtendBorrow(
        value.sessionId,
        value.previous,
        value.expectedCurrent,
      );
    },

    async getReminders(now) {
      await requireAuthenticatedUserId(getAuth);
      const facts = await repository.readSlotFacts();
      const reminders = assembleSlotFacts(facts)
        .map((entry): SlotReminder | null => {
          const {
            slot,
            session,
            lease,
            sessionPaidUntil,
            leasePaidUntil,
            statusFacts,
          } = entry;
          if (!slot.is_active) return null;
          const status = deriveSlotStatus(statusFacts, now);
          const privateBorrow = slot.kind === "private";
          const deadline = privateBorrow
            ? session?.borrow_until
            : session
              ? session.billing_type === "hotel_daily" ||
                session.billing_type === "lease"
                ? sessionPaidUntil
                : null
              : leasePaidUntil;
          if (!deadline) return null;
          const remainingMs = Date.parse(deadline) - now.getTime();
          const shouldRemind =
            status === "overdue" ||
            status === "expiringSoon" ||
            (status === "privateBorrowed" &&
              remainingMs <= PRIVATE_BORROW_REMINDER_MINUTES * 60000);
          if (!shouldRemind) return null;
          const kind = privateBorrow
            ? "private"
            : session?.billing_type === "hotel_daily"
              ? "hotel_daily"
              : "lease";
          return {
            code: slot.code,
            name: slot.name,
            displayName: session?.plate
              ? formatPlateForDisplay(session.plate)
              : (session?.phone ?? lease?.tenant_name ?? ""),
            status,
            deadline,
            description: describeSlotReminder(kind, deadline, now),
          };
        })
        .filter((value): value is SlotReminder => value !== null);
      return reminders.sort(
        (a, b) =>
          (a.status === "overdue" ? 0 : 1) - (b.status === "overdue" ? 0 : 1) ||
          Date.parse(a.deadline) - Date.parse(b.deadline) ||
          a.code.localeCompare(b.code),
      );
    },

    async getSlotMap(now) {
      await requireAuthenticatedUserId(getAuth);
      const facts = await repository.readSlotFacts();

      return assembleSlotFacts(facts).map(({ slot, statusFacts }) => ({
        code: slot.code,
        name: slot.name,
        isActive: slot.is_active,
        status: deriveSlotStatus(statusFacts, now),
      }));
    },

    async getSlotDetail(code, now) {
      await requireAuthenticatedUserId(getAuth);
      const facts = await repository.readSlotFacts();
      const match = assembleSlotFacts(facts).find(
        ({ slot }) => slot.code === code,
      );
      if (!match) return null;

      const {
        slot,
        session,
        reservation,
        lease,
        sessionPaidUntil,
        leasePaidUntil,
        statusFacts,
      } = match;
      // 首页不会请求照片签名；详情只签当前车位的在场车辆。
      const photoUrl =
        slot.is_active && session?.photo_path
          ? await repository.getPhotoSignedUrl(session.photo_path)
          : null;
      return {
        code: slot.code,
        name: slot.name,
        isActive: slot.is_active,
        status: deriveSlotStatus(statusFacts, now),
        kind: slot.kind,
        presentVehicle:
          slot.is_active && session
            ? {
                sessionId: session.id,
                plate: session.plate,
                ...(session.phone ? { phone: session.phone } : {}),
                billingType: session.billing_type,
                enteredAt: session.entered_at,
                paidUntil: sessionPaidUntil,
                borrowUntil: session.borrow_until,
                photoUrl,
              }
            : null,
        reservation:
          slot.is_active && reservation
            ? {
                id: reservation.id ?? null,
                guestName: reservation.guest_name,
                note: reservation.note,
              }
            : null,
        lease:
          slot.is_active && lease
            ? {
                id: lease.id,
                startsOn: lease.starts_on ?? null,
                plate: lease.plate ?? null,
                note: lease.note ?? null,
                recentPayments: lease.lease_payments
                  .filter(
                    (payment) =>
                      payment.id &&
                      payment.paid_at &&
                      payment.amount_cents &&
                      payment.method,
                  )
                  .sort((a, b) =>
                    (b.paid_at ?? "").localeCompare(a.paid_at ?? ""),
                  )
                  .slice(0, 3)
                  .map((payment) => ({
                    id: payment.id!,
                    paidAt: payment.paid_at!,
                    amountCents: payment.amount_cents!,
                    method: payment.method!,
                  })),
                tenantName: lease.tenant_name,
                phone: lease.phone,
                paidUntil: leasePaidUntil,
              }
            : null,
      };
    },
  };
}
