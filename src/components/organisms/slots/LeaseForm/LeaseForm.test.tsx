import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  emptyDetail,
  leaseAwayDetail,
} from "../SlotDetail/SlotDetail.fixtures";
import { LeaseForm } from "./LeaseForm";

const action = vi.fn(async () => ({}));
const push = vi.fn();
const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, replace }) }));

describe("LeaseForm", () => {
  beforeEach(() => push.mockClear());
  it("新建长租必须填写租户和首笔预交才能提交", () => {
    render(
      <LeaseForm
        mode="create"
        detail={emptyDetail}
        today="2026-11-19"
        action={action}
      />,
    );
    expect(screen.getByRole("button", { name: "确认建立长租" })).toBeDisabled();
    fireEvent.change(screen.getByRole("textbox", { name: "租户名" }), {
      target: { value: "王先生" },
    });
    expect(screen.getByDisplayValue("2026-12-19")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "确认建立长租" })).toBeDisabled();
  });

  it("新建长租默认选中微信，填写收款金额即可提交", () => {
    render(
      <LeaseForm
        mode="create"
        detail={emptyDetail}
        today="2026-11-19"
        action={action}
      />,
    );
    expect(screen.getByRole("button", { name: "微信" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    fireEvent.change(screen.getByRole("textbox", { name: "租户名" }), {
      target: { value: "王先生" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "实收金额（元）" }), {
      target: { value: "100.00" },
    });
    expect(screen.getByRole("button", { name: "确认建立长租" })).toBeEnabled();
  });

  it("新建成功但车位已有长租时仍跳回地图而不显示不能办理", () => {
    const id = leaseAwayDetail.lease!.id!;
    render(
      <LeaseForm
        mode="create"
        detail={leaseAwayDetail}
        today="2026-11-19"
        action={action}
        initialState={{ success: "长租建立成功", result: { id } }}
      />,
    );
    expect(screen.queryByText("当前车位不能办理此操作")).toBeNull();
    expect(screen.getByText("正在返回地图…")).toBeInTheDocument();
    expect(push).toHaveBeenCalledWith("/?done=lease&slot=7&id=" + id);
  });

  it("编辑长租只显示资料字段，不允许修改首笔收款", () => {
    render(
      <LeaseForm
        mode="edit"
        detail={leaseAwayDetail}
        today="2026-11-19"
        action={action}
      />,
    );
    expect(screen.getByDisplayValue("王先生")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "保存长租资料" })).toBeEnabled();
    expect(screen.queryByText("首笔交到哪天")).not.toBeInTheDocument();
    expect(screen.queryByText("收款方式")).not.toBeInTheDocument();
  });

  it("编辑长租保存后自动返回地图，不显示结果页", () => {
    render(
      <LeaseForm
        mode="edit"
        detail={leaseAwayDetail}
        today="2026-11-19"
        action={action}
        initialState={{ success: "长租资料已保存" }}
      />,
    );
    expect(replace).toHaveBeenCalledWith("/");
    expect(screen.getByText("正在返回地图…")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "返回" })).toBeNull();
  });

  it("私人位无法建立长租", () => {
    render(
      <LeaseForm
        mode="create"
        detail={{ ...emptyDetail, kind: "private" }}
        today="2026-11-19"
        action={action}
      />,
    );
    expect(screen.getByText("当前车位不能办理此操作")).toBeInTheDocument();
  });
});
