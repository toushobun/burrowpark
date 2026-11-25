import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { slotLayouts } from "config/slotLayout";
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
      "0 0 1470 1260",
    );
    const link = screen.getByRole("link", { name: "7号，空" });
    expect(link).toHaveAttribute("href", "/slots/7");
    expect(link.querySelector("rect")).toHaveAttribute("x", "1188");
    expect(screen.getAllByRole("link")).toHaveLength(14);
  });

  it("切换里院后只显示 15～29 号，支持按键和点击返回", () => {
    render(<ParkingSlotMap slots={slots} />);
    const viewport = screen.getByTestId("slot-map-viewport");
    const link = screen.getByRole("link", { name: "7号，空" });
    link.focus();
    expect(link).toHaveFocus();
    fireEvent.keyDown(link, { key: "ArrowRight" });
    expect(viewport).toHaveFocus();
    expect(screen.getAllByRole("link")).toHaveLength(15);
    expect(screen.getByRole("link", { name: "29号，空" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "7号，空" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "切换至外院" }));
    expect(screen.getAllByRole("link")).toHaveLength(14);
  });

  it("分段按钮、箭头与地图位移保持同步，边界不可循环", () => {
    render(<ParkingSlotMap slots={slots} />);
    const inner = screen.getByRole("button", { name: "里院" });
    const outer = screen.getByRole("button", { name: "外院" });
    const left = screen.getByRole("button", { name: "切换至外院" });
    const right = screen.getByRole("button", { name: "切换至里院" });
    const track = screen.getByTestId("slot-map-track");
    const indicator = screen.getByTestId("yard-selection-indicator");
    const navigation = screen.getByRole("group", { name: "院区切换" });
    expect(within(navigation).getAllByRole("button")).toEqual([outer, inner]);
    expect(outer).toHaveAttribute("aria-pressed", "true");
    expect(left).toBeDisabled();
    expect(right).toBeEnabled();
    expect(track).toHaveStyle({ transform: "translateX(0%)" });
    expect(indicator).toHaveStyle({ transform: "translateX(0%)" });

    fireEvent.click(inner);
    expect(inner).toHaveAttribute("aria-pressed", "true");
    expect(outer).toHaveAttribute("aria-pressed", "false");
    expect(right).toBeDisabled();
    expect(left).toBeEnabled();
    expect(track).toHaveStyle({ transform: "translateX(-100%)" });
    expect(indicator).toHaveStyle({ transform: "translateX(100%)" });
    expect(track.children[0]).toHaveAttribute("inert");
    expect(track.children[1]).not.toHaveAttribute("inert");
    expect(screen.getAllByRole("link")).toHaveLength(15);

    fireEvent.click(left);
    expect(outer).toHaveAttribute("aria-pressed", "true");
    expect(track).toHaveStyle({ transform: "translateX(0%)" });
    expect(indicator).toHaveStyle({ transform: "translateX(0%)" });
    fireEvent.click(right);
    expect(inner).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(outer);
    expect(screen.getAllByRole("link")).toHaveLength(14);
    expect(track.children[0]).not.toHaveAttribute("inert");
    expect(track.children[1]).toHaveAttribute("inert");
  });

  it("图例按固定顺序显示八种状态并保留实线和虚线色块", () => {
    render(<ParkingSlotMap slots={slots} />);
    const legend = within(screen.getByRole("group", { name: "状态图例" }));
    expect(
      legend.getAllByRole("listitem").map((item) => item.textContent),
    ).toEqual([
      "空",
      "有车",
      "快到期",
      "已过期",
      "预留",
      "外出",
      "私位",
      "借用",
    ]);
    expect(legend.queryByRole("button")).toBeNull();
    expect(legend.getByTestId("legend-swatch-empty")).toHaveStyle({
      borderStyle: "solid",
    });
    for (const status of ["reserved", "leaseAway"]) {
      expect(legend.getByTestId(`legend-swatch-${status}`)).toHaveStyle({
        borderStyle: "dashed",
      });
    }
  });

  it("左右滑动切换，纵向滚动不切换，滑动不误触发车位导航", () => {
    render(<ParkingSlotMap slots={slots} />);
    push.mockClear();
    const viewport = screen.getByTestId("slot-map-viewport");
    const link = screen.getByRole("link", { name: "7号，空" });
    fireEvent.touchStart(link, { touches: [{ clientX: 250, clientY: 100 }] });
    fireEvent.touchEnd(link, {
      touches: [],
      changedTouches: [{ clientX: 100, clientY: 105 }],
    });
    expect(screen.getAllByRole("link")).toHaveLength(15);
    expect(screen.getByTestId("yard-selection-indicator")).toHaveStyle({
      transform: "translateX(100%)",
    });
    const innerLink = screen.getByRole("link", { name: "25号，空" });
    fireEvent.click(innerLink, { detail: 1 });
    expect(push).not.toHaveBeenCalled();
    fireEvent.touchStart(viewport, {
      touches: [{ clientX: 100, clientY: 100 }],
    });
    fireEvent.touchEnd(viewport, {
      touches: [],
      changedTouches: [{ clientX: 110, clientY: 250 }],
    });
    expect(screen.getAllByRole("link")).toHaveLength(15);
    fireEvent.touchStart(viewport, {
      touches: [{ clientX: 100, clientY: 100 }],
    });
    fireEvent.touchEnd(viewport, {
      touches: [],
      changedTouches: [{ clientX: 250, clientY: 105 }],
    });
    expect(screen.getAllByRole("link")).toHaveLength(14);
  });

  it("双指缩放及取消的触摸不切换院区", () => {
    render(<ParkingSlotMap slots={slots} />);
    const viewport = screen.getByTestId("slot-map-viewport");
    const first = { clientX: 150, clientY: 100 };
    const second = { clientX: 250, clientY: 100 };
    fireEvent.touchStart(viewport, { touches: [first] });
    fireEvent.touchStart(viewport, { touches: [first, second] });
    fireEvent.touchEnd(viewport, {
      touches: [],
      changedTouches: [second],
    });
    expect(screen.getAllByRole("link")).toHaveLength(14);

    fireEvent.touchStart(viewport, { touches: [first] });
    fireEvent.touchCancel(viewport);
    fireEvent.touchEnd(viewport, {
      touches: [],
      changedTouches: [second],
    });
    expect(screen.getAllByRole("link")).toHaveLength(14);
  });

  it("里院操作反馈自动切换并高亮，撤销后保持所选院", () => {
    const { rerender } = render(<ParkingSlotMap slots={slots} />);
    rerender(<ParkingSlotMap slots={slots} highlightCode="29" />);
    const link = screen.getByRole("link", { name: "29号，空" });
    expect(screen.getByRole("button", { name: "里院" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByTestId("yard-selection-indicator")).toHaveStyle({
      transform: "translateX(100%)",
    });
    expect(link.querySelector("rect")).toHaveAttribute(
      "stroke",
      theme.palette.error.main,
    );
    rerender(<ParkingSlotMap slots={slots} />);
    expect(screen.getByRole("link", { name: "29号，空" })).toBeInTheDocument();
    expect(link.querySelector("rect")).not.toHaveAttribute(
      "stroke",
      theme.palette.error.main,
    );
  });

  it("地图默认适配整个可用宽度且没有放大按钮", () => {
    render(<ParkingSlotMap slots={slots} />);
    const map = screen.getByRole("group", { name: "车位地图" });
    const viewport = screen.getByTestId("slot-map-viewport");
    expect(map).toHaveAttribute("viewBox", "0 0 1470 1260");
    expect(map).toHaveStyle({ width: "100%" });
    expect(viewport).toHaveStyle({ width: "100%" });
    const viewportStyle = window.getComputedStyle(viewport);
    expect(viewportStyle.borderRadius).toMatch(/^(?:0(?:px)?)?$/);
    // 未绘制边框时，jsdom 仍可能返回默认宽度 medium。
    expect(viewportStyle.borderTopStyle).toMatch(/^(?:none)?$/);
    expect(screen.queryByRole("button", { name: "放大查看" })).toBeNull();
    expect(screen.getAllByRole("link")).toHaveLength(14);
  });

  it("外墙最后绘制，贴墙车位不覆盖墙线且墙线粗细一致", () => {
    render(<ParkingSlotMap slots={slots} />);
    const map = screen.getByRole("group", { name: "车位地图" });
    const walls = screen.getByTestId("slot-map-walls");
    expect(map.lastElementChild).toBe(walls);
    expect(walls).toHaveAttribute("pointer-events", "none");
    const lines = walls.querySelectorAll("polyline");
    expect(lines).toHaveLength(slotLayouts.outer.walls.length);
    for (const line of lines) {
      expect(line).toHaveAttribute("stroke-width", "9");
    }
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
    const map = within(screen.getByRole("group", { name: "车位地图" }));
    expect(map.getByText("入口")).toBeInTheDocument();
    expect(map.getByText("楼梯")).toBeInTheDocument();
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

    expect(screen.getAllByRole("link")).toHaveLength(12);
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
