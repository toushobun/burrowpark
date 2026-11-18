// @vitest-environment node

import { describe, expect, it } from "vitest";

import { getClientIp, hashClientIp } from "./clientIp";

describe("getClientIp", () => {
  it("使用 x-forwarded-for 的第一个 IP", () => {
    const h = new Headers({
      "x-forwarded-for": " 203.0.113.1, 198.51.100.7",
      "x-real-ip": "198.51.100.8",
    });
    expect(getClientIp(h)).toBe("203.0.113.1");
  });

  it("缺少 x-forwarded-for 时使用 x-real-ip", () => {
    expect(getClientIp(new Headers({ "x-real-ip": "198.51.100.8" }))).toBe(
      "198.51.100.8",
    );
  });

  it("没有 IP 头时稳定归入同一限流键", () => {
    expect(hashClientIp(getClientIp(new Headers()))).toMatch(
      /^ip:[0-9a-f]{64}$/,
    );
    expect(hashClientIp("a")).not.toBe(hashClientIp("b"));
  });
});
