export type ParkingTimestamp = Date | string;

export type ParkingSlotKind = "regular" | "aisle" | "private";

export type ParkingBillingType = "hotel_daily" | "hourly" | "lease" | "free";

export interface ParkingPricingSettings {
  hotel_daily_price_cents: number;
  hotel_checkout_hour: number;
  hotel_previous_day_before_hour: number;
  hourly_price_cents: number;
}

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
