// @vitest-environment node

import { describe, expect, it } from "vitest";
import { isAuthorizedCron } from "./photoCleanupController";

describe("isAuthorizedCron", () => {
  it("密钥未设置或请求未带凭证一律拒绝", () => {
    expect(isAuthorizedCron(undefined, undefined)).toBe(false);
    expect(isAuthorizedCron("Bearer expected", undefined)).toBe(false);
    expect(isAuthorizedCron(undefined, "expected")).toBe(false);
    expect(isAuthorizedCron("Bearer wrong", "expected")).toBe(false);
  });
  it("只接受完全匹配的 Bearer 凭证", () => {
    expect(isAuthorizedCron("Bearer expected", "expected")).toBe(true);
    expect(isAuthorizedCron("expected", "expected")).toBe(false);
  });
});
