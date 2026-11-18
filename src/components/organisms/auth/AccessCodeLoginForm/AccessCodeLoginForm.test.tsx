import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AccessCodeLoginForm } from "./AccessCodeLoginForm";

describe("AccessCodeLoginForm", () => {
  it("只有一个主操作按钮，输入框允许显示数字明文", () => {
    const action = vi.fn().mockResolvedValue({});
    render(<AccessCodeLoginForm action={action} />);
    const input = screen.getByRole("textbox", { name: "访问码" });
    expect(input).toHaveAttribute("inputmode", "numeric");
    expect(input).toHaveAttribute("autocomplete", "off");
    expect(input).toHaveAttribute("type", "text");

    fireEvent.change(input, { target: { value: "123456" } });
    expect(input).toHaveValue("123456");
    expect(screen.getByRole("button", { name: "进入" })).toBeEnabled();
  });
});
