import { afterEach, describe, expect, it, vi } from "vitest";

import { plateTokens } from "./recognitionMath";

describe("HyperLPR3 Worker 推理", () => {
  afterEach(() => {
    vi.doUnmock("onnxruntime-web/wasm");
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  it("先检测车牌四角，再按检测结果识别字符并回传结果", async () => {
    const detection = new Float32Array(15);
    detection[4] = 0.95;
    detection[13] = 0.95;
    [10, 10, 70, 10, 70, 30, 10, 30].forEach((value, index) => {
      detection[5 + index] = value;
    });

    const target = "辽A12345";
    const indices = [
      0,
      ...Array.from(target, (character) =>
        plateTokens.findIndex((token) => token === character),
      ),
    ];
    const predictions = new Float32Array(indices.length * plateTokens.length);
    indices.forEach((index, step) => {
      predictions[step * plateTokens.length + index] = 0.98;
    });

    const detect = vi.fn().mockResolvedValue({
      output: { data: detection, dims: [1, 1, 15] },
    });
    const recognize = vi.fn().mockResolvedValue({
      output: {
        data: predictions,
        dims: [1, indices.length, plateTokens.length],
      },
    });
    const create = vi.fn(async (path: string) => ({
      inputNames: ["images"],
      outputNames: ["output"],
      run: path.includes("y5fu_") ? detect : recognize,
    }));
    vi.doMock("onnxruntime-web/wasm", () => ({
      env: { wasm: {} },
      Tensor: class {
        constructor(_type: string, _data: Float32Array, _dims: number[]) {}
      },
      InferenceSession: { create },
    }));

    vi.stubGlobal(
      "createImageBitmap",
      vi.fn().mockResolvedValue({
        width: 80,
        height: 40,
        close: vi.fn(),
      }),
    );
    vi.stubGlobal(
      "OffscreenCanvas",
      class {
        getContext() {
          return {
            drawImage: vi.fn(),
            getImageData: () => ({
              data: new Uint8ClampedArray(80 * 40 * 4).fill(255),
            }),
          };
        }
      },
    );
    const scope = {
      onmessage: null as ((event: MessageEvent) => Promise<void>) | null,
      postMessage: vi.fn(),
    };
    vi.stubGlobal("self", scope);

    await import("./plateWorker");
    const handler = scope.onmessage;
    if (!handler) throw new Error("Worker 未注册监听");
    await handler({
      data: { id: 9, blob: new Blob(["jpeg"], { type: "image/jpeg" }) },
    } as MessageEvent);

    expect(create).toHaveBeenCalledTimes(2);
    expect(detect).toHaveBeenCalledOnce();
    expect(recognize).toHaveBeenCalledOnce();
    expect(detect.mock.invocationCallOrder[0]).toBeLessThan(
      recognize.mock.invocationCallOrder[0],
    );
    expect(scope.postMessage).toHaveBeenCalledWith({ id: 9, plate: target });
  });
});
