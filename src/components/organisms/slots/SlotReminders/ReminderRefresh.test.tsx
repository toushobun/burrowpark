import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ReminderRefresh } from "./ReminderRefresh";

const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

describe("ReminderRefresh", () => {
  beforeEach(() => {
    refresh.mockReset();
    vi.useFakeTimers();
    Object.defineProperty(document, "hidden", { configurable: true, value: false });
  });
  afterEach(() => {
    vi.useRealTimers();
    Object.defineProperty(document, "hidden", { configurable: true, value: false });
  });

  it("前台时每六十秒触发一次服务端重新读取", () => {
    const { unmount } = render(<ReminderRefresh />);
    act(() => vi.advanceTimersByTime(60000));
    expect(refresh).toHaveBeenCalledTimes(1);
    act(() => vi.advanceTimersByTime(60000));
    expect(refresh).toHaveBeenCalledTimes(2);
    unmount();
  });

  it("后台暂停刷新，回到前台立即请求最新事实", () => {
    const { unmount } = render(<ReminderRefresh />);
    Object.defineProperty(document, "hidden", { configurable: true, value: true });
    act(() => vi.advanceTimersByTime(120000));
    expect(refresh).not.toHaveBeenCalled();
    Object.defineProperty(document, "hidden", { configurable: true, value: false });
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    expect(refresh).toHaveBeenCalledTimes(1);
    unmount();
    act(() => vi.advanceTimersByTime(60000));
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});
