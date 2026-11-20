import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { emptyDetail, leaseAwayDetail } from "../SlotDetail/SlotDetail.fixtures";
import { LeaseForm } from "./LeaseForm";

const action = vi.fn(async () => ({}));
const undoAction = vi.fn(async () => ({}));

describe("LeaseForm", () => {
  it("新建长租必须填写租户和首笔预交才能提交", () => {
    render(<LeaseForm mode="create" detail={emptyDetail} today="2026-11-19"
      action={action} undoAction={undoAction} />);
    expect(screen.getByRole("button", { name: "确认建立长租" })).toBeDisabled();
    fireEvent.change(screen.getByRole("textbox", { name: "租户名" }), {
      target: { value: "王先生" },
    });
    expect(screen.getByDisplayValue("2026-12-19")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "确认建立长租" })).toBeDisabled();
  });

  it("编辑长租只显示资料字段，不允许修改首笔收款", () => {
    render(<LeaseForm mode="edit" detail={leaseAwayDetail} today="2026-11-19"
      action={action} undoAction={undoAction} />);
    expect(screen.getByDisplayValue("王先生")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "保存长租资料" })).toBeEnabled();
    expect(screen.queryByText("首笔交到哪天")).not.toBeInTheDocument();
    expect(screen.queryByText("收款方式")).not.toBeInTheDocument();
  });

  it("私人位无法建立长租", () => {
    render(<LeaseForm mode="create" detail={{ ...emptyDetail, kind: "private" }}
      today="2026-11-19" action={action} undoAction={undoAction} />);
    expect(screen.getByText("当前车位不能办理此操作")).toBeInTheDocument();
  });
});
