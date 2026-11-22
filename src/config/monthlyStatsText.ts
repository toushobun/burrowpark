export const monthlyStatsText = {
  title: "月统计",
  previousMonth: "上个月",
  nextMonth: "下个月",
  total: "收款合计",
  entryCount: (count: number) => `本月进场 ${count} 车次`,
  byMethod: "按收款方式",
  byBillingType: "按计费方式",
  details: "收款明细",
  empty: "这个月还没有收款",
  yuan: "元",
  unknownSlot: "未知车位",
  unknownCustomer: "—",
  monthLabel: (month: string) =>
    `${month.slice(0, 4)}年${Number(month.slice(5))}月`,
} as const;
