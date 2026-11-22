import Box from "@mui/material/Box";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RecordsView } from "./RecordsView";
import type { ActionState } from "types/actions";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh: vi.fn() }),
}));
const payment = {
  id: "00000000-0000-4000-8000-000000000002",
  amount_cents: 3000,
  method: "cash" as const,
  purpose: "prepay" as const,
  paid_at: "2026-11-21T02:00:00.000Z",
  paid_until: "2026-11-22T04:00:00.000Z",
};
const settlement = {
  ...payment,
  id: "00000000-0000-4000-8000-000000000003",
  amount_cents: 500,
  purpose: "settlement" as const,
  paid_until: null,
};
const records = {
  sessions: [
    {
      id: "00000000-0000-4000-8000-000000000001",
      slot_code: "1",
      slotName: "1号",
      plate: "辽A12345",
      billing_type: "hotel_daily" as const,
      entered_at: "2026-11-21T02:00:00.000Z",
      left_at: null,
      session_payments: [payment, settlement],
    },
  ],
  leasePayments: [],
};
const push = vi.hoisted(() => vi.fn());
const action = vi.fn(
  async (_state: ActionState, _data: FormData): Promise<ActionState> => ({
    success: "已保存",
  }),
);
function mount(byPlate = false, empty = false) {
  return render(
    <Box sx={{ width: 390 }}>
      <RecordsView
        filter={
          byPlate
            ? { kind: "plate", plate: "辽A12345" }
            : { kind: "date", date: "2026-11-21" }
        }
        records={empty ? { sessions: [], leasePayments: [] } : records}
        previousDate="2026-11-20"
        nextDate={null}
        action={action}
      />
    </Box>,
  );
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
    expect(screen.getByRole("textbox", { name: "车牌" })).toHaveValue(
      "辽A12345",
    );
    expect(screen.getByText("1号 · 辽A·12345")).toBeInTheDocument();
  });
  it("390px 可按租户名与车位号查询长租", () => {
    render(
      <Box sx={{ width: 390 }}>
        <RecordsView
          filter={{ kind: "lease", searchBy: "tenant", query: "" }}
          records={{ sessions: [], leasePayments: [] }}
          previousDate="2026-11-20"
          nextDate={null}
          action={action}
        />
      </Box>,
    );
    expect(screen.getByRole("link", { name: "查长租" })).toBeInTheDocument();
    fireEvent.change(screen.getByRole("textbox", { name: "租户名" }), {
      target: { value: "王先生" },
    });
    fireEvent.click(screen.getByRole("button", { name: "查询" }));
    expect(push).toHaveBeenLastCalledWith(
      "/records?mode=lease&leaseBy=tenant&leaseQuery=%E7%8E%8B%E5%85%88%E7%94%9F",
    );
    fireEvent.mouseDown(screen.getByRole("combobox", { name: "查询方式" }));
    fireEvent.click(screen.getByRole("option", { name: "车位号" }));
    fireEvent.change(screen.getByRole("textbox", { name: "车位号" }), {
      target: { value: "2" },
    });
    fireEvent.click(screen.getByRole("button", { name: "查询" }));
    expect(push).toHaveBeenLastCalledWith(
      "/records?mode=lease&leaseBy=slot&leaseQuery=2",
    );
    expect(screen.queryByText("没有停车记录")).toBeNull();
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
  it("改金额时确认文案展示金额和收款方式", () => {
    mount();
    fireEvent.click(screen.getAllByRole("button", { name: "改金额" })[0]);
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveTextContent("30.00 元（现金）改成 30.00 元（现金）");
    fireEvent.change(
      within(dialog).getByRole("textbox", { name: "金额（元）" }),
      { target: { value: "3.00" } },
    );
    expect(dialog).toHaveTextContent("30.00 元（现金）改成 3.00 元（现金）");
    fireEvent.mouseDown(
      within(dialog).getByRole("combobox", { name: "收款方式" }),
    );
    fireEvent.click(screen.getByRole("option", { name: "微信" }));
    expect(dialog).toHaveTextContent("30.00 元（现金）改成 3.00 元（微信）");
  });
  it("带交到时间的收款不显示删除按钮，结算收款可删除", () => {
    mount();
    expect(screen.getAllByRole("button", { name: "改金额" })).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: "删除" })).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "删除" }));
    expect(screen.getByRole("dialog")).toHaveTextContent("5.00 元");
  });
  it("删除收款前明确提示不可恢复", () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: "删除" }));
    expect(screen.getByRole("dialog")).toHaveTextContent("删除后不能恢复");
  });
});
