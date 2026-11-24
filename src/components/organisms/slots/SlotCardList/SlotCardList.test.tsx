import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { emptySlotMapSlots } from "../ParkingSlotMap/ParkingSlotMap.fixtures";
import { SlotCardList, SlotCardListSkeleton } from "./SlotCardList";

describe("SlotCardList", () => {
  it("外院和里院连续展示全部车位，各自按编号升序", () => {
    render(<SlotCardList slots={emptySlotMapSlots} />);
    const outer = screen.getByRole("region", { name: "外院" });
    const inner = screen.getByRole("region", { name: "里院" });
    const codes = (region: HTMLElement) =>
      within(region)
        .getAllByRole("link")
        .map((link) => link.getAttribute("href"));
    expect(codes(outer)).toEqual(
      Array.from({ length: 14 }, (_, i) => "/slots/" + (i + 1)),
    );
    expect(codes(inner)).toEqual(
      Array.from({ length: 15 }, (_, i) => "/slots/" + (i + 15)),
    );
    expect(screen.getAllByRole("link")).toHaveLength(29);
    expect(screen.queryByRole("button", { name: /切换/ })).toBeNull();
    expect(screen.queryByText(/过渡区/)).toBeNull();
  });

  it("加载骨架与两个区域的车位数量一致", () => {
    render(<SlotCardListSkeleton />);
    expect(
      screen
        .getByRole("region", { name: "外院" })
        .querySelectorAll(".MuiSkeleton-root"),
    ).toHaveLength(14);
    expect(
      screen
        .getByRole("region", { name: "里院" })
        .querySelectorAll(".MuiSkeleton-root"),
    ).toHaveLength(15);
  });

  it("操作高亮里院车位时仍保留外院，并显示真实车牌", () => {
    const slots = emptySlotMapSlots.map((slot) =>
      slot.code === "25"
        ? { ...slot, status: "occupied" as const, plate: "辽AD98765" }
        : slot,
    );
    const { rerender } = render(<SlotCardList slots={slots} />);
    rerender(<SlotCardList slots={slots} highlightCode="25" />);
    expect(
      screen.getByRole("link", { name: "25号，有车，辽A·D98765" }),
    ).toHaveTextContent("辽A·D98765");
    expect(screen.getByRole("link", { name: "1号，空" })).toBeInTheDocument();
  });
  it("停用车位不能点击，无车牌时仍显示真实状态", () => {
    const slots = emptySlotMapSlots.map((slot) => {
      if (slot.code === "1") return { ...slot, isActive: false };
      if (slot.code === "2") {
        return { ...slot, status: "occupied" as const, plate: null };
      }
      return slot;
    });
    render(<SlotCardList slots={slots} />);
    expect(screen.getByRole("button", { name: "1号，停用" })).toBeDisabled();
    expect(screen.getByRole("link", { name: "2号，有车" })).toHaveTextContent(
      "无车牌",
    );
  });
});
