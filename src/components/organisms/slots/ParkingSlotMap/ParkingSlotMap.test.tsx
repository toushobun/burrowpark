import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { emptySlotMapSlots } from "./ParkingSlotMap.fixtures";
import { ParkingSlotMap } from "./ParkingSlotMap";

const slots = emptySlotMapSlots;

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

  it("放大后可以在地图框内滑动，所有车位始终可点击", () => {
    render(<ParkingSlotMap slots={slots} />);
    const map = screen.getByRole("group", { name: "车位地图" });
    const viewport = screen.getByTestId("slot-map-viewport");

    expect(map).toHaveAttribute("viewBox", "0 0 1300 1420");
    expect(map).toHaveStyle({ width: "100%" });
    expect(screen.getAllByRole("button")).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: "放大查看" }));
    expect(map).toHaveAttribute("viewBox", "0 0 1300 1420");
    expect(map).toHaveStyle({ width: "250%" });
    expect(viewport).toHaveStyle({ overflow: "auto" });
    expect(screen.getByRole("region", { name: "车位地图" })).toHaveAttribute(
      "tabindex",
      "0",
    );
    expect(screen.getAllByRole("button")).toHaveLength(1);
    expect(screen.getAllByRole("link")).toHaveLength(29);
    expect(screen.getByRole("link", { name: "2号，空" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "9号，空" })).toBeInTheDocument();

    // 390px 页面，两侧各 16px 留白，地图框左右边框各 1px。
    const mapInnerWidth = 390 - 16 * 2 - 2;
    expect((mapInnerWidth * 2.5 * 90) / 1300).toBeGreaterThanOrEqual(56);

    fireEvent.click(screen.getByRole("button", { name: "返回全图" }));
    expect(map).toHaveStyle({ width: "100%" });
    expect(viewport).toHaveStyle({ overflow: "hidden" });
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
