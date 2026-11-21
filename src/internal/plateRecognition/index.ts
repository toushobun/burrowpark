"use client";

/** 模型推理只在点击拍照后才动态加载，不在主线程上运行。 */
let worker: Worker | null = null;
let serial = 0;
const requests = new Map<number, {
  resolve: (plate: string | null) => void;
  timer: ReturnType<typeof setTimeout>;
}>();

function resetWorker(): void {
  worker?.terminate();
  worker = null;
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
  instance.onmessage = (event: MessageEvent<{ id: number; plate: string | null }>) => {
    const request = requests.get(event.data.id);
    if (!request) return;
    requests.delete(event.data.id);
    clearTimeout(request.timer);
    request.resolve(event.data.plate);
  };
  instance.onerror = () => resetWorker();
  worker = instance;
  return instance;
}

export function recognizePlate(blob: Blob): Promise<string | null> {
  if (typeof Worker === "undefined") return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const id = ++serial;
      const instance = getWorker();
      const timer = setTimeout(resetWorker, 15000);
      requests.set(id, { resolve, timer });
      instance.postMessage({ id, blob });
    } catch {
      resetWorker();
      resolve(null);
    }
  });
}
