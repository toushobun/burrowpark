import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { OperationRedirecting } from "./OperationRedirecting";

describe("OperationRedirecting", () => {
  it("展示返回地图的处理中提示", () => {
    render(<OperationRedirecting />);
    expect(screen.getByText("正在返回地图…")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });
});
