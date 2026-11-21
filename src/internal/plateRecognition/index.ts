"use client";

/** Worker 加载 ONNX 后保持存活；识别超时才重建 Worker。 */
let worker: Worker | null = null;
let serial = 0;
let modelsReady = false;
let loadingPromise: Promise<boolean> | null = null;
let resolveLoading: ((ready: boolean) => void) | null = null;
const requests = new Map<
  number,
  {
    resolve: (plate: string | null) => void;
    timer: ReturnType<typeof setTimeout>;
  }
>();

function resetWorker(): void {
  worker?.terminate();
  worker = null;
  modelsReady = false;
  resolveLoading?.(false);
  resolveLoading = null;
  loadingPromise = null;
  for (const { resolve, timer } of requests.values()) {
    clearTimeout(timer);
    resolve(null);
  }
  requests.clear();
}

function getWorker(): Worker {
  if (worker) return worker;
  const instance = new Worker(new URL("./plateWorker.ts", import.meta.url), {
    type: "module",
  });
  instance.onmessage = (
    event: MessageEvent<{
      id: number;
      type?: "load";
      ready?: boolean;
      plate?: string | null;
    }>,
  ) => {
    if (worker !== instance) return;
    if (event.data.type === "load") {
      modelsReady = event.data.ready === true;
      const resolve = resolveLoading;
      resolveLoading = null;
      loadingPromise = null;
      resolve?.(modelsReady);
      return;
    }
    const request = requests.get(event.data.id);
    if (!request) return;
    requests.delete(event.data.id);
    clearTimeout(request.timer);
    request.resolve(event.data.plate ?? null);
  };
  instance.onerror = () => {
    if (worker === instance) resetWorker();
  };
  worker = instance;
  return instance;
}

export function isPlateModelsReady(): boolean {
  return modelsReady && requests.size === 0;
}

/** 不设置 15 秒超时，也不在 UI 的 90 秒超时后终止后台加载。 */
export function preloadPlateModels(): Promise<boolean> {
  if (typeof Worker === "undefined") return Promise.resolve(false);
  // 新照片到来时，中断旧识别；重新初始化不计入新照片 15 秒识别时间。
  if (requests.size > 0) resetWorker();
  if (modelsReady) return Promise.resolve(true);
  if (loadingPromise) return loadingPromise;
  loadingPromise = new Promise<boolean>((resolve) => {
    try {
      const instance = getWorker();
      resolveLoading = resolve;
      instance.postMessage({ id: 0, type: "load" });
    } catch {
      resetWorker();
      resolve(false);
      queueMicrotask(() => {
        loadingPromise = null;
      });
    }
  });
  return loadingPromise;
}

/** 识别阶段最多 15 秒；加载阶段由 preloadPlateModels 单独完成。 */
export async function recognizePlate(blob: Blob): Promise<string | null> {
  if (typeof Worker === "undefined") return null;
  if (!(await preloadPlateModels())) return null;
  return new Promise((resolve) => {
    try {
      const id = ++serial;
      const instance = getWorker();
      const timer = setTimeout(() => {
        if (worker === instance && requests.has(id)) resetWorker();
      }, 15000);
      requests.set(id, { resolve, timer });
      instance.postMessage({ id, type: "recognize", blob });
    } catch {
      resetWorker();
      resolve(null);
    }
  });
}
