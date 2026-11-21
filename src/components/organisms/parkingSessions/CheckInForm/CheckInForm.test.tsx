import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { recognizePlate } from "internal/plateRecognition";
import { compressPhoto } from "./compressPhoto";

vi.mock("internal/plateRecognition", () => ({ recognizePlate: vi.fn() }));
vi.mock("./compressPhoto", () => ({ compressPhoto: vi.fn() }));

import type { CheckInFormData } from "internal/parking";

import { CheckInForm } from "./CheckInForm";

const form: CheckInFormData = {
  code: "3",
  name: "3号",
  kind: "regular",
  isActive: true,
  occupied: false,
  hasLease: false,
  hasReservation: false,
  pricing: {
    hotel_daily_price_cents: 3000,
    hotel_checkout_hour: 12,
    hotel_previous_day_before_hour: 6,
    hourly_price_cents: 500,
  },
  now: "2026-11-20T03:00:00.000Z",
};

const action = vi.fn(async () => ({}));
const undoAction = vi.fn(async () => ({}));

function renderForm(
  overrides: Partial<CheckInFormData> = {},
  initialState?: {
    error?: string;
    errorKey?: string;
    success?: string;
    successKey?: string;
    result?: { sessionId: string; plate: string; photoSaved: boolean };
  },
) {
  return render(
    <CheckInForm
      action={action}
      form={{ ...form, ...overrides }}
      initialState={initialState}
      undoAction={undoAction}
    />,
  );
}

describe("CheckInForm", () => {
  beforeEach(() => {
    vi.mocked(recognizePlate).mockReset();
    vi.mocked(compressPhoto).mockReset();
    vi.mocked(compressPhoto).mockResolvedValue(
      new Blob(["jpeg"], { type: "image/jpeg" }),
    );
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: vi.fn(() => "blob:test-photo"),
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: vi.fn(),
    });
  });

  function choosePhoto(container: HTMLElement) {
    const input = container.querySelector('input[type="file"]');
    if (!input) throw new Error("缺少拍照输入框");
    fireEvent.change(input, {
      target: {
        files: [new File(["photo"], "photo.png", { type: "image/png" })],
      },
    });
  }

  it("普通空车位显示酒店客、临停和免费，不显示长租", () => {
    renderForm();
    expect(screen.getByRole("button", { name: "酒店客" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "临停" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "免费（装卸）" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "长租" })).toBeNull();
  });

  it("有在租长租时显示并默认选中长租", () => {
    renderForm({ hasLease: true });
    expect(screen.getByRole("button", { name: "长租" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.queryByText("实收金额（元）")).toBeNull();
  });

  it("私人位只允许临停或免费且必须选择借用时长", () => {
    renderForm({ kind: "private" });
    expect(screen.queryByRole("button", { name: "酒店客" })).toBeNull();
    expect(screen.queryByRole("button", { name: "长租" })).toBeNull();
    expect(screen.getByRole("button", { name: "临停" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "10 分钟" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "30 分钟" })).toBeInTheDocument();
    fireEvent.change(screen.getByRole("textbox", { name: "车牌号码" }), {
      target: { value: "粤b12345" },
    });
    expect(screen.getByRole("button", { name: "确认登记" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "10 分钟" }));
    expect(screen.getByRole("button", { name: "确认登记" })).toBeEnabled();
  });

  it("自动大写车牌并在输入完成前禁用提交", () => {
    renderForm();
    const plate = screen.getByRole("textbox", { name: "车牌号码" });
    expect(screen.getByRole("button", { name: "确认登记" })).toBeDisabled();
    fireEvent.change(plate, { target: { value: "粤b12345" } });
    expect(plate).toHaveValue("粤B12345");
    expect(screen.getByRole("button", { name: "确认登记" })).toBeDisabled();
  });

  it("选择住宿天数后更新交到时间和建议金额", () => {
    renderForm();
    expect(screen.getByText("交到 11月21日 12:00")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "3 天" }));
    expect(screen.getByText("建议金额：90.00 元")).toBeInTheDocument();
    expect(screen.getByText("交到 11月23日 12:00")).toBeInTheDocument();
  });

  it("自定义天数支持 1 到 30 天", () => {
    renderForm();
    fireEvent.click(screen.getByRole("button", { name: "自定义" }));
    const input = screen.getByRole("spinbutton", { name: "住宿天数" });
    fireEvent.change(input, { target: { value: "30" } });
    expect(input).toHaveValue(30);
    expect(screen.getByText("建议金额：900.00 元")).toBeInTheDocument();
  });

  it("酒店客必须选择收款方式且金额必须大于零", () => {
    renderForm();
    fireEvent.change(screen.getByRole("textbox", { name: "车牌号码" }), {
      target: { value: "粤B12345" },
    });
    expect(screen.getByRole("button", { name: "确认登记" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "微信" }));
    expect(screen.getByRole("button", { name: "确认登记" })).toBeEnabled();
    fireEvent.change(screen.getByRole("textbox", { name: "实收金额（元）" }), {
      target: { value: "0" },
    });
    expect(screen.getByRole("button", { name: "确认登记" })).toBeDisabled();
  });

  it("有预留时说明登记将自动关闭预留", () => {
    renderForm({ hasReservation: true });
    expect(screen.getByText(/登记后会自动标记为已到场/)).toBeInTheDocument();
  });

  it("停用或已占用车位不显示登记表单", () => {
    const { rerender } = renderForm({ isActive: false });
    expect(screen.queryByRole("button", { name: "确认登记" })).toBeNull();
    rerender(
      <CheckInForm
        action={action}
        form={{ ...form, occupied: true }}
        undoAction={undoAction}
      />,
    );
    expect(screen.queryByRole("button", { name: "确认登记" })).toBeNull();
  });

  it("冲突失败使用统一对话框反馈", () => {
    renderForm({}, { error: "这个车位刚刚被登记了", errorKey: "once" });
    expect(screen.getByRole("dialog")).toHaveTextContent(
      "这个车位刚刚被登记了",
    );
  });

  it("拍照后出现缩略图、重拍删除与识别加载状态", async () => {
    vi.mocked(recognizePlate).mockImplementation(() => new Promise(() => {}));
    const { container } = renderForm();
    expect(screen.getByRole("button", { name: "拍照" })).toBeInTheDocument();
    choosePhoto(container);
    await waitFor(() =>
      expect(screen.getByRole("img", { name: "车头照片" })).toBeInTheDocument(),
    );
    expect(screen.getByText("正在识别车牌…")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "重拍" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "删除照片" }));
    expect(screen.queryByRole("img", { name: "车头照片" })).toBeNull();
  });

  it("压缩期间禁用登记，压缩完成后允许带照片提交", async () => {
    let resolveCompression: (blob: Blob) => void = () => {};
    vi.mocked(compressPhoto).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveCompression = resolve;
        }),
    );
    vi.mocked(recognizePlate).mockResolvedValue(null);
    const { container } = renderForm();
    fireEvent.change(screen.getByRole("textbox", { name: "车牌号码" }), {
      target: { value: "粤B12345" },
    });
    fireEvent.click(screen.getByRole("button", { name: "微信" }));
    expect(screen.getByRole("button", { name: "确认登记" })).toBeEnabled();
    choosePhoto(container);
    expect(screen.getByRole("button", { name: "确认登记" })).toBeDisabled();
    await act(async () => {
      resolveCompression(new Blob(["jpeg"], { type: "image/jpeg" }));
    });
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "确认登记" })).toBeEnabled(),
    );
  });

  it("超出选图后总计十五秒就提示手动输入", async () => {
    vi.mocked(recognizePlate).mockImplementation(() => new Promise(() => {}));
    vi.useFakeTimers();
    try {
      const { container } = renderForm();
      choosePhoto(container);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(15000);
      });
      expect(screen.getByText("没认出来，请手动输入")).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("重拍识别失败时不会沿用上一张照片识别的车牌", async () => {
    vi.mocked(recognizePlate)
      .mockResolvedValueOnce("辽A12345")
      .mockResolvedValueOnce(null);
    const { container } = renderForm();
    choosePhoto(container);
    const plateInput = screen.getByRole("textbox", { name: "车牌号码" });
    await waitFor(() => expect(plateInput).toHaveValue("辽A12345"));
    choosePhoto(container);
    expect(plateInput).toHaveValue("");
    await waitFor(() =>
      expect(screen.getByText("没认出来，请手动输入")).toBeInTheDocument(),
    );
    expect(plateInput).toHaveValue("");
  });

  it("删除照片清空自动车牌但保留手动修改的车牌", async () => {
    vi.mocked(recognizePlate).mockResolvedValue("辽A12345");
    const { container } = renderForm();
    choosePhoto(container);
    const plateInput = screen.getByRole("textbox", { name: "车牌号码" });
    await waitFor(() => expect(plateInput).toHaveValue("辽A12345"));
    fireEvent.click(screen.getByRole("button", { name: "删除照片" }));
    expect(plateInput).toHaveValue("");

    choosePhoto(container);
    await waitFor(() => expect(plateInput).toHaveValue("辽A12345"));
    fireEvent.change(plateInput, { target: { value: "粤B11111" } });
    fireEvent.click(screen.getByRole("button", { name: "删除照片" }));
    expect(plateInput).toHaveValue("粤B11111");
  });

  it("识别超时后压缩成功仍保留照片预览", async () => {
    let resolveCompression: (blob: Blob) => void = () => {};
    vi.mocked(compressPhoto).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveCompression = resolve;
        }),
    );
    vi.useFakeTimers();
    try {
      const { container } = renderForm();
      choosePhoto(container);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(15000);
      });
      expect(screen.getByText("没认出来，请手动输入")).toBeInTheDocument();
      await act(async () => {
        resolveCompression(new Blob(["jpeg"], { type: "image/jpeg" }));
      });
      expect(screen.getByRole("img", { name: "车头照片" })).toBeInTheDocument();
      expect(recognizePlate).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it("压缩超时后提交登记时忽略迟到的图片", async () => {
    let resolveCompression: (blob: Blob) => void = () => {};
    vi.mocked(compressPhoto).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveCompression = resolve;
        }),
    );
    vi.useFakeTimers();
    try {
      const { container } = renderForm();
      fireEvent.change(screen.getByRole("textbox", { name: "车牌号码" }), {
        target: { value: "粤B12345" },
      });
      fireEvent.click(screen.getByRole("button", { name: "微信" }));
      choosePhoto(container);
      expect(screen.getByRole("button", { name: "确认登记" })).toBeDisabled();
      await act(async () => {
        await vi.advanceTimersByTimeAsync(15000);
      });
      expect(screen.getByRole("button", { name: "确认登记" })).toBeEnabled();
      expect(screen.getByText("没认出来，请手动输入")).toBeInTheDocument();
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "确认登记" }));
      });
      await act(async () => {
        resolveCompression(new Blob(["jpeg"], { type: "image/jpeg" }));
      });
      expect(screen.queryByRole("img", { name: "车头照片" })).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it("识别成功自动规范化填入车牌并允许修改", async () => {
    vi.mocked(recognizePlate).mockResolvedValue("辽a·12345");
    const { container } = renderForm();
    choosePhoto(container);
    await waitFor(() =>
      expect(screen.getByRole("textbox", { name: "车牌号码" })).toHaveValue(
        "辽A12345",
      ),
    );
    expect(screen.getByText("已自动填入，请核对")).toBeInTheDocument();
    fireEvent.change(screen.getByRole("textbox", { name: "车牌号码" }), {
      target: { value: "粤B11111" },
    });
    expect(screen.getByRole("textbox", { name: "车牌号码" })).toHaveValue(
      "粤B11111",
    );
  });

  it("手动输入过车牌时只显示可点击的识别建议而不覆盖", async () => {
    let finish: (value: string | null) => void = () => {};
    vi.mocked(recognizePlate).mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const { container } = renderForm();
    choosePhoto(container);
    fireEvent.change(screen.getByRole("textbox", { name: "车牌号码" }), {
      target: { value: "京A88888" },
    });
    await waitFor(() => expect(recognizePlate).toHaveBeenCalledOnce());
    finish("辽A12345");
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "识别结果：辽A·12345，点这里填入" }),
      ).toBeInTheDocument(),
    );
    expect(screen.getByRole("textbox", { name: "车牌号码" })).toHaveValue(
      "京A88888",
    );
    fireEvent.click(
      screen.getByRole("button", { name: "识别结果：辽A·12345，点这里填入" }),
    );
    expect(screen.getByRole("textbox", { name: "车牌号码" })).toHaveValue(
      "辽A12345",
    );
    choosePhoto(container);
    await waitFor(() => expect(recognizePlate).toHaveBeenCalledTimes(2));
    await act(async () => finish("京A88888"));
    await waitFor(() =>
      expect(screen.getByRole("textbox", { name: "车牌号码" })).toHaveValue(
        "京A88888",
      ),
    );
  });

  it("识别失败只显示手动输入提示，不弹失败对话框", async () => {
    vi.mocked(recognizePlate).mockResolvedValue(null);
    const { container } = renderForm();
    choosePhoto(container);
    await waitFor(() =>
      expect(screen.getByText("没认出来，请手动输入")).toBeInTheDocument(),
    );
    expect(screen.queryByRole("dialog")).toBeNull();
  });
  it("登记成功后持续展示车牌车位及三项大按钮", () => {
    renderForm(
      {},
      {
        success: "登记成功",
        successKey: "ok",
        result: {
          sessionId: "00000000-0000-4000-8000-000000000001",
          plate: "粤B12345",
          photoSaved: false,
        },
      },
    );
    expect(screen.getByText("已登记：粤B·12345 停在 3号")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "回地图" })).toHaveAttribute(
      "href",
      "/",
    );
    expect(screen.getByRole("link", { name: "查看车位" })).toHaveAttribute(
      "href",
      "/slots/3",
    );
    expect(screen.getByRole("button", { name: "撤销" })).toBeInTheDocument();
  });
});
