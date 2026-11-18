// @vitest-environment node

import { describe, expect, it, vi } from "vitest";
import type { AuthRepository } from "../repository/authRepository";
import { accessCodesMatch, createAuthService } from "./authService";

function stubRepository(): AuthRepository {
  return {
    consumeLoginAttempt: vi.fn().mockResolvedValue({ allowed: true, retryAfterSeconds: 0 }),
    resetLoginAttempts: vi.fn().mockResolvedValue(undefined),
    signInFamily: vi.fn().mockResolvedValue(undefined),
  };
}

const config = () => ({
  ACCESS_CODE: "123456",
  FAMILY_ACCOUNT_EMAIL: "family@example.test",
  FAMILY_ACCOUNT_PASSWORD: "password",
});

describe("createAuthService", () => {
  it("对的访问码先计数再登录，并只清除当前 IP", async () => {
    const repository = stubRepository();
    await createAuthService(repository, config).loginWithCode("123456", "ip:abc");
    expect(vi.mocked(repository.consumeLoginAttempt).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(repository.signInFamily).mock.invocationCallOrder[0],
    );
    expect(repository.resetLoginAttempts).toHaveBeenCalledWith("ip:abc");
  });

  it("不正确的访问码先计数、但不请求登录", async () => {
    const repository = stubRepository();
    await expect(createAuthService(repository, config).loginWithCode("999999", "ip:abc")).rejects.toMatchObject({
      code: "incorrect_access_code",
      message: "访问码不对，请再试一次。",
    });
    expect(repository.consumeLoginAttempt).toHaveBeenCalledOnce();
    expect(repository.signInFamily).not.toHaveBeenCalled();
  });

  it("锁定时返回向上取整的分钟数和原始秒数", async () => {
    const repository = stubRepository();
    vi.mocked(repository.consumeLoginAttempt).mockResolvedValue({
      allowed: false, retryAfterSeconds: 61,
    });
    await expect(createAuthService(repository, config).loginWithCode("123456", "ip:abc")).rejects.toMatchObject({
      code: "access_code_rate_limited",
      message: "输错太多次了，请 2 分钟后再试。",
      details: { retryAfterSeconds: 61 },
    });
    expect(repository.signInFamily).not.toHaveBeenCalled();
  });

  it("认证失败时不清除尝试次数", async () => {
    const repository = stubRepository();
    vi.mocked(repository.signInFamily).mockRejectedValue(new Error("认证失败"));
    await expect(createAuthService(repository, config).loginWithCode("123456", "ip:abc")).rejects.toThrow();
    expect(repository.resetLoginAttempts).not.toHaveBeenCalled();
  });
});

describe("accessCodesMatch", () => {
  it("比较两个 SHA-256 摘要的相等性", () => {
    expect(accessCodesMatch("123456", "123456")).toBe(true);
    expect(accessCodesMatch("123456", "123457")).toBe(false);
  });
});
