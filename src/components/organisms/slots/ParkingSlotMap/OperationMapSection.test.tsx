import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { HomeNavigation } from "molecules/navigation/HomeNavigation/HomeNavigation";
import {
  OperationFeedbackProvider,
  useOperationFeedback,
} from "providers/OperationFeedbackProvider";
import { OperationMapSection } from "./OperationMapSection";

const navigation = vi.hoisted(() => ({ pathname: "/" }));
const replace = vi.fn();
vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
  useRouter: () => ({ replace }),
}));

vi.mock("./ParkingSlotMap", () => ({
  ParkingSlotMap: ({
    highlightCode,
    onSlotOpen,
  }: {
    highlightCode?: string;
    onSlotOpen?: (code: string, origin: string) => void;
  }) => (
    <div data-testid="map" data-highlight={highlightCode ?? ""}>
      <button onClick={() => onSlotOpen?.("7", "100px 200px")}>打开</button>
    </div>
  ),
}));

vi.mock("organisms/slots/OperationToast/OperationToast", () => ({
  OperationToast: ({
    notice,
    onUndoStart,
    onUndone,
    onDismiss,
  }: {
    notice: { code: string; kind: string };
    onUndoStart: () => void;
    onUndone: () => void;
    onDismiss: () => void;
  }) => (
    <div data-testid="operation-toast" data-kind={notice.kind}>
      {notice.code}
      <button onClick={onUndoStart}>开始撤销</button>
      <button onClick={onUndone}>撤销成功</button>
      <button onClick={onDismiss}>关闭</button>
    </div>
  ),
}));

const notice = {
  kind: "reserve" as const,
  code: "12",
  id: "00000000-0000-4000-8000-000000000001",
  message: "已预留 12号（张三）",
};
const undo = async () => ({});
const undoActions = {
  checkin: undo,
  reserve: undo,
  lease: undo,
  checkout: undo,
  renew: undo,
  cancel: undo,
  extend: undo,
  end: undo,
};

function ShowRecentNotice() {
  const { showNotice } = useOperationFeedback();
  return (
    <button onClick={() => showNotice({ ...notice, kind: "checkout" })}>
      显示离场成功
    </button>
  );
}

describe("OperationMapSection", () => {
  beforeEach(() => {
    navigation.pathname = "/";
    replace.mockClear();
  });

  it("立即打开真实本地菜单并保持车位选中，关闭不导航", async () => {
    render(
      <>
        <HomeNavigation />
        <OperationMapSection
          slots={[]}
          notice={null}
          undoActions={undoActions}
          slotOperations={{ "7": <div>登记进场</div> }}
        />
      </>,
    );
    const tab = screen.getByRole("link", { name: "车位" });
    const map = screen.getByTestId("map");
    fireEvent.click(screen.getByRole("button", { name: "打开" }));
    expect(screen.getByRole("dialog")).toHaveTextContent("登记进场");
    expect(tab).toHaveAttribute("aria-current", "page");
    fireEvent.click(screen.getByRole("button", { name: "返回地图" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(tab).toHaveAttribute("aria-current", "page");
    expect(screen.getByTestId("map")).toBe(map);
    expect(replace).not.toHaveBeenCalled();
  });

  it("消费 URL 成功提示后清理历史参数，离开再返回不会重新出现", () => {
    const view = (urlNotice: typeof notice | null, onMap = true) => (
      <OperationFeedbackProvider>
        {onMap ? (
          <OperationMapSection
            slots={[]}
            notice={urlNotice}
            queryId={urlNotice?.id ?? null}
            undoActions={undoActions}
          />
        ) : (
          <div>车位详情页</div>
        )}
      </OperationFeedbackProvider>
    );
    const { rerender } = render(view(notice));
    expect(replace).toHaveBeenCalledWith("/");
    rerender(view(null));
    expect(screen.getByTestId("operation-toast")).toBeInTheDocument();
    navigation.pathname = "/slots/12";
    rerender(view(null, false));
    navigation.pathname = "/";
    rerender(view(null));
    expect(screen.queryByTestId("operation-toast")).toBeNull();
  });
  it("跨页面保存的离场提示可在地图显示并关闭", () => {
    render(
      <OperationFeedbackProvider>
        <ShowRecentNotice />
        <OperationMapSection
          slots={[]}
          notice={null}
          undoActions={undoActions}
        />
      </OperationFeedbackProvider>,
    );
    expect(screen.queryByTestId("operation-toast")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "显示离场成功" }));
    expect(screen.getByTestId("operation-toast")).toHaveTextContent("12");
    fireEvent.click(screen.getByRole("button", { name: "撤销成功" }));
    expect(screen.getByTestId("map")).toHaveAttribute("data-highlight", "");
    fireEvent.click(screen.getByRole("button", { name: "显示离场成功" }));
    expect(screen.getByTestId("map")).toHaveAttribute("data-highlight", "12");
    fireEvent.click(screen.getByRole("button", { name: "撤销成功" }));
    expect(screen.getByTestId("map")).toHaveAttribute("data-highlight", "");
    fireEvent.click(screen.getByRole("button", { name: "关闭" }));
    expect(screen.queryByTestId("operation-toast")).toBeNull();
  });

  it("撤销刷新首页后仍显示成功提示直到关闭，红框同时消失", () => {
    const props = { slots: [], undoActions, queryId: notice.id };
    const initial = <OperationMapSection {...props} notice={notice} />;
    const { rerender } = render(initial);
    expect(screen.getByTestId("map")).toHaveAttribute("data-highlight", "12");
    fireEvent.click(screen.getByRole("button", { name: "开始撤销" }));
    const updated = <OperationMapSection {...props} notice={null} />;
    rerender(updated);
    expect(screen.getByTestId("operation-toast")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "撤销成功" }));
    expect(screen.getByTestId("map")).toHaveAttribute("data-highlight", "");
    fireEvent.click(screen.getByRole("button", { name: "关闭" }));
    expect(screen.queryByTestId("operation-toast")).toBeNull();
  });

  it("撤销 URL 操作后旧的跨页面提示不能覆盖当前撤销反馈", () => {
    const props = { slots: [], undoActions, queryId: notice.id };
    const view = (urlNotice: typeof notice | null) => (
      <OperationFeedbackProvider>
        <ShowRecentNotice />
        <OperationMapSection {...props} notice={urlNotice} />
      </OperationFeedbackProvider>
    );
    const { rerender } = render(view(null));
    fireEvent.click(screen.getByRole("button", { name: "显示离场成功" }));
    expect(screen.getByTestId("operation-toast")).toHaveAttribute(
      "data-kind",
      "checkout",
    );
    rerender(view(notice));
    expect(screen.getByTestId("operation-toast")).toHaveAttribute(
      "data-kind",
      "reserve",
    );
    fireEvent.click(screen.getByRole("button", { name: "开始撤销" }));
    rerender(view(null));
    expect(screen.getByTestId("operation-toast")).toHaveAttribute(
      "data-kind",
      "reserve",
    );
    fireEvent.click(screen.getByRole("button", { name: "撤销成功" }));
    expect(screen.getByTestId("map")).toHaveAttribute("data-highlight", "");
  });

  it("查询参数清除后不会留下旧提示", () => {
    const props = { slots: [], undoActions };
    const withNotice = { ...props, notice, queryId: notice.id };
    const { rerender } = render(<OperationMapSection {...withNotice} />);
    fireEvent.click(screen.getByRole("button", { name: "开始撤销" }));
    const cleared = { ...props, notice: null, queryId: null };
    rerender(<OperationMapSection {...cleared} />);
    expect(screen.queryByTestId("operation-toast")).toBeNull();
  });
});
