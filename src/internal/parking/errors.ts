/** 车位业务对用户展示的统一错误文案。 */
export const parkingMessages = {
  unavailable: "车位状态暂时无法读取，请稍后重试。",
  invalidInput: "登记信息有误，请检查后重试。",
  invalidPlate: "请输入正确的车牌号码。",
  invalidDays: "住宿天数必须在 1～30 天之间。",
  invalidAmount: "实收金额必须大于 0，最多保留两位小数。",
  slotUnavailable: "这个车位已停用或不存在。",
  slotOccupied: "这个车位刚刚被登记了",
  leaseUnavailable: "这个车位没有在租长租。",
  cannotUndo: "已经不能撤销了",
  paymentRequired: "请选择收款方式并填写实收金额。",
  renewUnavailable: "这个车位当前不能续费。",
  renewDateInvalid: "续租日期必须晚于当前交到日期。",
  checkoutUnavailable: "这辆车已经离场了",
  checkoutUndoOccupied: "这个车位已经停了别的车，不能撤销",
} as const;
