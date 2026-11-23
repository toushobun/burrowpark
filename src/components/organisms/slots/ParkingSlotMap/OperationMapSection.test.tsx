import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { OperationMapSection } from "./OperationMapSection";

vi.mock("./ParkingSlotMap", () => ({
  ParkingSlotMap: ({ highlightCode }: { highlightCode?: string }) => (
    <div data-testid="map" data-highlight={highlightCode ?? ""} />
  ),
}));

vi.mock("organisms/slots/OperationToast/OperationToast", () => ({
  OperationToast: ({
    notice,
    onUndoStart,
    onUndone,
    onDismiss,
  }: {
    notice: { code: string };
    onUndoStart: () => void;
    onUndone: () => void;
    onDismiss: () => void;
  }) => (
    <div data-testid="operation-toast">
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
const undoActions = { checkin: undo, reserve: undo, lease: undo };

describe("OperationMapSection", () => {
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
