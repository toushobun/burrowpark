export const renewText = {
  title: "续费",
  leaseTitle: "续租",
  missing: "这个车位当前不能续费",
  days: "续住天数",
  custom: "自定义",
  endDate: "续到哪天",
  paidUntil: "新的交到时间",
  suggested: "建议金额",
  method: "收款方式",
  amount: "实收金额（元）",
  submit: "确认收款并续费",
  submitLease: "确认收款并续租",
  submitting: "续费中",
  success: "续费成功",
  successLease: "续租成功",
  invalidDate: "续到日期必须晚于当前交到时间",
} as const;

export const checkOutText = {
  title: "车辆离场",
  missing: "这个车位没有待离场的车",
  plate: "车牌",
  elapsed: "已停时长",
  paidTotal: "已预交／续费合计",
  suggested: "建议补收",
  method: "收款方式",
  amount: "实收金额（元）",
  payAndLeave: "收款并离场",
  noPayLeave: "不收钱，直接离场",
  submitting: "离场处理中",
  success: "离场成功",
  overstay: (hours: number) => "超时 " + hours + " 小时",
} as const;

export const parkingOperationText = {
  backMap: "回地图",
  viewSlot: "查看车位",
} as const;
