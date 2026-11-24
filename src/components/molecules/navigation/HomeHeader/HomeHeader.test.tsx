import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { HomeHeader } from "./HomeHeader";

describe("HomeHeader", () => {
  it("有事项时显示铃铛红点，清空后隐藏红点", () => {
    const { rerender } = render(<HomeHeader hasReminders />);
    expect(screen.getByRole("heading", { name: "BurrowPark" })).toBeVisible();
    const link = screen.getByRole("link", { name: "事项" });
    expect(link).toHaveAttribute("href", "/reminders");
    expect(link.querySelector(".MuiBadge-badge")).not.toHaveClass(
      "MuiBadge-invisible",
    );

    rerender(<HomeHeader hasReminders={false} />);
    expect(link.querySelector(".MuiBadge-badge")).toHaveClass(
      "MuiBadge-invisible",
    );
  });
});
