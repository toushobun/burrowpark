import type { SlotStatus } from "theme/slotStatusTokens";

/** 车位状态的显示文案。地图图例、车位卡片、提醒列表统一引用这里。 */
export const slotStatusLabels: Record<SlotStatus, string> = {
  empty: "空",
  expiringSoon: "快到期",
  leaseAway: "长租车不在",
  occupied: "有车",
  overdue: "已过期",
  privateBorrowed: "私人位借用中",
  privateIdle: "私人位",
  reserved: "预留",
};
