import Box from "@mui/material/Box";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ActionState } from "types/actions";
import type { OperationNotice } from "utils/operationNotice";

import { OperationToast, type OperationUndoActions } from "./OperationToast";

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));

const id = "00000000-0000-4000-8000-000000000001";
const checkin: OperationNotice = {
  kind: "checkin",
  code: "12",
  id,
  message: "已登记 12号 辽A·12345",
  photoSaved: true,
};
const reserve: OperationNotice = {
  kind: "reserve",
  code: "12",
  id,
  message: "已预留 12号（张三）",
};
const lease: OperationNotice = {
  kind: "lease",
  code: "12",
  id,
  message: "12号已设为长租（张三）",
};

function actions(): OperationUndoActions {
  const run = async (_state: ActionState, _data: FormData) => ({});
  return {
    checkin: vi.fn(run),
    reserve: vi.fn(run),
    lease: vi.fn(run),
    checkout: vi.fn(run),
    renew: vi.fn(run),
    cancel: vi.fn(run),
    extend: vi.fn(run),
    end: vi.fn(run),
  };
}

function renderToast(
  notice: OperationNotice = checkin,
  undoActions: OperationUndoActions = actions(),
  onUndone = () => {},
  initialState?: ActionState,
) {
  return render(
    <Box sx={{ width: 390 }}>
      <OperationToast
        notice={notice}
        undoActions={undoActions}
        onUndone={onUndone}
        initialState={initialState}
      />
    </Box>,
  );
}

describe("OperationToast", () => {
  beforeEach(() => replace.mockClear());
  afterEach(() => vi.useRealTimers());

  it("登记、预留和长租分别显示正确文案", () => {
    for (const notice of [checkin, reserve, lease]) {
      const view = renderToast(notice);
      expect(screen.getByText(notice.message)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "撤销" })).toBeInTheDocument();
      view.unmount();
    }
  });

  it("登记照片上传失败时额外展示说明", () => {
    renderToast({ ...checkin, photoSaved: false });
    expect(screen.getByText("照片没传上去，车已登记")).toBeInTheDocument();
  });

  it("八种撤销分别调用对应的 action 和字段", async () => {
    const variants = [
      ["checkin", "sessionId"],
      ["reserve", "reservationId"],
      ["lease", "leaseId"],
      ["checkout", "sessionId"],
      ["renew", "paymentId"],
      ["cancel", "reservationId"],
      ["extend", "sessionId"],
      ["end", "leaseId"],
    ] as const;
    for (const [kind, field] of variants) {
      const undoActions = actions();
      const view = renderToast({ ...checkin, kind }, undoActions);
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "撤销" }));
      });
      await waitFor(() => expect(undoActions[kind]).toHaveBeenCalledOnce());
      const data = vi.mocked(undoActions[kind]).mock.calls[0][1];
      expect(data.get(field)).toBe(id);
      view.unmount();
    }
  });

  it("无需撤销的编辑完成只显示提示", () => {
    renderToast({ ...lease, kind: "edit", message: "长租资料已保存" });
    expect(screen.getByText("长租资料已保存")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "撤销" })).toBeNull();
  });

  it("延长借用时一并发送原时间与预期时间", async () => {
    const undoActions = actions();
    const notice: OperationNotice = {
      ...checkin,
      kind: "extend",
      extraUndoFields: [
        { name: "previous", value: "2026-11-23T00:00:00.000Z" },
        { name: "expectedCurrent", value: "2026-11-23T00:10:00.000Z" },
      ],
    };
    renderToast(notice, undoActions);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "撤销" }));
    });
    await waitFor(() => expect(undoActions.extend).toHaveBeenCalledOnce());
    const data = vi.mocked(undoActions.extend).mock.calls[0][1];
    expect(data.get("previous")).toBe("2026-11-23T00:00:00.000Z");
    expect(data.get("expectedCurrent")).toBe("2026-11-23T00:10:00.000Z");
  });

  it("撤销成功展示已撤销并关闭撤销按钮", async () => {
    const onUndone = vi.fn();
    const undoActions = actions();
    undoActions.reserve = vi.fn(async () => ({
      success: "已撤销",
      successKey: "ok",
    }));
    renderToast(reserve, undoActions, onUndone);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "撤销" }));
    });
    await waitFor(() => {
      expect(screen.getByText("已撤销")).toBeInTheDocument();
      expect(onUndone).toHaveBeenCalled();
    });
    expect(screen.queryByRole("button", { name: "撤销" })).toBeNull();
  });

  it("撤销失败后错误未确认时暂停自动关闭，确认后恢复十秒计时", () => {
    vi.useFakeTimers();
    renderToast(reserve, actions(), () => {}, {
      error: "撤销失败，请重试",
      errorKey: "failed-undo",
    });
    expect(screen.getByRole("dialog")).toHaveTextContent("撤销失败，请重试");
    act(() => vi.advanceTimersByTime(15_000));
    expect(replace).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "知道了" }));
    act(() => vi.advanceTimersByTime(9_999));
    expect(replace).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(replace).toHaveBeenCalledWith("/");
  });

  it("提示十秒后自动关闭，手动关闭立即清除参数", () => {
    vi.useFakeTimers();
    const onUndone = vi.fn();
    const success: ActionState = { success: "已撤销", successKey: "ok" };
    const view = renderToast(reserve, actions(), onUndone, success);
    expect(onUndone).toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(9999));
    expect(replace).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(replace).toHaveBeenCalledWith("/");
    view.unmount();
    vi.useRealTimers();
    renderToast();
    fireEvent.click(screen.getByRole("button", { name: "关闭提示" }));
    expect(replace).toHaveBeenCalledWith("/");
  });
});
