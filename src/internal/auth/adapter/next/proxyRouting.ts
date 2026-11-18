export type ProxyAuthStatus =
  | "authenticated"
  | "unauthenticated"
  | "unavailable";
export type ProxyRoutingDecision = "allow" | "login" | "home";

/** 认证状态和 URL 的组合决策；API 自行返回 401，服务异常保留原路径。 */
export function decideProxyRouting(
  pathname: string,
  status: ProxyAuthStatus,
): ProxyRoutingDecision {
  if (status === "unavailable" || pathname.startsWith("/api/")) return "allow";
  if (status === "authenticated") {
    return pathname === "/login" ? "home" : "allow";
  }
  return pathname === "/login" ? "allow" : "login";
}
