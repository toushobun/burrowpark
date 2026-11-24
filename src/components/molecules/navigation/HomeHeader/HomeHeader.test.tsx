import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { HomeHeader } from "./HomeHeader";

describe("HomeHeader", () => {
  it("有事项时显示铃铛红点，清空后隐藏红点", () => {
    const { rerender } = render(<HomeHeader hasReminders />);
    const heading = screen.getByRole("heading", {
      level: 1,
      name: "BurrowPark · 途泊属 · 家庭停车场管理",
    });
    expect(heading).toBeVisible();
    expect(screen.getByRole("img")).toHaveAttribute(
      "src",
      "/icons/brand-logo.png",
    );
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
