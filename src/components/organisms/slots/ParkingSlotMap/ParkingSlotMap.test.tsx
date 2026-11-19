import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { slotLayout } from "config/slotLayout";
import type { SlotMapSlot } from "internal/parking";

import { ParkingSlotMap } from "./ParkingSlotMap";

const slots: SlotMapSlot[] = slotLayout.slots.map((slot) => ({
  code: slot.code,
  name: slot.code + "号",
  isActive: true,
  status: "empty",
}));

describe("ParkingSlotMap", () => {
  it("按布局原始 viewBox 绘制，并将车位链接到对应详情页", () => {
    render(<ParkingSlotMap slots={slots} />);

    expect(screen.getByRole("group", { name: "车位地图" })).toHaveAttribute(
      "viewBox",
      "0 0 1300 1420",
    );
    const link = screen.getByRole("link", { name: "7号，空" });
    expect(link).toHaveAttribute("href", "/slots/7");
    expect(link.querySelector("rect")).toHaveAttribute("x", "840");
    expect(screen.getAllByRole("link")).toHaveLength(29);
  });

  it("状态同时显示颜色、文字与可访问名称", () => {
    render(
      <ParkingSlotMap
        slots={slots.map((slot) =>
          slot.code === "9" ? { ...slot, status: "overdue" } : slot,
        )}
      />,
    );

    const link = screen.getByRole("link", { name: "9号，已过期" });
    expect(link).toHaveTextContent("已过期");
    expect(link.querySelector("rect")).toHaveAttribute("fill", "#FBDAD6");
    expect(screen.getByText("入口")).toBeInTheDocument();
    expect(screen.getByText("状态图例")).toBeInTheDocument();
  });

  it("停用或没有配置的车位灰显且不能点击", () => {
    render(
      <ParkingSlotMap
        slots={slots
          .filter((slot) => slot.code !== "10")
          .map((slot) =>
            slot.code === "8" ? { ...slot, isActive: false } : slot,
          )}
      />,
    );

    expect(screen.getAllByRole("link")).toHaveLength(27);
    const disabledLink = screen.queryByRole("link", { name: /^8号，/ });
    const missingLink = screen.queryByRole("link", { name: /^10号，/ });
    expect(disabledLink).toBeNull();
    expect(missingLink).toBeNull();
    expect(screen.getByTestId("inactive-slot-8")).toHaveTextContent("停用");
    expect(screen.getByTestId("inactive-slot-10")).toHaveTextContent("未配置");
  });
});
