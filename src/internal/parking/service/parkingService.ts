import {
  requireAuthenticatedUserId,
  type AuthContext,
} from "internal/shared/auth/authContext";
import type { SlotStatus } from "theme/slotStatusTokens";

import type { SlotStatusFacts } from "../entity/parkingDomain";
import type { ParkingRepository } from "../repository/parkingRepository";
import { deriveSlotStatus } from "../util/parkingDomain";

export type SlotMapSlot = {
  code: string;
  name: string;
  isActive: boolean;
  status: SlotStatus;
};

export interface ParkingService {
  getSlotMap(now: Date): Promise<SlotMapSlot[]>;
}

function latestPaidUntil(payments: { paid_until: string | null }[]): string | null {
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

export function createParkingService(
  repository: ParkingRepository,
  getAuth: () => Promise<AuthContext>,
): ParkingService {
  return {
    async getSlotMap(now) {
      await requireAuthenticatedUserId(getAuth);
      const facts = await repository.readSlotMapFacts();

      const sessionsBySlot = new Map(
        facts.sessions.map((session) => [session.slot_code, session]),
      );
      const reservationsBySlot = new Set(
        facts.reservations.map((reservation) => reservation.slot_code),
      );
      const leasesBySlot = new Map(
        facts.leases.map((lease) => [lease.slot_code, lease]),
      );
      const leasesById = new Map(facts.leases.map((lease) => [lease.id, lease]));

      return facts.slots.map((slot) => {
        const session = sessionsBySlot.get(slot.code);
        const lease = leasesBySlot.get(slot.code);
        const sessionLease =
          session?.lease_id ? leasesById.get(session.lease_id) : undefined;
        const statusFacts: SlotStatusFacts = {
          kind: slot.kind,
          present_vehicle: session
            ? {
                billing_type: session.billing_type,
                borrow_until: session.borrow_until,
                paid_until:
                  session.billing_type === "lease"
                    ? latestPaidUntil(sessionLease?.lease_payments ?? [])
                    : latestPaidUntil(session.session_payments),
              }
            : null,
          has_open_reservation: reservationsBySlot.has(slot.code),
          active_lease: lease
            ? { paid_until: latestPaidUntil(lease.lease_payments) }
            : null,
        };

        return {
          code: slot.code,
          name: slot.name,
          isActive: slot.is_active,
          status: deriveSlotStatus(statusFacts, now),
        };
      });
    },
  };
}
