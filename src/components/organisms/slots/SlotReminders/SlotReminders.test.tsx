import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { SlotReminder } from "internal/parking";
import { SlotReminders } from "./SlotReminders";

const mixed: SlotReminder[] = [
  {
    code: "2",
    name: "2号",
    displayName: "粤B·00002",
    status: "overdue",
    deadline: "2026-11-20T02:00:00.000Z",
    description: "超时 2 小时",
  },
  {
    code: "3",
    name: "3号",
    displayName: "张女士",
    status: "expiringSoon",
    deadline: "2026-11-22T15:59:59.000Z",
    description: "11月22日到期",
  },
  {
    code: "7",
    name: "7号",
    displayName: "粤B·00007",
    status: "privateBorrowed",
    deadline: "2026-11-20T04:03:00.000Z",
    description: "借用还剩 3 分钟",
  },
];

describe("SlotReminders", () => {
  it("没有提醒时显示明确提示", () => {
    render(<SlotReminders reminders={[]} />);
    expect(
      screen.getByRole("heading", { name: "要处理的事" }),
    ).toBeInTheDocument();
    expect(screen.getByText("现在没有要处理的事")).toBeInTheDocument();
  });

  it("混合提醒逐项展示车位、车牌或租户、徽标与时间说明", () => {
    render(<SlotReminders reminders={mixed} />);
    expect(screen.getByText("粤B·00002")).toBeInTheDocument();
    expect(screen.getByText("张女士")).toBeInTheDocument();
    expect(screen.getByText("借用还剩 3 分钟")).toBeInTheDocument();
    expect(screen.getByText("已过期")).toBeInTheDocument();
    expect(screen.getByText("快到期")).toBeInTheDocument();
    expect(screen.getByText("私人位借用中")).toBeInTheDocument();
  });

  it("整行可点击并进入正确的车位详情，最小触控高度沿用设计值", () => {
    render(<SlotReminders reminders={mixed} />);
    const links = screen.getAllByRole("link");
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/slots/2",
      "/slots/3",
      "/slots/7",
    ]);
    expect(
      links.every((link) => link.classList.contains("MuiButtonBase-root")),
    ).toBe(true);
  });
});
