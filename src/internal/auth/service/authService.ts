import { createHash, timingSafeEqual } from "node:crypto";

import {
  RateLimitError,
  ValidationError,
} from "internal/shared/errors/appError";
import type { AuthRepository } from "internal/auth/repository/authRepository";
import { getAuthEnvironment } from "internal/auth/repository/authEnvironment";

import { authMessages } from "../errors";

export const loginAttemptLimits = {
  ip: { maxAttempts: 5, windowMinutes: 15, lockMinutes: 15 },
  global: { maxAttempts: 30, windowMinutes: 60, lockMinutes: 60 },
} as const;

export interface AuthService {
  loginWithCode(code: string, ipKey: string): Promise<void>;
}

export function accessCodesMatch(submitted: string, expected: string): boolean {
  const submittedDigest = createHash("sha256").update(submitted).digest();
  const expectedDigest = createHash("sha256").update(expected).digest();
  return timingSafeEqual(submittedDigest, expectedDigest);
}

export function createAuthService(
  repository: AuthRepository,
  getConfig = getAuthEnvironment,
): AuthService {
  return {
    async loginWithCode(code, ipKey) {
      const attempt = await repository.consumeLoginAttempt(ipKey);
      if (!attempt.allowed) {
        const minutes = Math.max(1, Math.ceil(attempt.retryAfterSeconds / 60));
        throw new RateLimitError(
          "access_code_rate_limited",
          authMessages.retryAfter(minutes),
          { details: { retryAfterSeconds: attempt.retryAfterSeconds } },
        );
      }

      const config = getConfig();
      if (!accessCodesMatch(code, config.ACCESS_CODE)) {
        throw new ValidationError(
          "incorrect_access_code",
          authMessages.incorrectCode,
        );
      }

      await repository.signInFamily(
        config.FAMILY_ACCOUNT_EMAIL,
        config.FAMILY_ACCOUNT_PASSWORD,
      );
      await repository.resetLoginAttempts(ipKey);
    },
  };
}
