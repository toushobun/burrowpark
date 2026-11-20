import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { RenewFormData } from "internal/parking";
import { RenewForm } from "./RenewForm";

const hotel: RenewFormData = {
  code: "3",
  name: "3号",
  mode: "hotel_daily",
  sessionId: "00000000-0000-4000-8000-000000000001",
  leaseId: null,
  paidUntil: "2026-10-30T04:00:00.000Z",
  defaultEndDate: null,
  hotelDailyPriceCents: 3000,
  plate: "粤B12345",
};
const action = vi.fn(async () => ({}));
describe("RenewForm", () => {
  it("长租的当前交到时间在当天中午时，允许续到当天 23:59:59", () => {
    render(
      <RenewForm
        form={{
          ...hotel,
          mode: "lease",
          paidUntil: "2026-10-30T04:00:00.000Z",
          defaultEndDate: "2026-11-30",
        }}
        action={action}
        undoAction={action}
      />,
    );
    fireEvent.change(screen.getByLabelText("续到哪天"), {
      target: { value: "2026-10-30" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "实收金额（元）" }), {
      target: { value: "100.00" },
    });
    fireEvent.click(screen.getByRole("button", { name: "微信" }));
    expect(
      screen.getByRole("button", { name: "确认收款并续租" }),
    ).toBeEnabled();
  });
  it("过期酒店客从旧交到日期顺延并随天数调整金额", () => {
    render(<RenewForm form={hotel} action={action} undoAction={action} />);
    expect(
      screen.getByText("新的交到时间：10月31日 12:00"),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "3 天" }));
    expect(screen.getByText("新的交到时间：11月2日 12:00")).toBeInTheDocument();
    expect(screen.getByText("建议金额：90.00 元")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "确认收款并续费" }),
    ).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "微信" }));
    expect(
      screen.getByRole("button", { name: "确认收款并续费" }),
    ).toBeEnabled();
  });
  it("长租只要求日期、手输金额并拒绝旧截止日期", () => {
    render(
      <RenewForm
        form={{
          ...hotel,
          mode: "lease",
          defaultEndDate: "2026-11-30",
          paidUntil: "2026-10-31T15:59:59.000Z",
        }}
        action={action}
        undoAction={action}
      />,
    );
    expect(screen.queryByRole("button", { name: "1 天" })).toBeNull();
    fireEvent.change(screen.getByLabelText("续到哪天"), {
      target: { value: "2026-10-31" },
    });
    expect(
      screen.getByRole("button", { name: "确认收款并续租" }),
    ).toBeDisabled();
  });
  it("续费成功后常驻三按钮结果区", () => {
    render(
      <RenewForm
        form={hotel}
        action={action}
        undoAction={action}
        initialState={{
          success: "续费成功",
          successKey: "ok",
          result: {
            paymentId: "00000000-0000-4000-8000-000000000003",
            paidUntil: "2026-11-02T04:00:00.000Z",
          },
        }}
      />,
    );
    expect(screen.getByRole("link", { name: "回地图" })).toHaveAttribute(
      "href",
      "/",
    );
    expect(screen.getByRole("link", { name: "查看车位" })).toHaveAttribute(
      "href",
      "/slots/3",
    );
    expect(screen.getByRole("button", { name: "撤销" })).toBeInTheDocument();
  });
  it("失败通过统一错误弹框反馈", () => {
    render(
      <RenewForm
        form={hotel}
        action={action}
        undoAction={action}
        initialState={{ error: "已经不能撤销了", errorKey: "err" }}
      />,
    );
    expect(screen.getByRole("dialog")).toHaveTextContent("已经不能撤销了");
  });
});
