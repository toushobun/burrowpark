import Box from "@mui/material/Box";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PageSkeleton } from "./PageSkeleton";

describe("PageSkeleton", () => {
  it("按指定列数渲染选择按钮的骨架", () => {
    render(<PageSkeleton title="登记进场" rowColumns={[3, 4, 1]} />);
    const skeletons = screen.getByRole("main").querySelectorAll(".MuiSkeleton-root");
    expect(skeletons).toHaveLength(9);
    expect(skeletons[1].parentElement).toBe(skeletons[3].parentElement);
    expect(skeletons[4].parentElement).toBe(skeletons[7].parentElement);
  });

  it("390px 页面保持可见标题、返回入口和指定数量的骨架行", () => {
    render(
      <Box sx={{ width: 390 }}>
        <PageSkeleton title="收费设置" backHref="/settings" rows={3} />
      </Box>,
    );
    expect(
      screen.getByRole("heading", { level: 1, name: "收费设置" }),
    ).toBeInTheDocument();
    const backLink = screen.getByRole("link", { name: "返回" });
    expect(backLink).toHaveAttribute("href", "/settings");
    expect(screen.getByRole("contentinfo")).toContainElement(backLink);
    expect(screen.getByRole("banner")).not.toContainElement(backLink);
    expect(
      screen.getByRole("main").querySelectorAll(".MuiSkeleton-root"),
    ).toHaveLength(4);
  });
});
