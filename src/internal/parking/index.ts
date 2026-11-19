export type {
  ParkingBillingType,
  ParkingPricingSettings,
  ParkingSlotKind,
  ParkingTimestamp,
  SlotStatusFacts,
} from "./entity/parkingDomain";

export {
  calculateHourlySuggestedAmountCents,
  calculateHotelCheckoutAt,
  deriveSlotStatus,
  formatPlateForDisplay,
  getBusinessDate,
  getBusinessDateTime,
  LEASE_EXPIRING_SOON_DAYS,
  normalizePlate,
  PRIVATE_BORROW_REMINDER_MINUTES,
} from "./util/parkingDomain";
