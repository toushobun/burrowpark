import type { Enums, Tables } from "../../shared/supabase/database.types";

export type ParkingTimestamp = Date | string;

export type ParkingSlotKind = Enums<"slot_kind">;

export type ParkingBillingType = Enums<"billing_type">;

export type ParkingPricingSettings = Pick<
  Tables<"pricing_settings">,
  | "hotel_daily_price_cents"
  | "hotel_checkout_hour"
  | "hotel_previous_day_before_hour"
  | "hourly_price_cents"
>;

export interface SlotStatusFacts {
  kind: ParkingSlotKind;
  present_vehicle: {
    billing_type: ParkingBillingType;
    paid_until?: ParkingTimestamp | null;
    borrow_until?: ParkingTimestamp | null;
  } | null;
  has_open_reservation: boolean;
  active_lease: {
    paid_until?: ParkingTimestamp | null;
  } | null;
}
