import { createHash } from "node:crypto";

export function getClientIp(headers: Pick<Headers, "get">): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("x-real-ip")?.trim() || "unknown";
}

export function hashClientIp(ip: string): string {
  return `ip:${createHash("sha256").update(ip).digest("hex")}`;
}
