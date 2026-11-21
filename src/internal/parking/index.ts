export type {
  ParkingBillingType,
  ParkingPricingSettings,
  ParkingSlotKind,
  ParkingTimestamp,
  SlotStatusFacts,
} from "./entity/parkingDomain";

export type {
  CheckInFormData,
  CheckInResult,
  RenewFormData,
  RenewalResult,
  CheckOutFormData,
  CheckOutResult,
  ParkingService,
  SlotDetail,
  SlotMapSlot,
  SlotSettingsRow,
  SlotReminder,
} from "./service/parkingService";

export {
  defaultLeasePaidThrough,
  describeBorrowRemaining,
  calculateHourlySuggestedAmountCents,
  calculateHotelOverstay,
  extendHotelPaidUntil,
  leaseDateToPaidUntil,
  nextLeaseRenewDate,
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
