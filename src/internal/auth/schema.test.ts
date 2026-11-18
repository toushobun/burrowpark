// @vitest-environment node

import { describe, expect, it } from "vitest";
import { parseAccessCode } from "./schema";

describe("parseAccessCode", () => {
  it("允许 6 至 12 位数字并去掉两端空格", () => {
    expect(parseAccessCode(" 123456 ")).toBe("123456");
    expect(parseAccessCode("123456789012")).toBe("123456789012");
  });

  it.each([null, "", "12345", "1234567890123", "12345a", "１２３４５６"])(
    "拒绝不合法访问码 %s",
    (value) => {
      expect(() => parseAccessCode(value)).toThrow("请输入数字访问码。");
    },
  );
});
