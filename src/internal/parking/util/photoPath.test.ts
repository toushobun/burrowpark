import { describe, expect, it } from "vitest";

import { buildPlatePhotoPath } from "./photoPath";

describe("照片路径", () => {
  it("上海 12 月 1 日零点半归档到 12 月而不是 UTC 11 月", () => {
    expect(
      buildPlatePhotoPath(new Date("2026-11-30T16:30:00.000Z"), "session"),
    ).toBe("2026/12/session.jpg");
  });
  it("上海月末最后一分钟仍属于旧月份", () => {
    expect(
      buildPlatePhotoPath(new Date("2026-11-30T15:59:00.000Z"), "session"),
    ).toBe("2026/11/session.jpg");
  });
});
