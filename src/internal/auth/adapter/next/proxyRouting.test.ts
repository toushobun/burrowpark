// @vitest-environment node

import { describe, expect, it } from "vitest";
import { config } from "../../../../../proxy";
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

describe("proxy matcher", () => {
  const matcher = new RegExp(`^${config.matcher[0]}$`);

  it.each([
    "/models/hyperlpr3/v1/y5fu_320x_sim.onnx",
    "/onnxruntime/1.23.2/ort-wasm-simd-threaded.wasm",
  ])("公开静态资源 %s 不经过登录判定", (pathname) => {
    expect(matcher.test(pathname)).toBe(false);
  });

  it("普通页面仍由代理执行登录判定", () => {
    expect(matcher.test("/")).toBe(true);
  });
});
