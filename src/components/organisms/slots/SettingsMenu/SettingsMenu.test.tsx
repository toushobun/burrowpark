import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SettingsMenu } from "./SettingsMenu";

describe("SettingsMenu", () => {
  it("设置页只有车位设置和月统计两个低调入口", () => {
    render(<SettingsMenu />);
    expect(screen.getByRole("link", { name: "车位设置" })).toHaveAttribute(
      "href",
      "/settings/slots",
    );
    expect(screen.getByRole("link", { name: "月统计" })).toHaveAttribute(
      "href",
      "/stats",
    );
    expect(screen.queryByText("收费设置")).toBeNull();
  });
});
