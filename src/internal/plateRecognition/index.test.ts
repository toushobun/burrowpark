import { afterEach, describe, expect, it, vi } from "vitest";

type FakeMessage = {
  id: number;
  type?: "load";
  ready?: boolean;
  plate?: string | null;
};

function mockWorkers() {
  const workers: {
    onmessage: ((event: MessageEvent<FakeMessage>) => void) | null;
    onerror: (() => void) | null;
    postMessage: ReturnType<typeof vi.fn>;
    terminate: ReturnType<typeof vi.fn>;
  }[] = [];
  class FakeWorker {
    onmessage: ((event: MessageEvent<FakeMessage>) => void) | null = null;
    onerror: (() => void) | null = null;
    postMessage = vi.fn();
    terminate = vi.fn();
    constructor() {
      workers.push(this);
    }
  }
  vi.stubGlobal("Worker", FakeWorker);
  return workers;
}

function dispatch(
  worker: { onmessage: ((event: MessageEvent<FakeMessage>) => void) | null },
  payload: FakeMessage,
) {
  worker.onmessage?.({ data: payload } as MessageEvent<FakeMessage>);
}

describe("识别 Worker 接口", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("模型加载超过 15 秒仍在后台进行，加载完成后可推理", async () => {
    vi.useFakeTimers();
    const workers = mockWorkers();
    const { preloadPlateModels, recognizePlate, isPlateModelsReady } =
      await import("./index");
    const load = preloadPlateModels();
    expect(workers[0].postMessage).toHaveBeenCalledWith({
      id: 0,
      type: "load",
    });
    await vi.advanceTimersByTimeAsync(20000);
    expect(workers[0].terminate).not.toHaveBeenCalled();
    expect(isPlateModelsReady()).toBe(false);
    dispatch(workers[0], { id: 0, type: "load", ready: true });
    await expect(load).resolves.toBe(true);
    const result = recognizePlate(new Blob(["jpeg"]));
    await vi.advanceTimersByTimeAsync(0);
    const request = workers[0].postMessage.mock.calls[1][0] as { id: number };
    dispatch(workers[0], { id: request.id, plate: "辽A12345" });
    await expect(result).resolves.toBe("辽A12345");
  });

  it("模型加载失败可以重试，识别阶段 15 秒才终止 Worker", async () => {
    vi.useFakeTimers();
    const workers = mockWorkers();
    const { preloadPlateModels, recognizePlate } = await import("./index");
    const bad = preloadPlateModels();
    dispatch(workers[0], { id: 0, type: "load", ready: false });
    await expect(bad).resolves.toBe(false);
    const retry = preloadPlateModels();
    dispatch(workers[0], { id: 0, type: "load", ready: true });
    await expect(retry).resolves.toBe(true);
    const result = recognizePlate(new Blob(["jpeg"]));
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(15000);
    await expect(result).resolves.toBeNull();
    expect(workers[0].terminate).toHaveBeenCalledOnce();
  });

  it("重拍取消旧请求，旧 Worker 的迟到错误不会中断新识别", async () => {
    const workers = mockWorkers();
    const { preloadPlateModels, recognizePlate } = await import("./index");
    const load = preloadPlateModels();
    dispatch(workers[0], { id: 0, type: "load", ready: true });
    await load;
    const first = recognizePlate(new Blob(["old"]));
    await Promise.resolve();
    const second = recognizePlate(new Blob(["new"]));
    await expect(first).resolves.toBeNull();
    expect(workers).toHaveLength(2);
    expect(workers[0].terminate).toHaveBeenCalledOnce();
    const secondLoad = workers[1].postMessage.mock.calls[0][0];
    expect(secondLoad.type).toBe("load");
    workers[0].onerror?.();
    expect(workers[1].terminate).not.toHaveBeenCalled();
    dispatch(workers[1], { id: 0, type: "load", ready: true });
    await Promise.resolve();
    await Promise.resolve();
    const call = workers[1].postMessage.mock.calls.find(
      ([msg]) => msg.type === "recognize",
    );
    expect(call).toBeDefined();
    dispatch(workers[1], { id: call![0].id, plate: "辽A12345" });
    await expect(second).resolves.toBe("辽A12345");
  });
});
