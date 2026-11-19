import type { SlotStatus } from "theme/slotStatusTokens";

/** 地图内采用短状态名，完整状态名仍以 slotStatusLabels 为准。 */
export const slotMapStatusLabels: Record<SlotStatus, string> = {
  empty: "空",
  occupied: "有车",
  expiringSoon: "快到期",
  overdue: "已过期",
  reserved: "预留",
  leaseAway: "长租不在",
  privateIdle: "私人位",
  privateBorrowed: "借用中",
};

export const slotMapText = {
  title: "途泊属",
  subtitle: "家庭停车场管理",
  mapTitle: "车位地图",
  legendTitle: "状态图例",
  zoom: "放大查看",
  overview: "返回全图",
  panLeft: "向左",
  panRight: "向右",
  panUp: "向上",
  panDown: "向下",
  entrance: "入口",
  inactive: "停用",
  unavailable: "未配置",
  detailPending: "详情页开发中",
  backHome: "返回首页",
} as const;
