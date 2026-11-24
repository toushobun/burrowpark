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
  it("横向和竖向车位均采用号码与状态上下排列", () => {
    for (const shape of slotLayout.slots) {
      const layout = getSlotLabelLayout(shape, slotStatusShortLabels.occupied);
      expect(layout.horizontal).toBe(false);
      expect(layout.number.x).toBe(layout.status.x);
      expect(layout.number.y).toBeLessThan(layout.status.y);
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
