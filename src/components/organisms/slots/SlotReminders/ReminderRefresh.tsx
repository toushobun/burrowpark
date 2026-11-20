"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** 只刷新服务端事实；隐藏页面暂停，重新可见立即刷新。 */
export function ReminderRefresh() {
  const router = useRouter();
  useEffect(() => {
    const refreshVisible = () => {
      if (!document.hidden) router.refresh();
    };
    const onVisibilityChange = () => {
      if (!document.hidden) router.refresh();
    };
    const timer = window.setInterval(refreshVisible, 60000);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [router]);
  return null;
}
