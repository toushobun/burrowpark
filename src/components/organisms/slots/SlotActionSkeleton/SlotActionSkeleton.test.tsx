import Box from "@mui/material/Box";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SlotActionSkeleton } from "./SlotActionSkeleton";

vi.mock("next/navigation", () => ({
  useParams: () => ({ code: "7" }),
}));

describe("SlotActionSkeleton", () => {
  it("操作加载时提供返回对应车位详情的链接", () => {
    render(
      <Box sx={{ width: 390 }}>
        <SlotActionSkeleton title="续费" rows={3} />
      </Box>,
    );
    expect(screen.getByRole("link", { name: "返回" })).toHaveAttribute(
      "href",
      "/slots/7",
    );
    expect(screen.getByRole("heading", { name: "续费" })).toBeInTheDocument();
  });
});
