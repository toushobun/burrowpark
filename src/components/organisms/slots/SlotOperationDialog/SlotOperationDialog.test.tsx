import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SlotOperationDialog } from "./SlotOperationDialog";

describe("SlotOperationDialog", () => {
  it("关闭动画结束后清除本地弹窗，不替换背景地图", async () => {
    const onClosed = vi.fn();
    render(
      <>
        <div data-testid="background-map">地图</div>
        <SlotOperationDialog origin="310px 115px" onClosed={onClosed}>
          操作内容
        </SlotOperationDialog>
      </>,
    );
    const map = screen.getByTestId("background-map");
    const transition = screen
      .getByRole("dialog")
      .closest(".MuiDialog-container");
    expect(transition).toHaveStyle({ transformOrigin: "310px 115px" });
    expect(screen.getByRole("dialog")).toHaveTextContent("操作内容");
    fireEvent.click(screen.getByRole("button", { name: "返回地图" }));
    expect(transition).toHaveStyle({ transformOrigin: "310px 115px" });
    await waitFor(() => expect(onClosed).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId("background-map")).toBe(map);
  });
});
