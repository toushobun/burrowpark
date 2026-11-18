/** 车位状态。地图、列表、提醒共用同一套状态与配色。 */
export const slotStatuses = [
  "empty",
  "occupied",
  "expiringSoon",
  "overdue",
  "reserved",
  "leaseAway",
  "privateIdle",
  "privateBorrowed",
] as const;

export type SlotStatus = (typeof slotStatuses)[number];

type SlotStatusColor = {
  background: string;
  border: string;
  borderStyle: "solid" | "dashed";
  text: string;
};

/**
 * 车位状态配色。相邻状态除色相外亮度也拉开差距，
 * 文字与背景对比度均满足 WCAG AA（4.5:1）。
 */
export const slotStatusColors: Record<SlotStatus, SlotStatusColor> = {
  empty: {
    background: "#E6F4E4",
    border: "#2E7D32",
    borderStyle: "solid",
    text: "#1B5E20",
  },
  occupied: {
    background: "#DCE7F7",
    border: "#1E5AA8",
    borderStyle: "solid",
    text: "#123E77",
  },
  expiringSoon: {
    background: "#FFE7C7",
    border: "#B85600",
    borderStyle: "solid",
    text: "#7A3900",
  },
  overdue: {
    background: "#FBDAD6",
    border: "#B3261E",
    borderStyle: "solid",
    text: "#8C1D18",
  },
  reserved: {
    background: "#EFE8FA",
    border: "#6B4FA0",
    borderStyle: "dashed",
    text: "#4A3374",
  },
  leaseAway: {
    background: "#EEEAE4",
    border: "#6B6259",
    borderStyle: "dashed",
    text: "#4A433C",
  },
  privateIdle: {
    background: "#F3EFE9",
    border: "#8C8278",
    borderStyle: "solid",
    text: "#3E3832",
  },
  privateBorrowed: {
    background: "#FFF1DE",
    border: "#B85600",
    borderStyle: "solid",
    text: "#7A3900",
  },
};
