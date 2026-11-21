import { describe, expect, it } from "vitest";
import { pricingSettingsText } from "./pricingSettingsText";
describe("pricingSettingsText", () => {
  it("当前截止小时和凌晨边界会更新说明", () => {
    expect(pricingSettingsText.checkoutExplanation(6, 12)).toBe(
      "凌晨 6 点前进场，按前一天算，第二天 12 点前离场",
    );
    expect(pricingSettingsText.checkoutExplanation(4, 11)).toBe(
      "凌晨 4 点前进场，按前一天算，第二天 11 点前离场",
    );
  });
});
