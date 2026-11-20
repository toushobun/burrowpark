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
 