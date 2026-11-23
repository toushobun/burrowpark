import { describe, expect, it } from "vitest";

import { parseOperationParams } from "./operationParams";

const id = "00000000-0000-4000-8000-000000000001";
const parse = (params: Record<string, string | string[]>) =>
  parseOperationParams(params, ["12"]);

describe("parseOperationParams", () => {
  it("解析登记、预留和长租三种操作及登记照片失败标记", () => {
    expect(parse({ done: "checkin", slot: "12", id, photo: "0" })).toEqual({
      done: "checkin",
      slot: "12",
      id,
      photo: "0",
    });
    expect(parse({ done: "checkin", slot: "12", id })).toEqual({
      done: "checkin",
      slot: "12",
      id,
    });
    expect(parse({ done: "reserve", slot: "12", id })).toEqual({
      done: "reserve",
      slot: "12",
      id,
    });
    expect(parse({ done: "lease", slot: "12", id })).toEqual({
      done: "lease",
      slot: "12",
      id,
    });
  });

  it("拒绝未知操作、非 UUID、不存在的车位及数组参数", () => {
    expect(parse({ done: "bad", slot: "12", id })).toBeNull();
    expect(parse({ done: "reserve", slot: "12", id: "bad" })).toBeNull();
    expect(parse({ done: "lease", slot: "9", id })).toBeNull();
    expect(parse({ done: ["lease"], slot: "12", id })).toBeNull();
    expect(parse({ done: "reserve", slot: ["12"], id })).toBeNull();
    expect(parse({ done: "lease", slot: "12", id: [id] })).toBeNull();
    expect(parse({})).toBeNull();
  });

  it("照片参数仅可用于登记，且只能取 0", () => {
    expect(parse({ done: "checkin", slot: "12", id, photo: "1" })).toBeNull();
    expect(parse({ done: "reserve", slot: "12", id, photo: "0" })).toBeNull();
  });
});
