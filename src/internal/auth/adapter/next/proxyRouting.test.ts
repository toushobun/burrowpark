// @vitest-environment node

import { describe, expect, it } from "vitest";
import { decideProxyRouting, type ProxyAuthStatus } from "./proxyRouting";

describe("decideProxyRouting", () => {
  it.each([
    ["authenticated", "allow", "allow", "home"],
    ["unauthenticated", "login", "allow", "allow"],
    ["unavailable", "allow", "allow", "allow"],
  ] as const)(
    "认证状态为 %s 的页面、API、登录页决策正确",
    (status: ProxyAuthStatus, page, api, login) => {
      expect(decideProxyRouting("/", status)).toBe(page);
      expect(decideProxyRouting("/api/slots", status)).toBe(api);
      expect(decideProxyRouting("/login", status)).toBe(login);
    },
  );
});
