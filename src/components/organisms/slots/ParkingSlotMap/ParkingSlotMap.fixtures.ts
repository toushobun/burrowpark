import { slotLayouts } from "config/slotLayout";
import type { SlotMapSlot } from "internal/parking";

/** Storybook 和组件测试共用同一批地图车位数据。 */
export const emptySlotMapSlots: SlotMapSlot[] = [
  ...slotLayouts.outer.slots,
  ...slotLayouts.inner.slots,
].map((slot) => ({
  code: slot.code,
  name: slot.code + "号",
  isActive: true,
  status: "empty",
}));
