import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PlatePhotoInput } from "./PlatePhotoInput";
import { usePlatePhotoInput } from "./usePlatePhotoInput";

function Example({ purpose }: { purpose: "checkin" | "lease" }) {
  const capture = usePlatePhotoInput("", {
    previewUrl: "data:image/png;base64,",
    status: "failed",
  });
  return (
    <PlatePhotoInput
      capture={capture}
      disabled={false}
      label="车牌"
      purpose={purpose}
    />
  );
}

describe("PlatePhotoInput", () => {
  it("根据业务用途提示识别失败后的不同处理方式", () => {
    const { rerender } = render(<Example purpose="checkin" />);
    const checkInHint = screen.getByText("没认出来，可直接使用照片登记");
    expect(checkInHint).toBeInTheDocument();
    rerender(<Example purpose="lease" />);
    const leaseHint = screen.getByText("没认出来，可手动填写车牌");
    expect(leaseHint).toBeInTheDocument();
  });
});
