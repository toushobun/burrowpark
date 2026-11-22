import { describe, expect, it } from "vitest";

import { slotLayout } from "config/slotLayout";
import { slotStatusShortLabels } from "config/slotStatusText";

import { getSlotLabelLayout } from "./getSlotLabelLayout";

type Bounds = { left: number; top: number; right: number; bottom: number };
const bounds = (
  text: string,
  p: { x: number; y: number; fontSize: number },
): Bounds => ({
  left: p.x - (p.fontSize * text.length * 0.6) / 2,
  right: p.x + (p.fontSize * text.length * 0.6) / 2,
  top: p.y - p.fontSize / 2,
  bottom: p.y + p.fontSize / 2,
});
const intersects = (a: Bounds, b: Bounds) =>
  a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;

describe("getSlotLabelLayout", () => {
  it("横向车位号码和状态左右排列，字号不超过半个高度", () => {
    const shape = slotLayout.slots.find((slot) => slot.code === "18")!;
    const layout = getSlotLabelLayout(shape, "长租不在");
    expect(layout.horizontal).toBe(true);
    expect(layout.number.x).toBe(shape.x + shape.w / 3);
    expect(layout.status.x).toBe(shape.x + (shape.w * 2) / 3);
    expect(layout.number.fontSize).toBeLessThanOrEqual(shape.h * 0.5);
  });

  it("竖向车位号码和状态上下排列", () => {
    const shape = slotLayout.slots.find((slot) => slot.code === "23")!;
    const layout = getSlotLabelLayout(shape, "已过期");
    expect(layout.horizontal).toBe(false);
    expect(layout.number.y).toBeLessThan(layout.status.y);
  });

  it("每个车位所有状态的两段字框都在格子内，且互不相交", () => {
    const allStatuses = [...Object.values(slotStatusShortLabels), "停用", "未配置"];
    for (const shape of slotLayout.slots) {
      const box = {
        left: shape.x,
        right: shape.x + shape.w,
        top: shape.y,
        bottom: shape.y + shape.h,
      };
      for (const statusText of allStatuses) {
        const layout = getSlotLabelLayout(shape, statusText);
        const frames = [
          bounds(shape.code, layout.number),
          bounds(statusText, layout.status),
        ];
        for (const frame of frames) {
          expect(frame.left).toBeGreaterThanOrEqual(box.left);
          expect(frame.right).toBeLessThanOrEqual(box.right);
          expect(frame.top).toBeGreaterThanOrEqual(box.top);
          expect(frame.bottom).toBeLessThanOrEqual(box.bottom);
        }
        expect(intersects(frames[0], frames[1])).toBe(false);
      }
    }
  });
});
