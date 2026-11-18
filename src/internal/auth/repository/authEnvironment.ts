import "server-only";

import { z } from "zod";

import { RepositoryError } from "internal/shared/errors/appError";

import { authMessages } from "../errors";

const configSchema = z.object({
  ACCESS_CODE: z.string().regex(/^\d{6,12}$/),
  FAMILY_ACCOUNT_EMAIL: z.email(),
  FAMILY_ACCOUNT_PASSWORD: z.string().min(1),
});

export function getAuthEnvironment() {
  const parsed = configSchema.safeParse(process.env);
  if (!parsed.success) {
    // 配置细节和密钥不能进入浏览器或日志。
    throw new RepositoryError("auth_config_invalid", authMessages.unavailable);
  }
  return parsed.data;
}
