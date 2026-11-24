import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { HomeNavigation } from "./HomeNavigation";

describe("HomeNavigation", () => {
  afterEach(() => {
    window.history.replaceState(null, "", "/");
  });

  it("首页可定位车位列表，事项和我的入口正确", () => {
    render(<HomeNavigation />);
    expect(screen.getByRole("link", { name: "首页" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "车位" })).toHaveAttribute(
      "href",
      "#slot-list",
    );
    expect(screen.getByRole("link", { name: "事项" })).toHaveAttribute(
      "href",
      "/reminders",
    );
    expect(screen.getByRole("link", { name: "我的" })).toHaveAttribute(
      "href",
      "/settings",
    );
    act(() => {
      window.history.replaceState(null, "", "/#slot-list");
      window.dispatchEvent(new Event("hashchange"));
    });
    expect(screen.getByRole("link", { name: "车位" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("事项页面高亮当前入口，车位入口返回首页列表", () => {
    render(<HomeNavigation active="reminders" />);
    expect(screen.getByRole("link", { name: "事项" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "车位" })).toHaveAttribute(
      "href",
      "/#slot-list",
    );
  });
});
