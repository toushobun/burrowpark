// @vitest-environment node

import { describe, expect, it } from "vitest";
import type { SlotStatusFacts } from "../entity/parkingDomain";
import {
  calculateHourlySuggestedAmountCents,
  calculateHotelOverstay,
  extendHotelPaidUntil,
  nextLeaseRenewDate,
  leaseDateToPaidUntil,
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
} from "./parkingDomain";

const createSlotFacts = (
  overrides: Partial<SlotStatusFacts> = {},
): SlotStatusFacts => ({
  kind: "regular",
  present_vehicle: null,
  has_open_reservation: false,
  active_lease: null,
  ...overrides,
});

describe("业务时间", () => {
  it("将 UTC 16:30 转换为上海次日业务日期", () => {
    expect(getBusinessDate("2026-11-18T16:30:00.000Z")).toBe("2026-11-19");
  });

  it("业务日期在 UTC 年末与上海跨年时正确换算", () => {
    expect(getBusinessDate("2026-12-31T16:30:00.000Z")).toBe("2027-01-01");
  });

  it.each(["2026-11-19T00:30:00", "2026-11-19"])(
    "拒绝没有明确时区的时间字符串 %s",
    (value) => {
      expect(() => getBusinessDate(va