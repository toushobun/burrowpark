import Box from "@mui/material/Box";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PageSkeleton } from "./PageSkeleton";

describe("PageSkeleton", () => {
  it("390px 页面保持可见标题、返回入口和指定数量的骨架行", () => {
    render(
      <Box sx={{ width: 390 }}>
        <PageSkeleton title="收费设置" backHref="/settings" rows={3} />
      </Box>,
    );
    expect(screen.getByRole("heading", { level: 1, name: "收费设置" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "返回" })).toHaveAttribute("href", "/settings");
    expect(screen.getByRole("main").querySelectorAll(".MuiSkeleton-root")).toHaveLength(4);
  });
});
