import { sharedErrorMessages } from "internal/shared/errors/sharedErrorMessages";

export const authMessages = {
  subtitle: "请输入访问码",
  accessCodeLabel: "访问码",
  submit: "进入",
  invalidCode: "请输入数字访问码。",
  incorrectCode: "访问码不对，请再试一次。",
  unavailable: sharedErrorMessages.authUnavailable,
  retryAfter: (minutes: number) => `输错太多次了，请 ${minutes} 分钟后再试。`,
} as const;
