export const pricingSettingsText = {
  menu: "收费设置",
  title: "收费设置",
  hotelDaily: "酒店客每天（元）",
  hotelCheckoutHour: "酒店客几点前离场",
  hotelPreviousDayBeforeHour: "凌晨几点前进场算前一天",
  hourly: "临停每小时（元）",
  save: "保存",
  saved: "已保存",
  confirm: "确定保存",
  cancel: "取消",
  confirmMessage: "只影响以后的登记和建议金额，已经收的钱不变。确定保存吗？",
  checkoutExplanation: (before: number, checkout: number) =>
    `凌晨 ${before} 点前进场，按前一天算，第二天 ${checkout} 点前离场`,
} as const;
