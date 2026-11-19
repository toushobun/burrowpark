// @vitest-environment node

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { slotLayout } from "./slotLayout";

describe("slotLayout", () => {
  it("布局中的车位编号与数据库种子恰好一致，均为 1～29 号", () => {
    const seed = readFileSync(
      new URL("../../supabase/migrations/20261119000000_slots_seed.sql", import.meta.url),
      "utf8",
    );
    const seedCodes = Array.from(
      seed.matchAll(/\('(\d+)',\s*'\d+号'/g),
      (match) => match[1],
    );
    const layoutCodes = slotLayout.slots.map((slot) => slot.code);
    const expected = Array.from({ length: 29 }, (_, index) =>
      String(index + 1),
    );

    expect(layoutCodes).toEqual(expected);
    expect(seedCodes).toEqual(expected);
    expect(new Set(layoutCodes).size).toBe(29);
  });

  it("按定稿尺寸和坐标载入入口与封闭出口", () => {
    expect([slotLayout.width, slotLayout.height]).toEqual([1300, 1420]);
    expect(slotLayout.entrance).toEqual({ x: 0, y: 480, w: 138, h: 120 });
    expect(slotLayout.sealedOpening).toEqual([
      [1300, 790],
      [1300, 1030],
    ]);
  });
});
