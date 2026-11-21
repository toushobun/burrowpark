import { afterEach, describe, expect, it, vi } from "vitest";

describe("识别 Worker 接口", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("发起 Worker 推理并使用匹配请求的识别结果", async () => {
    const postMessage = vi.fn();
    let handler:
      | ((event: MessageEvent<{ id: number; plate: string | null }>) => void)
      | null = null;
    class FakeWorker {
      set onmessage(value: typeof handler) {
        handler = value;
      }
      onerror = null;
      postMessage = postMessage;
      terminate = vi.fn();
    }
    vi.stubGlobal("Worker", FakeWorker);
    const { recognizePlate } = await import("./index");
    const result = recognizePlate(new Blob(["jpeg"], { type: "image/jpeg" }));
    expect(postMessage).toHaveBeenCalledOnce();
    const request = postMessage.mock.calls[0][0] as { id: number };
    const dispatch = handler as unknown as (
      event: MessageEvent<{ id: number; plate: string }>,
    ) => void;
    dispatch({ data: { id: request.id, plate: "辽A12345" } } as MessageEvent<{
      id: number;
      plate: string;
    }>);
    await expect(result).resolves.toBe("辽A12345");
  });
});
