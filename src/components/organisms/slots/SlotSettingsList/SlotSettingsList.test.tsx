import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { SlotSettingsRow } from "internal/parking";
import { SlotSettingsList } from "./SlotSettingsList";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

const rows: SlotSettingsRow[] = [
  {
    code: "7",
    name: "7号",
    kind: "regular",
    isActive: true,
    blockedReason: null,
  },
  {
    code: "8",
    name: "8号",
    kind: "regular",
    isActive: true,
    blockedReason: "occupied",
  },
  {
    code: "9",
    name: "9号",
    kind: "private",
    isActive: false,
    blockedReason: null,
  },
];
const action = vi.fn(async () => ({}));

describe("SlotSettingsList", () => {
  it("显示车位类型和启用的开关及被占用的禁用原因", () => {
    render(<SlotSettingsList rows={rows} action={action} />);
    expect(screen.getByText("7号")).toBeInTheDocument();
    expect(screen.getByText("8号")).toBeInTheDocument();
    expect(screen.getByText("9号")).toBeInTheDocument();
    expect(screen.getByText("有车在场")).toBeInTheDocument();
    expect(screen.getByLabelText("8号 私人位")).toBeDisabled();
    expect(screen.getByLabelText("8号 启用")).toBeDisabled();
    expect(screen.getByLabelText("9号 私人位")).toBeChecked();
    expect(screen.getByLabelText("9号 启用")).not.toBeChecked();
  });

  it("切换普通位为私人位前弹出确认对话框", () => {
    render(<SlotSettingsList rows={rows} action={action} />);
    fireEvent.click(screen.getByLabelText("7号 私人位"));
    expect(screen.getByText("确定把 7号 设为私人位吗？")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "确定" })).toBeInTheDocument();
  });

  it("停用车位前弹出确认对话框，取消不提交", () => {
    render(<SlotSettingsList rows={rows} action={action} />);
    fireEvent.click(screen.getByLabelText("7号 启用"));
    expect(screen.getByText("确定停用 7号 吗？")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "取消" }));
    expect(screen.queryByText("确定停用 7号 吗？")).toBeNull();
    expect(action).not.toHaveBeenCalled();
  });

  it("显示29个车位时保持全部独立开关", () => {
    render(
      <SlotSettingsList
        rows={Array.from({ length: 29 }, (_, index) => ({
          code: String(index + 1),
          name: String(index + 1) + "号",
          kind: "regular" as const,
          isActive: true,
          blockedReason: null,
        }))}
        action={action}
      />,
    );
    expect(screen.getAllByText("私人位")).toHaveLength(29);
    expect(screen.getAllByText("启用")).toHaveLength(29);
  });
});
