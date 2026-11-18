import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { commonText } from "config/commonText";

import { FailureFeedbackDialog } from "./FailureFeedbackDialog";

describe("FailureFeedbackDialog", () => {
  it("首次没有错误不弹出", () => {
    render(<FailureFeedbackDialog state={{}} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("errorKey 从无到有时弹出错误", async () => {
    const { rerender } = render(<FailureFeedbackDialog state={{}} />);
    rerender(
      <FailureFeedbackDialog
        state={{ error: "访问码不对，请再试一次。", errorKey: "error-1" }}
      />,
    );
    expect(await screen.findByRole("dialog")).toHaveTextContent(
      "访问码不对，请再试一次。",
    );
  });

  it("相同错误文案的新 errorKey 再次弹出", async () => {
    const state = { error: "访问码不对，请再试一次。", errorKey: "error-1" };
    const { rerender } = render(<FailureFeedbackDialog state={state} />);
    fireEvent.click(await screen.findByRole("button", { name: commonText.acknowledge }));
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    rerender(
      <FailureFeedbackDialog state={{ ...state, errorKey: "error-2" }} />,
    );
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
  });

  it("关闭后不会因重新渲染相同 errorKey 再弹出", async () => {
    const onClose = vi.fn();
    const state = { error: "访问码不对，请再试一次。", errorKey: "error-1" };
    const { rerender } = render(
      <FailureFeedbackDialog state={state} onClose={onClose} />,
    );
    fireEvent.click(await screen.findByRole("button", { name: commonText.acknowledge }));
    expect(onClose).toHaveBeenCalledOnce();
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    rerender(<FailureFeedbackDialog state={{ ...state }} onClose={onClose} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
