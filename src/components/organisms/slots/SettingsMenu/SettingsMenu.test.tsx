import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SettingsMenu } from "./SettingsMenu";

describe("SettingsMenu", () => {
  it("只有低调的车位设置入口", () => {
    render(<SettingsMenu />);
    expect(screen.getByRole("link", { name: "车位设置" })).toHaveAttribute(
      "href",
      "/settings/slots",
    );
    expect(screen.queryByText("收费设置")).toBeNull();
  });
});
