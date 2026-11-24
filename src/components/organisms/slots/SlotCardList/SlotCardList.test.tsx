import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { emptySlotMapSlots } from "../ParkingSlotMap/ParkingSlotMap.fixtures";
import { SlotCardList } from "./SlotCardList";

describe("SlotCardList", () => {
  it("外院默认 14 个车位，切换后显示 15 个里院车位", () => {
    render(<SlotCardList slots={emptySlotMapSlots} />);
    expect(screen.getAllByRole("link")).toHaveLength(14);
    fireEvent.click(screen.getByRole("button", { name: "切换至里院" }));
    expect(screen.getAllByRole("link")).toHaveLength(15);
    expect(screen.getByRole("link", { name: "15号，空" })).toHaveAttribute(
      "href",
      "/slots/15",
    );
    expect(screen.queryByRole("link", { name: "1号，空" })).toBeNull();
  });

  it("操作高亮时自动切换里院，并显示真实车牌", () => {
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
