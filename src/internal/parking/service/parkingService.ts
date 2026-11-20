import {
  requireAuthenticatedUserId,
  type AuthContext,
} from "internal/shared/auth/authContext";
import type { SlotStatus } from "theme/slotStatusTokens";
import { ValidationError } from "internal/shared/errors/appError";

import { parkingMessages } from "../errors";
import { parseAmountCents, parseCheckInInput, parseUndoSessionId } from "../schema";

import type {
  ParkingBillingType,
  ParkingPricingSettings,
  ParkingSlotKind,
  SlotStatusFacts,
} from "../entity/parkingDomain";
import type {
  ParkingRepository,
  SlotFactsRows,
} from "../repository/parkingRepository";
import { calculateHotelCheckoutAt, deriveSlotStatus } from "../util/parkingDomain";

export type SlotMapSlot = {
  code: string;
  name: string;
  isActive: boolean;
  status: SlotStatus;
};

export type SlotDetail = SlotMapSlot & {
  kind: ParkingSlotKind;
  presentVehicle: {
    plate: string;
    billingType: ParkingBillingType;
    enteredAt: string;
    paidUntil: string | null;
    borrowUntil: string | null;
    photoUrl: string | null;
  } | null;
  reservation: {
    guestName: string | null;
    note: string | null;
  } | null;
  lease: {
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
  hasReservation: boolean;
  pricing: ParkingPricingSettings;
  now: string;
};

export type CheckInResult = {
  sessionId: string;
  plate: string;
};

export interface ParkingService {
  getSlotMap(now: Date): Promise<SlotMapSlot[]>;
  getSlotDetail(code: string, now: Date): Promise<SlotDetail | null>;
  getCheckInForm(code: string, now: Date): Promise<CheckInFormData | null>;
  checkIn(input: unknown, now: Date): Promise<CheckInResult>;
  undoCheckIn(sessionId: unknown): Promise<void>;
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
    async getCheckInForm(code, now) {
      await requireAuthenticatedUserId(getAuth);
      if (!/^\d+$/.test(code)) {
        throw new ValidationError("slot_invalid", parkingMessages.invalidInput);
      }
      const [facts, pricing] = await Promise.all([
        repository.readSlotFacts(),
        repository.getPricingSettings(),
      ]);
      const match = assembleSlotFacts(facts).find(({ slot }) => slot.code === code);
      if (!match) return null;
      return {
        code: match.slot.code,
        name: match.slot.name,
        kind: match.slot.kind,
        isActive: match.slot.is_active,
        occupied: Boolean(match.session),
        hasLease: Boolean(match.lease),
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
      const paidUntil = hotel && pricing
        ? calculateHotelCheckoutAt(now, value.days!, pricing)
        : null;
      const borrowUntil = value.borrowMinutes === undefined
        ? null
        : new Date(now.getTime() + value.borrowMinutes * 60_000).toISOString();
      const sessionId = await repository.checkInVehicle({
        slotCode: value.slotCode,
        plate: value.plate,
        billingType: value.billingType,
        paidUntil,
        borrowUntil,
        amountCents: hotel ? parseAmountCents(value.amountYuan!) : null,
        paymentMethod: hotel ? value.paymentMethod! : null,
      });
      return { sessionId, plate: value.plate };
    },

    async undoCheckIn(sessionId) {
      await requireAuthenticatedUserId(getAuth);
      await repository.undoCheckIn(parseUndoSessionId(sessionId));
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
                plate: session.plate,
                billingType: session.billing_type,
                enteredAt: session.entered_at,
                paidUntil: sessionPaidUntil,
                borrowUntil: session.borrow_until,
                photoUrl,
              }
            : null,
        reservation:
          slot.is_active && reservation
            ? { guestName: reservation.guest_name, note: reservation.note }
            : null,
        lease:
          slot.is_active && lease
            ? {
                tenantName: lease.tenant_name,
                phone: lease.phone,
                paidUntil: leasePaidUntil,
              }
            : null,
      };
    },
  };
}
