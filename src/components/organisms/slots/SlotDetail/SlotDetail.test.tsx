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
  const actionNames = ["登记进场", "续费", "续租", "离场", "再借一会儿"];
  for (const name of actionNames) {
    const role = name === "再借一会儿" ? "button" : "link";
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
    expect(s