import { describe, expect, it } from "vitest";

import { parseCheckInParams } from "./checkInParams";

const session = "00000000-0000-4000-8000-000000000001";

describe("parseCheckInParams", () => {
  it("正确读取存在车位的登记会话与照片失败标记", () => {
    expect(parseCheckInParams({ checkedIn: "12", session, photo: "0" }, ["12"])).toEqual({
      code: "12",
      sessionId: session,
      photoSaved: false,
    });
    expect(parseCheckInParams({ checkedIn: "12", session }, ["12"])?.photoSaved).toBe(true);
  });

  it("不存在的车位、无效会话、数组参数与未知照片标记全部忽略", () => {
    expect(parseCheckInParams({ checkedIn: "9", session }, ["12"])).toBeNull();
    expect(parseCheckInParams({ checkedIn: "12", session: "bad" }, ["12"])).toBeNull();
    expect(parseCheckInParams({ checkedIn: ["12"], session }, ["12"])).toBeNull();
    expect(parseCheckInParams({ checkedIn: "12", session, photo: "1" }, ["12"])).toBeNull();
    expect(parseCheckInParams({}, ["12"])).toBeNull();
  });
});
