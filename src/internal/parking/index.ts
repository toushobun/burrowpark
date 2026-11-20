export type {
  ParkingBillingType,
  ParkingPricingSettings,
  ParkingSlotKind,
  ParkingTimestamp,
  SlotStatusFacts,
} from "./entity/parkingDomain";

export type {
  ParkingService,
  SlotDetail,
  SlotMapSlot,
} from "./service/parkingService";

export {
  calculateHourlySuggestedAmountCents,
  calculateHotelCheckoutAt,
  deriveSlotStatus,
  formatBusinessDate,
  formatBusinessDateTime,
  formatBusinessTime,
  formatElapsed,
  formatPlateForDisplay,
  getBusinessDate,
  getBusinessDateTime,
  LEASE_EXPIRING_SOON_DAYS,
  normalizePlate,
  PRIVATE_BORROW_REMINDER_MINUTES,
} from "./util/parkingDomain";
