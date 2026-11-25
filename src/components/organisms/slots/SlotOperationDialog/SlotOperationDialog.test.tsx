import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SlotOperationDialog } from "./SlotOperationDialog";

const back = vi.fn();
const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ back, refresh }) }));

describe("SlotOperationDialog", () => {
  it("关闭弹窗只回退历史记录，不刷新背景地图", async () => {
    render(
      <>
        <div data-testid="background-map">地图</div>
        <SlotOperationDialog code="7">操作内容</SlotOperationDialog>
      </>,
    );
    const map = screen.getByTestId("background-map");
    expect(screen.getByRole("dialog")).toHaveTextContent("操作内容");
    fireEvent.click(screen.getByRole("button", { name: "返回地图" }));
    await waitFor(() => expect(back).toHaveBeenCalledTimes(1));
    expect(refresh).not.toHaveBeenCalled();
    expect(screen.getByTestId("background-map")).toBe(map);
  });

  it("弹窗缩放使用点击位置而非车位中心，关闭时保留同一原点", () => {
    const code = "7";
    render(
      <>
        <svg>
          <a href={"/slots/" + code} data-slot-operation-origin="310px 115px">
            <rect x="240" y="100" width="80" height="60" />
          </a>
        </svg>
        <SlotOperationDialog code={code}>操作内容</SlotOperationDialog>
      </>,
    );
    const transition = screen
      .getByRole("dialog")
      .closest(".MuiDialog-container");
    expect(transition).toHaveStyle({ transformOrigin: "310px 115px" });
    fireEvent.click(screen.getByRole("button", { name: "返回地图" }));
    expect(transition).toHaveStyle({ transformOrigin: "310px 115px" });
  });
});
