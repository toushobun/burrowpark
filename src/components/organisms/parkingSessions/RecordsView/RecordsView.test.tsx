import Box from "@mui/material/Box";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RecordsView } from "./RecordsView";
import type { ActionState } from "types/actions";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
const payment = { id: "00000000-0000-4000-8000-000000000002", amount_cents: 3000,
  method: "cash" as const, purpose: "prepay" as const,
  paid_at: "2026-11-21T02:00:00.000Z", paid_until: "2026-11-22T04:00:00.000Z" };
const records = { sessions: [{
  id: "00000000-0000-4000-8000-000000000001", slot_code: "1", slotName: "1号",
  plate: "辽A12345", billing_type: "hotel_daily" as const, entered_at: "2026-11-21T02:00:00.000Z",
  left_at: null, session_payments: [payment],
}], leasePayments: [] };
const action = vi.fn(async (_state: ActionState, _data: FormData): Promise<ActionState> => ({ success: "已保存" }));
function mount(byPlate = false, empty = false) {
  return render(<Box sx={{ width: 390 }}><RecordsView
    filter={byPlate ? { kind: "plate", plate: "辽A12345" } : { kind: "date", date: "2026-11-21" }}
    records={empty ? { sessions: [], leasePayments: [] } : records}
    previousDate="2026-11-20" nextDate={null} action={action}
  /></Box>);
}
describe("RecordsView", () => {
  it("390px 按日期显示停车记录和收款", () => {
    mount();
    expect(screen.getByText("1号 · 辽A·12345")).toBeInTheDocument();
    expect(screen.getByText("在场", { exact: false })).toBeInTheDocument();
    expect(screen.getByText("30.00 元", { exact: false })).toBeInTheDocument();
    expect(screen.queryByText("后一天")).toBeNull();
  });
  it("390px 按车牌展示搜索框和记录", () => {
    mount(true);
    expect(screen.getByRole("textbox", { name: "车牌" })).toHaveValue("辽A12345");
    expect(screen.getByText("1号 · 辽A·12345")).toBeInTheDocument();
  });
  it("390px 空结果显示提示", () => {
    mount(false, true);
    expect(screen.getByText("没有停车记录")).toBeInTheDocument();
    expect(screen.getByText("没有长租收款")).toBeInTheDocument();
  });
  it("改车牌时弹出二次确认", () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: "改车牌" }));
    expect(screen.getByRole("dialog")).toHaveTextContent("确定把");
  });
  it("改金额时弹出二次确认", () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: "改金额" }));
    expect(screen.getByRole("dialog")).toHaveTextContent("30.00 元改成 30.00 元");
  });
  it("删除收款前明确提示不可恢复", () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: "删除" }));
    expect(screen.getByRole("dialog")).toHaveTextContent("删除后不能恢复");
  });
});
