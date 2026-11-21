import { afterEach, describe, expect, it, vi } from "vitest";

describe("识别 Worker 接口", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("重拍取消旧请求，旧 Worker 的迟到错误不会中断新识别", async () => {
    const workers: {
      onmessage:
        | ((event: MessageEvent<{ id: number; plate: string | null }>) => void)
        | null;
      onerror: (() => void) | null;
      postMessage: ReturnType<typeof vi.fn>;
      terminate: ReturnType<typeof vi.fn>;
    }[] = [];
    class FakeWorker {
      onmessage:
        | ((event: MessageEvent<{ id: number; plate: string | null }>) => void)
        | null = null;
      onerror: (() => void) | null = null;
      postMessage = vi.fn();
      terminate = vi.fn();

      constructor() {
        workers.push(this);
      }
    }
    vi.stubGlobal("Worker", FakeWorker);
    const { recognizePlate } = await import("./index");
    const first = recognizePlate(new Blob(["old"]));
    const second = recognizePlate(new Blob(["new"]));
    await expect(first).resolves.toBeNull();
    expect(workers).toHaveLength(2);
    expect(workers[0].terminate).toHaveBeenCalledOnce();
    const secondId = workers[1].postMessage.mock.calls[0][0].id;
    workers[0].onerror?.();
    expect(workers[1].terminate).not.toHaveBeenCalled();
    workers[1].onmessage?.({
      data: { id: secondId, plate: "辽A12345" },
    } as MessageEvent<{ id: number; plate: string }>);
    await expect(second).resolves.toBe("辽A12345");
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
