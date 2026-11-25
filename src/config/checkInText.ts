import type { ParkingBillingType } from "internal/parking";

export const checkInText = {
  title: "登记进场",
  missing: "没有这个车位",
  unavailable: "这个车位当前不能登记",
  hasReservation: "此车位有预留，登记后会自动标记为已到场。",
  plate: "车牌号码",
  identityHint: "拍照、车牌号码、手机号，任选一项即可登记。",
  billingType: "计费方式",
  days: "住宿天数",
  customDays: "自定义",
  dayUnit: "天",
  paidUntil: "交到",
  suggestedAmount: "建议金额",
  receivedAmount: "实收金额（元）",
  paymentMethod: "收款方式",
  borrowDuration: "借用时长",
  minuteUnit: "分钟",
  submit: "确认登记",
  submitting: "登记中",
  invalidPlate: "车牌应为 2～10 个字符",
} as const;

export const paymentMethodLabels = {
  wechat: "微信",
  alipay: "支付宝",
  cash: "现金",
} as const;

export const checkInBillingTypeOrder: ParkingBillingType[] = [
  "hotel_daily",
  "hourly",
  "lease",
  "free",
];
