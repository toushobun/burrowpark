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

  it("手机地图可放大至普通车位至少 56px，并通过方向按钮移动与返回总览", () => {
    render(<ParkingSlotMap slots={slots} />);

    fireEvent.click(screen.getByRole("button", { name: "放大查看" }));
    const map = screen.getByRole("group", { name: "车位地图" });
    const dimensions = map.getAttribute("viewBox")?.split(" ").map(Number);
    expect(dimensions?.slice(0, 2)).toEqual([0, 0]);
    expect(dimensions?.[2]).toBeCloseTo(1300 / 3);
    expect(dimensions?.[3]).toBeCloseTo(1420 / 3);

    // 390px 手机减去页面左右边距后，90 单位普通车位仍有约 74px 可点。
    expect((90 * (390 - 32)) / (1300 / 3)).toBeGreaterThanOrEqual(56);
    expect(screen.getByRole("button", { name: "向左" })).toBeDisabled();
    // 未完全显示的 2 号车位不可聚焦；移动到视野内后重新可点击。
    expect(
      screen.queryByRole("link", { name: "2号，空" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "9号，空" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "向右" }));
    expect(map.getAttribute("viewBox")?.split(" ")[0]).toBe("260");
    expect(screen.getByRole("link", { name: "2号，空" })).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "9号，空" }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "返回全图" }));
    expect(map).toHaveAttribute("viewBox", "0 0 1300 1420");
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
