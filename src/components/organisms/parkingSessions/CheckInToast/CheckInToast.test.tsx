import Box from "@mui/material/Box";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";

import { CheckInToast, type CheckInNotice } from "./CheckInToast";

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));

const notice: CheckInNotice = {
  code: "12",
  sessionId: "00000000-0000-4000-8000-000000000001",
  plate: "辽A12345",
  slotName: "12号",
  photoSaved: true,
};
const undoAction = async () => ({});
const baseProps = { notice, undoAction, onUndone: () => {} };

type ToastProps = ComponentProps<typeof CheckInToast>;

function renderToast(overrides: Partial<ToastProps> = {}) {
  return render(
    <Box sx={{ width: 390 }}>
      <CheckInToast {...baseProps} {...overrides} />
    </Box>,
  );
}

describe("CheckInToast", () => {
  it("390px 提示条显示车位车牌、撤销按钮和关闭入口", () => {
    renderToast();
    expect(screen.getByText("已登记 12号 辽A·12345")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "撤销" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "关闭提示" })).toBeInTheDocument();
  });

  it("照片上传失败时增加说明行", () => {
    renderToast({ notice: { ...notice, photoSaved: false } });
    expect(screen.getByText("照片没传上去，车已登记")).toBeInTheDocument();
  });

  it("撤销成功后变为已撤销，并移除撤销按钮", async () => {
    const onUndone = vi.fn();
    const action = vi.fn(async () => ({ success: "已撤销", successKey: "ok" }));
    renderToast({ undoAction: action, onUndone });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "撤销" }));
    });
    await waitFor(() => {
      expect(screen.getByText("已撤销")).toBeInTheDocument();
      expect(onUndone).toHaveBeenCalled();
    });
    expect(screen.queryByRole("button", { name: "撤销" })).toBeNull();
  });

  it("关闭提示条后清理首页查询参数", () => {
    renderToast();
    fireEvent.click(screen.getByRole("button", { name: "关闭提示" }));
    expect(replace).toHaveBeenCalledWith("/");
  });
});
