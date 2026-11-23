import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  OperationFeedbackProvider,
  useOperationFeedback,
} from "./OperationFeedbackProvider";

const navigation = vi.hoisted(() => ({ pathname: "/" }));
vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
}));

function NoticeControls() {
  const { notice, showNotice } = useOperationFeedback();
  return (
    <>
      <button
        onClick={() =>
          showNotice({
            kind: "checkout",
            code: "12",
            id: "00000000-0000-4000-8000-000000000001",
            message: "离场成功",
          })
        }
      >
        显示操作成功
      </button>
      <output data-testid="notice">{notice?.message ?? "无提示"}</output>
    </>
  );
}

function view() {
  return (
    <OperationFeedbackProvider>
      <NoticeControls />
    </OperationFeedbackProvider>
  );
}

describe("OperationFeedbackProvider", () => {
  beforeEach(() => {
    navigation.pathname = "/";
  });

  it("离开地图后清除旧操作提示，再返回时不重新出现", () => {
    const { rerender } = render(view());
    fireEvent.click(screen.getByRole("button", { name: "显示操作成功" }));
    expect(screen.getByTestId("notice")).toHaveTextContent("离场成功");

    navigation.pathname = "/slots/12";
    rerender(view());
    expect(screen.getByTestId("notice")).toHaveTextContent("无提示");

    navigation.pathname = "/";
    rerender(view());
    expect(screen.getByTestId("notice")).toHaveTextContent("无提示");
  });

  it("操作页成功后新提示仍可跨页面带回地图", () => {
    navigation.pathname = "/slots/12/check-out";
    const { rerender } = render(view());
    fireEvent.click(screen.getByRole("button", { name: "显示操作成功" }));
    navigation.pathname = "/";
    rerender(view());
    expect(screen.getByTestId("notice")).toHaveTextContent("离场成功");
  });
});
