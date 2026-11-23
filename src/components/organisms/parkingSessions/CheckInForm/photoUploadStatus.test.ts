import { describe, expect, it } from "vitest";

import { photoUploadFailed } from "./photoUploadStatus";

describe("photoUploadFailed", () => {
  it("没拍照时不误报照片上传失败", () => {
    expect(photoUploadFailed(null, false)).toBe(false);
  });

  it("确实提交照片且没有保存成功时提示上传失败", () => {
    expect(photoUploadFailed(new Blob(["photo"]), false)).toBe(true);
  });

  it("照片成功保存时不显示上传失败", () => {
    expect(photoUploadFailed(new Blob(["photo"]), true)).toBe(false);
  });
});
