import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SlotStatusBadge } from "./SlotStatusBadge";

describe("SlotStatusBadge", () => {
  it("未传 label 时显示状态默认文案", () => {
    render(<SlotStatusBadge status="overdue" />);

    expect(screen.getByText("已过期")).toBeInTheDocument();
  });

  it("传入 label 时优先显示自定义文案", () => {
    render(<SlotStatusBadge label="剩 6 分钟" status="privateBorrowed" />);

    expect(screen.getByText("剩 6 分钟")).toBeInTheDocument();
    expect(screen.queryByText("私人位借用中")).not.toBeInTheDocument();
  });

  it("预留状态使用虚线边框", () => {
    render(<SlotStatusBadge status="reserved" />);

    expect(screen.getByText("预留")).toHaveStyle({ borderStyle: "dashed" });
  });
});
