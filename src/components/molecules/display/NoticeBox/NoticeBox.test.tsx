import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { NoticeBox } from "./NoticeBox";

describe("NoticeBox", () => {
  it("展示交到时间和建议金额", () => {
    render(<NoticeBox title="交到 11月26日 12:00">建议金额：30.00 元</NoticeBox>);
    expect(screen.getByText("交到 11月26日 12:00")).toBeInTheDocument();
    expect(screen.getByText("建议金额：30.00 元")).toBeInTheDocument();
  });

  it("没有有效时间时仍显示金额", () => {
    render(<NoticeBox>建议金额：0.00 元</NoticeBox>);
    expect(screen.getByText("建议金额：0.00 元")).toBeInTheDocument();
  });
});
