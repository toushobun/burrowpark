import { sharedErrorMessages } from "internal/shared/errors/sharedErrorMessages";

export const authMessages = {
  title: "途泊属",
  subtitle: "请输入访问码",
  accessCodeLabel: "访问码",
  submit: "进入",
  acknowledge: "知道了",
  invalidCode: "请输入数字访问码。",
  incorrectCode: "访问码不对，请再试一次。",
  unavailable: sharedErrorMessages.authUnavailable,
  retry: "再试一次",
  retryAfter: (minutes: number) => `输错太多次了，请 ${minutes} 分钟后再试。`,
} as const;
