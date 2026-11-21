import type { MonthlyStats } from "internal/parking";

export const populatedStats: MonthlyStats = {
  totalCents: 123400,
  entryCount: 8,
  byMethod: { wechat: 100000, alipay: 23400, cash: 0 },
  byBillingType: { hotel_daily: 100000, hourly: 23400, lease: 0, free: 0 },
  payments: [
    {
      id: "p-1",
      paidAtText: "11月19日 12:30",
      slotName: "7号",
      customer: "粤B·12345",
      amountCents: 100000,
      method: "wechat",
    },
    {
      id: "p-2",
      paidAtText: "11月18日 09:00",
      slotName: "2号",
      customer: "张女士",
      amountCents: 23400,
      method: "alipay",
    },
  ],
};

export const emptyStats: MonthlyStats = {
  totalCents: 0,
  entryCount: 0,
  byMethod: { wechat: 0, alipay: 0, cash: 0 },
  byBillingType: { hotel_daily: 0, hourly: 0, lease: 0, free: 0 },
  payments: [],
};
