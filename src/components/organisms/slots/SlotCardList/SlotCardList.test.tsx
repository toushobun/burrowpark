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
      screen.getByRole("link", { name: "25号，有车，辽AD98765" }),
    ).toHaveTextContent("辽AD98765");
  });
});
