import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { theme } from "theme/theme";

const push = vi.fn();
const prefetch = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, prefetch }) }));

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

  it("地图默认按 44px 最短边显示，允许横向滑动且没有放大按钮", () => {
    render(<ParkingSlotMap slots={slots} />);
    const map = screen.getByRole("group", { name: "车位地图" });
    const viewport = screen.getByTestId("slot-map-viewport");
    expect(map).toHaveAttribute("viewBox", "0 0 1300 1420");
    expect(map).toHaveStyle({ width: 1300 * (44 / 90) + "px" });
    expect(viewport).toHaveStyle({ overflowX: "auto", width: "100%" });
    const viewportStyle = window.getComputedStyle(viewport);
    expect(viewportStyle.borderRadius).toMatch(/^(?:0(?:px)?)?$/);
    expect(viewportStyle.borderTopWidth).toMatch(/^(?:0(?:px)?)?$/);
    expect(screen.queryByRole("button", { name: "放大查看" })).toBeNull();
    expect(screen.getAllByRole("link")).toHaveLength(29);
  });

  it("刚登记的车位红色粗描边并自动滚动到可见位置", () => {
    const scrollIntoView = vi.fn();
    Object.defineProperty(SVGElement.prototype, "scrollIntoView", {
      configurable: true,
      value: scrollIntoView,
    });
    render(<ParkingSlotMap slots={slots} highlightCode="12" />);
    const link = screen.getByRole("link", { name: "12号，空" });
    const rect = link.querySelector("rect");
    expect(rect).toHaveAttribute("stroke", theme.palette.error.main);
    expect(rect).toHaveAttribute("stroke-width", "12");
    expect(scrollIntoView).toHaveBeenCalledWith({
      block: "center",
      inline: "center",
    });
  });

  it("点车位用客户端导航，按下时预取并显示按压反馈", () => {
    render(<ParkingSlotMap slots={slots} />);
    const link = screen.getByRole("link", { name: "7号，空" });
    fireEvent.pointerDown(link);
    expect(prefetch).toHaveBeenCalledWith("/slots/7");
    expect(link.querySelector("g")).toHaveAttribute("opacity", "0.8");
    fireEvent.click(link);
    expect(push).toHaveBeenCalledWith("/slots/7");
    expect(link.querySelector("g")).toHaveAttribute("opacity", "1");
  });

  it("Ctrl 或 Cmd 点击保留浏览器原生新标签页操作", () => {
    render(<ParkingSlotMap slots={slots} />);
    const link = screen.getByRole("link", { name: "7号，空" });
    push.mockClear();

    fireEvent.click(link, { ctrlKey: true });
    fireEvent.click(link, { metaKey: true });

    expect(push).not.toHaveBeenCalled();
    expect(link).toHaveAttribute("href", "/slots/7");
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
    expect(link).toHaveTextContent("过期");
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

describe("车位设置更新后的地图", () => {
  it("将由设置页停用的车位显示为灰色且不可点击", () => {
    render(
      <ParkingSlotMap
        slots={slots.map((slot) =>
          slot.code === "7" ? { ...slot, isActive: false } : slot,
        )}
      />,
    );
    expect(screen.queryByRole("link", { name: /^7号，/ })).toBeNull();
    expect(screen.getByTestId("inactive-slot-7")).toHaveTextContent("停用");
  });
});
