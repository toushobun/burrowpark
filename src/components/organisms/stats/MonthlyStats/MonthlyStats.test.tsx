import Box from "@mui/material/Box";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MonthlyStats } from "./MonthlyStats";
import { emptyStats, populatedStats } from "./MonthlyStats.fixtures";

function renderPhone(stats = populatedStats, currentMonth = "2026-12") {
  return render(
    <Box sx={{ width: 390 }}>
      <MonthlyStats
        month="2026-11"
        currentMonth={currentMonth}
        stats={stats}
      />
    </Box>,
  );
}

describe("MonthlyStats", () => {
  it("390px 有数据的月份展示合计、分类、倒序明细和切换链接", () => {
    renderPhone();
    expect(screen.getByText("2026年11月")).toBeInTheDocument();
    expect(screen.getByText("1234.00 元")).toBeInTheDocument();
    expect(screen.getByText("本月进场 8 车次")).toBeInTheDocument();
    expect(screen.getByText("现金").parentElement).toHaveTextContent("0.00 元");
    expect(screen.queryByText("免费（装卸）")).toBeNull();
    expect(screen.getByText("粤B·12345", { exact: false })).toBeInTheDocument();
    expect(screen.getByText("张女士", { exact: false })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "上个月" })).toHaveAttribute(
      "href",
      "/stats?month=2026-10",
    );
    expect(screen.getByRole("link", { name: "下个月" })).toHaveAttribute(
      "href",
      "/stats?month=2026-12",
    );
    expect(screen.getByRole("link", { name: "返回设置" })).toHaveAttribute(
      "href",
      "/settings",
    );
  });

  it("390px 空月份展示三种零元方式和空明细提示", () => {
    renderPhone(emptyStats);
    expect(screen.getAllByText("0.00 元").length).toBeGreaterThan(0);
    expect(screen.getByText("这个月还没有收款")).toBeInTheDocument();
    for (const method of ["微信", "支付宝", "现金"]) {
      expect(screen.getByText(method).parentElement).toHaveTextContent("0.00 元");
    }
  });

  it("390px 当前月份不显示下个月入口", () => {
    renderPhone(populatedStats, "2026-11");
    expect(screen.queryByRole("link", { name: "下个月" })).toBeNull();
    expect(screen.getByRole("link", { name: "上个月" })).toBeInTheDocument();
  });

  it("出现免费收款时才显示免费分类", () => {
    renderPhone({
      ...populatedStats,
      byBillingType: { ...populatedStats.byBillingType, free: 100 },
    });
    expect(screen.getByText("免费（装卸）").parentElement).toHaveTextContent(
      "1.00 元",
    );
  });
});
