import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ChoiceButtonGroup } from "./ChoiceButtonGroup";

describe("ChoiceButtonGroup", () => {
  const options = [
    { value: 1, label: "1 天" },
    { value: 2, label: "2 天" },
  ];

  it("显示当前选项并返回点击的值", () => {
    const onChange = vi.fn();
    render(
      <ChoiceButtonGroup options={options} value={1} onChange={onChange} />,
    );
    expect(screen.getByRole("button", { name: "1 天" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    const second = screen.getByRole("button", { name: "2 天" });
    expect(second).toHaveAttribute("type", "button");
    expect(second).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(second);
    expect(onChange).toHaveBeenCalledWith(2);
  });

  it("禁用时不能切换选项", () => {
    const onChange = vi.fn();
    render(
      <ChoiceButtonGroup
        options={options}
        value={1}
        onChange={onChange}
        disabled
      />,
    );
    const button = screen.getByRole("button", { name: "2 天" });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(onChange).not.toHaveBeenCalled();
  });
});
