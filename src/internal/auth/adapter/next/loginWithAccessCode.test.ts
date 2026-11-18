// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ValidationError } from "internal/shared/errors/appError";
import { sharedErrorMessages } from "internal/shared/errors/sharedErrorMessages";

import { loginWithAccessCode } from "./loginWithAccessCode";

const mocks = vi.hoisted(() => ({
  headers: vi.fn(),
  redirect: vi.fn(),
  createRequestDependencies: vi.fn(),
  createRequestContainer: vi.fn(),
  loginWithCode: vi.fn(),
  loggerError: vi.fn(),
}));

vi.mock("next/headers", () => ({ headers: mocks.headers }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("internal/shared/context/requestDependencies", () => ({
  createRequestDependencies: mocks.createRequestDependencies,
}));
vi.mock("internal/container", () => ({
  createRequestContainer: mocks.createRequestContainer,
}));

function createFormData(code = "123456"): FormData {
  const data = new FormData();
  data.set("accessCode", code);
  return data;
}

describe("loginWithAccessCode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.headers.mockResolvedValue(
      new Headers({ "x-forwarded-for": "203.0.113.5" }),
    );
    mocks.createRequestDependencies.mockResolvedValue({
      logger: { error: mocks.loggerError },
    });
    mocks.createRequestContainer.mockReturnValue({
      auth: { loginWithCode: mocks.loginWithCode },
    });
    mocks.loginWithCode.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("AppError 返回原有的安全错误文案", async () => {
    mocks.loginWithCode.mockRejectedValueOnce(
      new ValidationError("incorrect_access_code", "访问码不对，请再试一次。"),
    );

    await expect(loginWithAccessCode({}, createFormData())).resolves.toEqual({
      error: "访问码不对，请再试一次。",
      errorKey: expect.any(String),
    });
    expect(mocks.loggerError).not.toHaveBeenCalled();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("未知异常使用请求级 logger 并返回服务不可用", async () => {
    mocks.loginWithCode.mockRejectedValueOnce(new Error("敏感内部信息"));

    await expect(loginWithAccessCode({}, createFormData())).resolves.toEqual({
      error: sharedErrorMessages.authUnavailable,
      errorKey: expect.any(String),
    });
    expect(mocks.loggerError).toHaveBeenCalledWith(
      "[auth] login action failed",
      { errorName: "Error" },
    );
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("成功时重定向至首页", async () => {
    await loginWithAccessCode({}, createFormData());

    expect(mocks.loginWithCode).toHaveBeenCalledWith(
      "123456",
      expect.stringMatching(/^ip:[0-9a-f]{64}$/),
    );
    expect(mocks.redirect).toHaveBeenCalledWith("/");
  });

  it("请求依赖创建失败时记录安全日志并返回服务不可用", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.createRequestDependencies.mockRejectedValueOnce(
      new Error("敏感连接信息"),
    );

    await expect(loginWithAccessCode({}, createFormData())).resolves.toEqual({
      error: sharedErrorMessages.authUnavailable,
      errorKey: expect.any(String),
    });
    expect(consoleError).toHaveBeenCalledWith("[auth] login action failed", {
      errorName: "Error",
    });
    expect(mocks.createRequestContainer).not.toHaveBeenCalled();
    expect(mocks.loggerError).not.toHaveBeenCalled();
  });
});
