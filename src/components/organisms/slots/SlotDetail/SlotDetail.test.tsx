import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { SlotDetail as SlotDetailData } from "internal/parking";

import { SlotDetail } from "./SlotDetail";
import {
  detailDisplay,
  emptyDetail,
  hotelExpiringDetail,
  hourlyDetail,
  leaseAwayDetail,
  privateBorrowedDetail,
} from "./SlotDetail.fixtures";

function renderDetail(detail: SlotDetailData | null) {
  return render(
    <SlotDetail detail={detail} display={detail ? detailDisplay : null} />,
  );
}

function expectActions(expected: string[]) {
  const actionNames = [
    "登记进场",
    "续费",
    "续租",
    "离场",
    "再借 10 分钟",
    "取消预留",
  ];
  for (const name of actionNames) {
    const role =
      name === "再借 10 分钟" || name === "取消预留" ? "button" : "link";
    if (expected.includes(name)) {
      expect(screen.getByRole(role, { name })).toBeInTheDocument();
    } else {
      expect(screen.queryByRole(role, { name })).not.toBeInTheDocument();
    }
  }
}

describe("SlotDetail", () => {
  it("车位不存在时显示提示及大号回首页按钮", () => {
    renderDetail(null);
    expect(screen.getByText("没有这个车位")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "回首页" })).toHaveAttribute(
      "href",
      "/",
    );
    expect(screen.queryByRole("link", { name: "登记进场" })).toBeNull();
  });

  it("空车位仅出现登记进场按钮且不显示空信息卡片", () => {
    const { container } = renderDetail(emptyDetail);
    expect(container.querySelector(".MuiPaper-root")).toBeNull();
    expect(screen.getByText("7号")).toBeInTheDocument();
    expect(screen.getByText("空")).toBeInTheDocument();
    expectActions(["登记进场"]);
    expect(screen.getByRole("link", { name: "回地图" })).toHaveAttribute(
      "href",
      "/",
    );
  });

  it("私人位空闲时也只显示登记进场按钮", () => {
    renderDetail({ ...emptyDetail, kind: "private", status: "privateIdle" });
    expectActions(["登记进场"]);
  });

  it("酒店客快到期展示车牌、交到时间和续费离场", () => {
    renderDetail({
      ...hotelExpiringDetail,
      presentVehicle: {
        ...hotelExpiringDetail.presentVehicle!,
        photoUrl: "https://example.com/photo",
      },
    });
    expect(screen.getByText("粤B·12345")).toBeInTheDocument();
    expect(screen.getByText("酒店客")).toBeInTheDocument();
    expect(screen.getByText("11月19日 12:00")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "进场照片" })).toHaveAttribute(
      "src",
      "https://example.com/photo",
    );
    expectActions(["续费", "离场"]);
    expect(screen.getByRole("link", { name: "离场" })).toHaveAttribute(
      "href",
      "/slots/7/check-out",
    );
  });

  it("临停和免费有车时只显示离场与已停时间", () => {
    const billingTypes = ["hourly", "free"] as const;
    for (const billingType of billingTypes) {
      const { unmount } = renderDetail({
        ...hourlyDetail,
        presentVehicle: { ...hourlyDetail.presentVehicle!, billingType },
      });
      expect(screen.getByText("已停 2 小时 15 分")).toBeInTheDocument();
      expect(
        screen.getByText(billingType === "hourly" ? "临停" : "免费（装卸）"),
      ).toBeInTheDocument();
      expectActions(["离场"]);
      unmount();
    }
  });

  it("长租车不在时显示租户、日期、电话和登记进场", () => {
    renderDetail(leaseAwayDetail);
    expect(screen.getByText("王先生")).toBeInTheDocument();
    expect(screen.getByText("11月30日")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "打电话 13800000000" }),
    ).toHaveAttribute("href", "tel:13800000000");
    expectActions(["登记进场", "续租"]);
    expect(screen.getByRole("link", { name: "续租" })).toHaveAttribute(
      "href",
      "/slots/7/renew",
    );
  });

  it("没有电话时不出现打电话按钮", () => {
    renderDetail({
      ...leaseAwayDetail,
      lease: { ...leaseAwayDetail.lease!, phone: null },
    });
    expect(
      screen.queryByRole("link", { name: /打电话/ }),
    ).not.toBeInTheDocument();
  });

  it("空白电话号码不生成无效的拨号链接", () => {
    renderDetail({
      ...leaseAwayDetail,
      lease: { ...leaseAwayDetail.lease!, phone: "   " },
    });
    expect(
      screen.queryByRole("link", { name: /打电话/ }),
    ).not.toBeInTheDocument();
  });

  it("缴费和借用时间与标签在同一行，便于手机阅读", () => {
    const { unmount } = renderDetail(hotelExpiringDetail);
    expect(screen.getByText("交到").parentElement).toHaveTextContent(
      "交到11月19日 12:00",
    );
    unmount();

    renderDetail(privateBorrowedDetail);
    expect(screen.getByText("借到").parentElement).toHaveTextContent(
      "借到12:30",
    );
  });

  it("预留车位展示有值字段并允许登记进场", () => {
    renderDetail({
      ...emptyDetail,
      status: "reserved",
      reservation: {
        id: "00000000-0000-4000-8000-000000000007",
        guestName: "张女士",
        note: "夜间到达",
      },
    });
    expect(screen.getByText("张女士")).toBeInTheDocument();
    expect(screen.getByText("夜间到达")).toBeInTheDocument();
    expectActions(["登记进场", "取消预留"]);
  });

  it("私人位借用中显示借到时间以及再借一会儿和离场", () => {
    renderDetail(privateBorrowedDetail);
    expect(screen.getByText("12:30")).toBeInTheDocument();
    expectActions(["再借 10 分钟", "离场"]);
  });

  it("私人位借用逾期后仍保留再借一会儿和离场按钮", () => {
    renderDetail({ ...privateBorrowedDetail, status: "overdue" });
    expect(screen.getByText("已过期")).toBeInTheDocument();
    expectActions(["再借 10 分钟", "离场"]);
  });

  it("普通酒店客逾期时不出现私人位借用按钮", () => {
    renderDetail({ ...hotelExpiringDetail, status: "overdue" });
    expectActions(["续费", "离场"]);
  });

  it("预留内容为空且同位有长租时仍显示长租信息", () => {
    const { container } = renderDetail({
      ...leaseAwayDetail,
      status: "reserved",
      reservation: { guestName: null, note: null },
    });
    expect(container.querySelector(".MuiPaper-root")).not.toBeNull();
    expectActions(["登记进场", "续租"]);
  });

  it("长租车在场与已过期状态显示续租和离场", () => {
    renderDetail({
      ...hotelExpiringDetail,
      status: "overdue",
      presentVehicle: {
        ...hotelExpiringDetail.presentVehicle!,
        billingType: "lease",
      },
    });
    expectActions(["续租", "离场"]);
  });

  it("停用车位显示停用且没有操作按钮", () => {
    renderDetail({ ...emptyDetail, isActive: false });
    expect(screen.getByText("停用")).toBeInTheDocument();
    expect(screen.getByText("停用")).not.toHaveStyle({
      backgroundColor: "#E6F4E4",
    });
    expectActions([]);
  });

  it("登记进场跳转独立画面而不是弹占位提示", () => {
    renderDetail(emptyDetail);
    expect(screen.getByRole("link", { name: "登记进场" })).toHaveAttribute(
      "href",
      "/slots/7/check-in",
    );
    expect(screen.queryByText("功能开发中")).toBeNull();
  });

  it("私人位再借10分钟和再借30分钟分别位于主操作和更多操作", () => {
    renderDetail(privateBorrowedDetail);
    expect(
      screen.getByRole("button", { name: "再借 10 分钟" }),
    ).toHaveAttribute("type", "submit");
    expect(
      screen.getByRole("button", { name: "再借 30 分钟" }),
    ).toHaveAttribute("type", "submit");
    expect(screen.getByText("更多操作")).toBeInTheDocument();
  });

  it("空位展示预留和设为长租的文字操作", () => {
    renderDetail(emptyDetail);
    expect(screen.getByRole("button", { name: "预留" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "设为长租" })).toHaveAttribute(
      "href",
      "/slots/7/lease/new",
    );
  });
});

describe("SlotDetail 预留、退租和成功结果", () => {
  it("预留按钮展开可填写的简短表单", () => {
    renderDetail(emptyDetail);
    fireEvent.click(screen.getByRole("button", { name: "预留" }));
    expect(screen.getByRole("textbox", { name: "预留人" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "确认预留" }),
    ).toBeInTheDocument();
  });

  it("长租车不在时退租需要 Dialog 二次确认", () => {
    renderDetail(leaseAwayDetail);
    fireEvent.click(screen.getByRole("button", { name: "退租" }));
    expect(screen.getByText("确定让 王先生 退租吗？")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "确定退租" }),
    ).toBeInTheDocument();
  });

  it("取消预留必须先经过 Dialog", () => {
    renderDetail({
      ...emptyDetail,
      status: "reserved",
      reservation: {
        id: "00000000-0000-4000-8000-000000000007",
        guestName: "张女士",
        note: null,
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "取消预留" }));
    expect(screen.getByText("确定取消预留吗？")).toBeInTheDocument();
  });

  it("预留成功结果常驻展示地图、查看车位和撤销", () => {
    render(
      <SlotDetail
        detail={emptyDetail}
        display={detailDisplay}
        initialState={{
          reserve: {
            success: "预留成功",
            result: {
              id: "00000000-0000-4000-8000-000000000007",
            },
          },
        }}
      />,
    );
    expect(screen.getByText("预留成功")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "回地图" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "查看车位" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "撤销" })).toBeInTheDocument();
  });

  it("私人借用显示剩余和已超时分钟数", () => {
    const { unmount } = render(
      <SlotDetail
        detail={privateBorrowedDetail}
        display={detailDisplay}
        now="2026-11-19T04:00:00.000Z"
      />,
    );
    expect(screen.getByText("还剩 30 分钟")).toBeInTheDocument();
    unmount();
    render(
      <SlotDetail
        detail={privateBorrowedDetail}
        display={detailDisplay}
        now="2026-11-19T04:32:00.000Z"
      />,
    );
    expect(screen.getByText("已超时 2 分钟")).toBeInTheDocument();
  });
});
