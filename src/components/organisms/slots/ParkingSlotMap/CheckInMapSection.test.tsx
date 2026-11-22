import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CheckInMapSection } from "./CheckInMapSection";

vi.mock("./ParkingSlotMap", () => ({
  ParkingSlotMap: ({ highlightCode }: { highlightCode?: string }) => (
    <div data-testid="map" data-highlight={highlightCode ?? ""} />
  ),
}));

vi.mock("organisms/parkingSessions/CheckInToast/CheckInToast", () => ({
  CheckInToast: ({
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
    <div data-testid="check-in-toast">
      {notice.code}
      <button onClick={onUndoStart}>开始撤销</button>
      <button onClick={onUndone}>撤销成功</button>
      <button onClick={onDismiss}>关闭</button>
    </div>
  ),
}));

const notice = {
  code: "12",
  sessionId: "00000000-0000-4000-8000-000000000001",
  plate: "辽A12345",
  slotName: "12号",
  photoSaved: true,
};

const undoAction = async () => ({});

describe("CheckInMapSection", () => {
  it("撤销后首页重新读取不到会话时，仍保留成功提示直到关闭", () => {
    const props = { slots: [], undoAction, querySessionId: notice.sessionId };
    const { rerender } = render(
      <CheckInMapSection {...props} notice={notice} />,
    );
    expect(screen.getByTestId("map")).toHaveAttribute("data-highlight", "12");

    fireEvent.click(screen.getByRole("button", { name: "开始撤销" }));
    rerender(<CheckInMapSection {...props} notice={null} />);
    expect(screen.getByTestId("check-in-toast")).toHaveTextContent("12");

    fireEvent.click(screen.getByRole("button", { name: "撤销成功" }));
    expect(screen.getByTestId("map")).toHaveAttribute("data-highlight", "");

    fireEvent.click(screen.getByRole("button", { name: "关闭" }));
    expect(screen.queryByTestId("check-in-toast")).toBeNull();
  });

  it("URL 清除本次登记参数后不再保留旧提示", () => {
    const props = { slots: [], undoAction };
    const { rerender } = render(
      <CheckInMapSection
        {...props}
        notice={notice}
        querySessionId={notice.sessionId}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "开始撤销" }));
    rerender(
      <CheckInMapSection {...props} notice={null} querySessionId={null} />,
    );
    expect(screen.queryByTestId("check-in-toast")).toBeNull();
  });
});
