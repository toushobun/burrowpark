import Box from "@mui/material/Box";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PricingSettingsForm } from "./PricingSettingsForm";
import type { ActionState } from "types/actions";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
const initial = {
  hotel_daily_price_cents: 3000,
  hotel_checkout_hour: 12,
  hotel_previous_day_before_hour: 6,
  hourly_price_cents: 500,
};
function mount(
  action = vi.fn(async (): Promise<ActionState> => ({ success: "已保存" })),
) {
  render(
    <Box sx={{ width: 390 }}>
      <PricingSettingsForm initial={initial} action={action} />
    </Box>,
  );
  return { action };
}
describe("PricingSettingsForm", () => {
  it("390px 显示当前四项值和动态说明", () => {
    mount();
    expect(
      screen.getByRole("textbox", { name: "酒店客每天（元）" }),
    ).toHaveValue("30.00");
    expect(
      screen.getByRole("textbox", { name: "临停每小时（元）" }),
    ).toHaveValue("5.00");
    expect(
      screen.getByText("凌晨 6 点前进场，按前一天算，第二天 12 点前离场"),
    ).toBeInTheDocument();
  });
  it("保存前弹窗确认不影响既往收款", () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: "保存" }));
    expect(screen.getByRole("dialog")).toHaveTextContent("已经收的钱不变");
  });
  it("确认成功后页面常驻已保存状态", async () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: "保存" }));
    fireEvent.click(screen.getByRole("button", { name: "确定保存" }));
    await waitFor(() => expect(screen.getByText("已保存")).toBeInTheDocument());
  });
  it("服务端校验失败会显示反馈对话框", async () => {
    mount(
      vi.fn(
        async (): Promise<ActionState> => ({
          error: "实收金额必须大于 0",
          errorKey: "failure",
        }),
      ),
    );
    fireEvent.click(screen.getByRole("button", { name: "保存" }));
    fireEvent.click(screen.getByRole("button", { name: "确定保存" }));
    await waitFor(() =>
      expect(screen.getByText("实收金额必须大于 0")).toBeInTheDocument(),
    );
  });
});
