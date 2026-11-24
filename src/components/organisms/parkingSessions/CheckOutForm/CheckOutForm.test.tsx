import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { CheckOutFormData } from "internal/parking";
import { CheckOutForm } from "./CheckOutForm";

const hourly: CheckOutFormData = {
  code: "3",
  name: "3号",
  sessionId: "00000000-0000-4000-8000-000000000001",
  plate: "粤B12345",
  billingType: "hourly",
  enteredAt: "2026-11-20T01:00:00.000Z",
  now: "2026-11-20T03:10:00.000Z",
  paidUntil: null,
  totalPaidCents: 0,
  suggestedAmountCents: 1500,
  overstayHours: 0,
};
const action = vi.fn(async () => ({}));
const push = vi.fn();
const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, replace }) }));
describe("CheckOutForm", () => {
  it("临停显示时长、建议金额且默认微信可收款离场", () => {
    render(<CheckOutForm form={hourly} action={action} />);
    expect(screen.getByText("已停 2 小时 10 分")).toBeInTheDocument();
    expect(screen.getByText("建议补收：15.00 元")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "微信" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "收款并离场" })).toBeEnabled();
    expect(
      screen.getByRole("button", { name: "不收钱，直接离场" }),
    ).toBeEnabled();
  });
  it("长租不显示预交合计且零建议时金额留空", () => {
    render(
      <CheckOutForm
        form={{
          ...hourly,
          billingType: "lease",
          suggestedAmountCents: 0,
          totalPaidCents: null,
        }}
        action={action}
      />,
    );
    expect(screen.queryByText(/已预交/)).toBeNull();
    expect(screen.getByRole("textbox", { name: "实收金额（元）" })).toHaveValue(
      "",
    );
  });
  it("酒店客超时显示明确补收提示", () => {
    render(
      <CheckOutForm
        form={{ ...hourly, overstayHours: 3, suggestedAmountCents: 3000 }}
        action={action}
      />,
    );
    expect(screen.getByText("超时 3 小时")).toBeInTheDocument();
  });
  it("离场成功直接返回地图，不停留在带撤销按钮的结果页", () => {
    render(
      <CheckOutForm
        form={hourly}
        action={action}
        initialState={{
          success: "离场成功",
          successKey: "ok",
          result: { sessionId: hourly.sessionId },
        }}
      />,
    );
    expect(replace).toHaveBeenCalledWith("/");
    expect(screen.getByText("正在返回地图…")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "撤销" })).toBeNull();
  });
  it("离场成功后服务端已清空该车位时仍保持返回地图状态", () => {
    const initialState = {
      success: "离场成功",
      result: { sessionId: hourly.sessionId },
    };
    const props = { action, initialState };
    const { rerender } = render(<CheckOutForm form={hourly} {...props} />);
    rerender(<CheckOutForm form={null} {...props} />);
    expect(screen.getByText("正在返回地图…")).toBeInTheDocument();
    expect(screen.queryByText("这个车位没有待离场的车")).toBeNull();
  });

  it("失败使用统一弹框", () => {
    render(
      <CheckOutForm
        form={hourly}
        action={action}
        initialState={{ error: "这辆车已经离场了", errorKey: "err" }}
      />,
    );
    expect(screen.getByRole("dialog")).toHaveTextContent("这辆车已经离场了");
  });
});
