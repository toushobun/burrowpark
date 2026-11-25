import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { SlotSettingsRow } from "internal/parking";
import { SlotSettingsList } from "./SlotSettingsList";

const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
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
const allRows: SlotSettingsRow[] = Array.from({ length: 29 }, (_, index) => ({
  code: String(index + 1),
  name: String(index + 1) + "号",
  kind: "regular",
  isActive: true,
  blockedReason: null,
}));

function confirmChange(label: string) {
  const trigger = screen.getByLabelText<HTMLInputElement>(label);
  const focus = vi.spyOn(trigger, "focus");
  fireEvent.click(trigger);
  fireEvent.click(screen.getByRole("button", { name: "确定" }));
  return { trigger, focus };
}

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
    render(<SlotSettingsList rows={allRows} action={action} />);
    expect(screen.getAllByText("私人位")).toHaveLength(29);
    expect(screen.getAllByText("启用")).toHaveLength(29);
  });

  it("首次及连续保存后不重复刷新并无滚动地恢复原开关焦点", async () => {
    refresh.mockClear();
    const save = vi.fn(async () => ({ success: "车位设置已更新" }));
    const { rerender } = render(
      <SlotSettingsList rows={allRows} action={save} />,
    );

    const first = confirmChange("26号 私人位");
    await waitFor(() =>
      expect(first.focus).toHaveBeenCalledWith({ preventScroll: true }),
    );
    rerender(
      <SlotSettingsList
        rows={allRows.map((row) =>
          row.code === "26" ? { ...row, kind: "private" } : row,
        )}
        action={save}
      />,
    );
    expect(screen.getByLabelText("26号 私人位")).toBe(first.trigger);
    expect(first.trigger).toBeChecked();

    const second = confirmChange("27号 启用");
    await waitFor(() =>
      expect(second.focus).toHaveBeenCalledWith({ preventScroll: true }),
    );
    expect(screen.getByLabelText("27号 启用")).toBe(second.trigger);
    expect(save).toHaveBeenCalledTimes(2);
    expect(refresh).not.toHaveBeenCalled();
  });

  it("保存失败时保留车位开关和确认操作且不刷新页面", async () => {
    refresh.mockClear();
    const save = vi.fn(async () => ({
      error: "保存失败",
      errorKey: "failure",
    }));
    render(<SlotSettingsList rows={allRows} action={save} />);

    const { trigger, focus } = confirmChange("27号 启用");
    expect(await screen.findByText("保存失败")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "知道了" }));
    fireEvent.click(await screen.findByRole("button", { name: "取消" }));
    await waitFor(() =>
      expect(focus).toHaveBeenCalledWith({ preventScroll: true }),
    );
    expect(screen.getByLabelText("27号 启用")).toBe(trigger);
    expect(trigger).toBeChecked();
    expect(refresh).not.toHaveBeenCalled();
  });
});
