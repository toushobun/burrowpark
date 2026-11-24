// @vitest-environment node

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { getSlotYard, slotLayouts } from "./slotLayout";

describe("slotLayouts", () => {
  it("两院车位与数据库种子一致，1～29 号不重复不缺失", () => {
    const seed = readFileSync(
      new URL(
        "../../supabase/migrations/20261119000000_slots_seed.sql",
        import.meta.url,
      ),
      "utf8",
    );
    const seedCodes = Array.from(
      seed.matchAll(/\('(\d+)',\s*'\d+号'/g),
      (match) => match[1],
    );
    const { outer, inner } = slotLayouts;
    expect(outer.slots.map((slot) => slot.code)).toEqual(
      Array.from({ length: 14 }, (_, i) => String(i + 1)),
    );
    expect(inner.slots.map((slot) => slot.code)).toEqual(
      Array.from({ length: 15 }, (_, i) => String(i + 15)),
    );
    expect([...outer.slots, ...inner.slots].map((slot) => slot.code)).toEqual(
      seedCodes,
    );
    expect(getSlotYard("14")).toBe("outer");
    expect(getSlotYard("15")).toBe("inner");
    expect(getSlotYard("29")).toBe("inner");
  });

  it("外院楼梯与 11、12 号对齐，两个地图不显示车库", () => {
    const { outer, inner } = slotLayouts;
    const stairs = outer.obstacles.find((shape) => shape.label === "楼梯")!;
    const eleven = outer.slots.find((shape) => shape.code === "11")!;
    const twelve = outer.slots.find((shape) => shape.code === "12")!;
    expect(stairs.x).toBe(eleven.x);
    expect(stairs.w).toBe(eleven.w);
    expect(stairs.x).toBe(twelve.x);
    expect(stairs.w).toBe(twelve.w);
    expect(stairs.y).toBe(twelve.y + twelve.h);
    expect(
      [...outer.obstacles, ...inner.obstacles].some((shape) =>
        shape.label.startsWith("车库"),
      ),
    ).toBe(false);
  });

  it("里院 25 号位于顶部，26～29 沿左墙排列，24 在 23 下方", () => {
    const shape = (code: number) =>
      slotLayouts.inner.slots.find((slot) => slot.code === String(code))!;
    expect(shape(25).x).toBeGreaterThan(shape(26).x);
    expect(shape(25).y).toBe(shape(26).y);
    expect(shape(24).x).toBe(shape(23).x);
    expect(shape(24).y).toBeGreaterThanOrEqual(shape(23).y + shape(23).h);
    for (let code = 27; code <= 29; code++) {
      expect(shape(code).x).toBe(shape(26).x);
      expect(shape(code).y).toBeGreaterThan(shape(code - 1).y);
    }
    for (let code = 19; code <= 23; code++) {
      expect(shape(code).x).toBeLessThan(shape(code - 1).x);
      expect(shape(code).y).toBe(shape(code - 1).y);
    }
  });

  it("地图区域标签与车位、参照物不重叠，图块均在画布内", () => {
    for (const layout of Object.values(slotLayouts)) {
      for (const rect of [...layout.slots, ...layout.obstacles]) {
        expect(rect.x).toBeGreaterThanOrEqual(0);
        expect(rect.y).toBeGreaterThanOrEqual(0);
        expect(rect.x + rect.w).toBeLessThanOrEqual(layout.width);
        expect(rect.y + rect.h).toBeLessThanOrEqual(layout.height);
        for (const area of layout.areas) {
          const halfWidth = (area.label.length * 84) / 2;
          const overlap =
            area.x - halfWidth < rect.x + rect.w &&
            area.x + halfWidth > rect.x &&
            area.y - 84 < rect.y + rect.h &&
            area.y > rect.y;
          expect(overlap).toBe(false);
        }
      }
    }
  });
});
