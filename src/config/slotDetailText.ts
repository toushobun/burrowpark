import type { ParkingBillingType } from "internal/parking";

export const billingTypeLabels: Record<ParkingBillingType, string> = {
  hotel_daily: "酒店客",
  hourly: "临停",
  lease: "长租",
  free: "免费（装卸）",
};

export const slotDetailText = {
  pageTitle: "车位详情",
  missing: "没有这个车位",
  inactive: "停用",
  plate: "车牌",
  billingType: "计费方式",
  enteredAt: "进场时间",
  guestName: "预留人",
  note: "备注",
  tenantName: "租户名",
  leasePaidUntil: "长租交到",
  paidUntil: "交到",
  borrowUntil: "借到",
  photo: "进场照片",
  enter: "登记进场",
  renew: "续费",
  renewLease: "续租",
  leave: "离场",
  extendBorrow: "再借一会儿",
  phone: "打电话",
  backMap: "回地图",
  backHome: "回首页",
  pending: "功能开发中",
} as const;
