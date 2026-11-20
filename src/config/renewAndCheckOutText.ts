export const renewText = {
  title: "续费",
  missing: "这个车位当前不能续费",
  days: "续住天数",
  custom: "自定义",
  endDate: "续到哪天",
  paidUntil: "新的交到时间",
  suggested: "建议金额",
  method: "收款方式",
  amount: "实收金额（元）",
  submit: "确认收款并续费",
  submitting: "续费中",
  undone: "已撤销续费",
  success: "续费成功",
  invalidDate: "请选择晚于当前交到日期的日期",
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
  undone: "已撤销离场",
  success: "离场成功",
  overstay: (hours: number) => "超时 " + hours + " 小时",
} as const;

export const parkingOperationText = {
  backMap: "回地图",
  viewSlot: "查看车位",
  undo: "撤销",
  undoing: "撤销中",
  suggestedSuffix: " 元",
} as const;
