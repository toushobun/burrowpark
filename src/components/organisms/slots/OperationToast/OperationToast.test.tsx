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

import {
  OperationToast,
  type OperationUndoActions,
} from "./OperationToast";

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
  return { checkin: vi.fn(run), reserve: vi.fn(run), lease: vi.fn(run) };
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

  it.each([checkin, reserve, lease])("三类完成提示显示正确文案", (notice) => {
    renderToast(notice);
    expect(screen.getByText(notice.message)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "撤销" })).toBeInTheDocument();
  });

  it("登记的照片上传失败时额外展示说明", () => {
    renderToast({ ...checkin, photoSaved: false });
    expect(screen.getByText("照片没传上去，车已登记")).toBeInTheDocument();
  });

  it.each([
    ["checkin", "sessionId"],
    ["reserve", "reservationId"],
    ["lease", "leaseId"],
  ] as const)("撤销 %s 时传正确操作和字段 %s", async (kind, field) => {
    const undoActions = actions();
    renderToast({ ...checkin, kind }, undoActions);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "撤销" }));
    });
    await waitFor(() => expect(undoActions[kind]).toHaveBeenCalledTimes(1));
    const data = vi.mocked(undoActions[kind]).mock.calls[0][1];
    expect(data.get(field)).toBe(id);
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

  it("撤销成功三秒后清除参数，关闭按钮立即清除参数", () => {
    vi.useFakeTimers();
    const onUndone = vi.fn();
    const { unmount } = renderToast(
      reserve,
      actions(),
      onUndone,
      { success: "已撤销", successKey: "ok" },
    );
    expect(onUndone).toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(3000));
    expect(replace).toHaveBeenCalledWith("/");
    unmount();
    vi.useRealTimers();
    renderToast();
    fireEvent.click(screen.getByRole("button", { name: "关闭提示" }));
    expect(replace).toHaveBeenCalledWith("/");
  });
});
