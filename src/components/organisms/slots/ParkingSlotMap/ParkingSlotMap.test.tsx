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
    expect(scre���q�^