import { describe, expect, it } from "vitest";

import { slotLayout } from "config/slotLayout";
import { slotStatusShortLabels } from "config/slotStatusText";

import { getSlotLabelLayout } from "./getSlotLabelLayout";

type Bounds = { left: number; top: number; right: number; bottom: number };
type Position = { x: number; y: number; fontSize: number };

function bounds(text: string, p: Position): Bounds {
  const width = Array.from(text).reduce(
    (sum, character) => sum + (character.charCodeAt(0) < 128 ? 0.6 : 1),
    0,
  );
  return {
    left: p.x - (p.fontSize * width) / 2,
    right: p.x + (p.fontSize * width) / 2,
    top: p.y - p.fontSize / 2,
    bottom: p.y + p.fontSize / 2,
  };
}

function intersects(a: Bounds, b: Bounds) {
  const horizontal = a.left < b.right && a.right > b.left;
  const vertical = a.top < b.bottom && a.bottom > b.top;
  return horizontal && vertical;
}

describe("getSlotLabelLayout", () => {
  it("横向车位号码和状态左右排列，字号不超过半个高度", () => {
    const shape = slotLayout.slots.find((slot) => slot.code === "18")!;
    const layout = getSlotLabelLayout(shape, "长租不在");
    expect(layout.horizontal).toBe(true);
    expect(layout.number.x).toBeLessThan(layout.status.x);
    expect(layout.number.fontSize).toBeLessThanOrEqual(shape.h * 0.5);
  });

  it("竖向车位号码和状态上下排列", () => {
    const shape = slotLayout.slots.find((slot) => slot.code === "23")!;
    const layout = getSlotLabelLayout(shape, "已过期");
    expect(layout.horizontal).toBe(false);
    expect(layout.number.y).toBeLessThan(layout.status.y);
  });

  it("地图常用短状态在默认比例下不低于 16px", () => {
    const scale = 44 / 90;
    for (const shape of slotLayout.slots) {
      for (const status of Object.values(slotStatusShortLabels)) {
        const layout = getSlotLabelLayout(shape, status);
        expect(layout.number.fontSize * scale).toBeGreaterThanOrEqual(16);
        expect(layout.status.fontSize * scale).toBeGreaterThanOrEqual(16);
      }
    }
  });

  it("每个车位所有状态的两段字框都在格子内，且互不相交", () => {
    const allStatuses = new Set<string>(Object.values(slotStatusShortLabels));
    allStatuses.add("停用");
    allStatuses.add("未配置");
    allStatuses.add("长租不在");
    allStatuses.add("快到期");

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
