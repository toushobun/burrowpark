import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const navigation = vi.hoisted(() => ({ pathname: "/" }));
vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
}));

import { HomeNavigation } from "./HomeNavigation";

describe("HomeNavigation", () => {
  it("只保留车位、事项和我的，切换路径时保持同一底栏节点", () => {
    navigation.pathname = "/";
    const { rerender } = render(<HomeNavigation />);
    const nav = screen.getByRole("navigation");
    expect(screen.getAllByRole("link")).toHaveLength(3);
    expect(screen.queryByRole("link", { name: "首页" })).toBeNull();
    const slots = screen.getByRole("link", { name: "车位" });
    expect(slots).toHaveAttribute("href", "/");
    for (const [pathname, name] of [
      ["/", "车位"],
      ["/reminders", "事项"],
      ["/settings", "我的"],
    ]) {
      navigation.pathname = pathname;
      rerender(<HomeNavigation />);
      expect(screen.getByRole("navigation")).toBe(nav);
      const active = screen.getByRole("link", { name });
      expect(active).toHaveAttribute("href", pathname);
      expect(active).toHaveAttribute("aria-current", "page");
      expect(nav.querySelectorAll('[aria-current="page"]')).toHaveLength(1);
    }
  });
});
