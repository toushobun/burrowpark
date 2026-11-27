import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { InfoCard } from "./InfoCard";

describe("InfoCard", () => {
  it("显示卡片内的内容与操作", () => {
    render(
      <InfoCard>
        <p>收款合计</p>
        <button type="button">改金额</button>
      </InfoCard>,
    );
    expect(screen.getByText("收款合计")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "改金额" })).toBeInTheDocument();
  });
});
