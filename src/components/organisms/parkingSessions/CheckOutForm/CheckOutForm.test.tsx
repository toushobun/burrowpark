import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { CheckOutFormData } from "internal/parking";
import { CheckOutForm } from "./CheckOutForm";

const hourly: CheckOutFormData = {
  code: "3", name: "3号", sessionId: "00000000-0000-4000-8000-000000000001",
  plate: "粤B12345", billingType: "hourly",
  enteredAt: "2026-11-20T01:00:00.000Z", now: "2026-11-20T03:10:00.000Z",
  paidUntil: null, totalPaidCents: 0, suggestedAmountCents: 1500, overstayHours: 0,
};
const action = vi.fn(async () => ({}));
describe("CheckOutForm", () => {
  it("临停显示时长、建议金额且必须选方式才能收款离场", () => {
    render(<CheckOutForm form={hourly} action={action} undoAction={action} />);
    expect(screen.getByText("已停 2 小时 10 分")).toBeInTheDocument();
    expect(screen.getByText("建议补收：15.00 元")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "收款并离场" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "微信" }));
    expect(screen.getByRole("button", { name: "收款并离场" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "不收钱，直接离场" })).toBeEnabled();
  });
  it("长租不显示预交合计且零建议时金额留空", () => {
    render(<CheckOutForm form={{ ...hourly, billingType: "lease",
      suggestedAmountCents: 0, totalPaidCents: null }} action={action} undoAction={action} />);
    expect(screen.queryByText(/已预交/)).toBeNull();
    expect(screen.getByRole("textbox", { name: "实收金额（元）" })).toHaveValue("");
  });
  it("酒店客超时显示明确补收提示", () => {
    render(<CheckOutForm form={{ ...hourly, overstayHours: 3,
      suggestedAmountCents: 3000 }} action={action} undoAction={action} />);
    expect(screen.getByText("超时 3 小时")).toBeInTheDocument();
  });
  it("离场成功常驻结果区并允许撤销", () => {
    render(<CheckOutForm form={hourly} action={action} undoAction={action}
      initialState={{ success: "离场成功", successKey: "ok",
        result: { sessionId: hourly.sessionId, plate: hourly.plate } }} />);
    expect(screen.getByRole("link", { name: "回地图" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "查看车位" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "撤销" })).toBeInTheDocument();
  });
  it("失败使用统一弹框", () => {
    render(<CheckOutForm form={hourly} action={action} undoAction={action}
      initialState={{ error: "这辆车已经离场了", errorKey: "err" }} />);
    expect(screen.getByRole("dialog")).toHaveTextContent("这辆车已经离场了");
  });
});
