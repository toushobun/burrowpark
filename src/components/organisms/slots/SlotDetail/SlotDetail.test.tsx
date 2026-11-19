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
  const actionNames = ["登记进场", "续费", "离场", "再借一会儿"];
  for (const name of actionNames) {
    if (expected.includes(name)) {
      expect(screen.getByRole("button", { name })).toBeInTheDocument();
    } else {
      expect(screen.queryByRole("button", { name })).not.toBeInTheDocument();
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
    expect(screen.queryByRole("button", { name: "登记进场" })).toBeNull();
  });

  it("空车位仅出现登记进场按钮", () => {
    renderDetail(emptyDetail);
    expect(screen.getByText("7号")).toBeInTheDocument();
    expect(screen.getByText("空")).toBeInTheDocument();
    expectActions(["登记进场"]);
    expect(screen.getByRole("link", { name: "回地图" })).toHaveAttribute(
      "href",
      "/",
    );
  });

  it("私人位空闲时也只显示登记进场按钮", () => {
    renderDetail({ ...emptyDetail, status: "privateIdle" });
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
    expect(screen.getByRole("link", { name: "打电话" })).toHaveAttribute(
      "href",
      "tel:13800000000",
    );
    expectActions(["登记进场"]);
  });

  it("没有电话时不出现打电话按钮", () => {
    renderDetail({
      ...leaseAwayDetail,
      lease: { ...leaseAwayDetail.lease!, phone: null },
    });
    expect(
      screen.queryByRole("link", { name: "打电话" }),
    ).not.toBeInTheDocument();
  });

  it("预留车位展示有值字段并允许登记进场", () => {
    renderDetail({
      ...emptyDetail,
      status: "reserved",
      reservation: { guestName: "张女士", note: "夜间到达" },
    });
    expect(screen.getByText("张女士")).toBeInTheDocument();
    expect(screen.getByText("夜间到达")).toBeInTheDocument();
    expectActions(["登记进场"]);
  });

  it("私人位借用中显示借到时间以及再借一会儿和离场", () => {
    renderDetail(privateBorrowedDetail);
    expect(screen.getByText("12:30")).toBeInTheDocument();
    expectActions(["再借一会儿", "离场"]);
  });

  it("长租车在场与已过期状态仍只显示续费和离场", () => {
    renderDetail({
      ...hotelExpiringDetail,
      status: "overdue",
      presentVehicle: {
        ...hotelExpiringDetail.presentVehicle!,
        billingType: "lease",
      },
    });
    expectActions(["续费", "离场"]);
  });

  it("停用车位显示停用且没有操作按钮", () => {
    renderDetail({ ...emptyDetail, isActive: false });
    expect(screen.getByText("停用")).toBeInTheDocument();
    expectActions([]);
  });

  it("点击占位操作后通过 Snackbar 提示功能开发中", () => {
    renderDetail(emptyDetail);
    fireEvent.click(screen.getByRole("button", { name: "登记进场" }));
    expect(screen.getByText("功能开发中")).toBeInTheDocument();
  });
});
