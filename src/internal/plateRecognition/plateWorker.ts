import * as ort from "onnxruntime-web/wasm";

import {
  createPlateProjection,
  decodePlate,
  selectDetections,
} from "./recognitionMath";

type Request =
  | { id: number; type: "load" }
  | { id: number; type: "recognize"; blob: Blob };
type PixelSource = { width: number; height: number; data: Uint8ClampedArray };

ort.env.wasm.numThreads = 1;
ort.env.wasm.wasmPaths = "/onnxruntime/1.23.2/";

let sessions:
  | Promise<{
      detector: ort.InferenceSession;
      recognizer: ort.InferenceSession;
    }>
  | undefined;

function loadModels() {
  if (!sessions) {
    sessions = Promise.all([
      ort.InferenceSession.create("/models/hyperlpr3/v1/y5fu_320x_sim.onnx", {
        executionProviders: ["wasm"],
      }),
      ort.InferenceSession.create(
        "/models/hyperlpr3/v1/rpv3_mdict_160_r3.onnx",
        {
          executionProviders: ["wasm"],
        },
      ),
    ])
      .then(([detector, recognizer]) => ({ detector, recognizer }))
      .catch((error: unknown) => {
        // 初始化失败后允许用户重新拍照重试，而不是永久缓存失败状态。
        sessions = undefined;
        throw error;
      });
  }
  return sessions;
}

async function pixels(blob: Blob): Promise<PixelSource> {
  const bitmap = await createImageBitmap(blob);
  try {
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("canvas unavailable");
    context.drawImage(bitmap, 0, 0);
    return {
      width: bitmap.width,
      height: bitmap.height,
      data: context.getImageData(0, 0, bitmap.width, bitmap.height).data,
    };
  } finally {
    bitmap.close();
  }
}

function pixelAt(
  source: PixelSource,
  x: number,
  y: number,
): [number, number, number] {
  // 缩放和透视展平使用双线性采样，避免小车牌的最近邻锯齿。
  const px = Math.max(0, Math.min(source.width - 1, x));
  const py = Math.max(0, Math.min(source.height - 1, y));
  const x0 = Math.floor(px);
  const y0 = Math.floor(py);
  const x1 = Math.min(x0 + 1, source.width - 1);
  const y1 = Math.min(y0 + 1, source.height - 1);
  const dx = px - x0;
  const dy = py - y0;
  const p00 = (y0 * source.width + x0) * 4;
  const p10 = (y0 * source.width + x1) * 4;
  const p01 = (y1 * source.width + x0) * 4;
  const p11 = (y1 * source.width + x1) * 4;
  const channel = (c: number) =>
    (source.data[p00 + c] * (1 - dx) + source.data[p10 + c] * dx) * (1 - dy) +
    (source.data[p01 + c] * (1 - dx) + source.data[p11 + c] * dx) * dy;
  return [channel(0), channel(1), channel(2)];
}

function detectorInput(source: PixelSource) {
  const scale = Math.min(320 / source.width, 320 / source.height);
  const offsetX = Math.floor((320 - Math.floor(source.width * scale)) / 2);
  const offsetY = Math.floor((320 - Math.floor(source.height * scale)) / 2);
  const data = new Float32Array(3 * 320 * 320);
  for (let y = 0; y < 320; y += 1) {
    for (let x = 0; x < 320; x += 1) {
      if (
        x < offsetX ||
        y < offsetY ||
        x >= offsetX + source.width * scale ||
        y >= offsetY + source.height * scale
      )
        continue;
      const pixel = pixelAt(
        source,
        (x - offsetX) / scale,
        (y - offsetY) / scale,
      );
      for (let c = 0; c < 3; c += 1)
        data[c * 320 * 320 + y * 320 + x] = pixel[c] / 255;
    }
  }
  return {
    tensor: new ort.Tensor("float32", data, [1, 3, 320, 320]),
    scale,
    offsetX,
    offsetY,
  };
}

function recognitionInput(source: PixelSource, points: readonly number[]) {
  const projection = createPlateProjection(points);
  if (!projection) return null;
  const data = new Float32Array(3 * 48 * 160);
  for (let y = 0; y < 48; y += 1) {
    for (let x = 0; x < projection.resizedWidth; x += 1) {
      const [px, py] = projection.sample(
        x / (projection.resizedWidth - 1),
        y / 47,
      );
      const rgb = pixelAt(source, px, py);
      for (let c = 0; c < 3; c += 1) {
        data[c * 48 * 160 + y * 160 + x] = (rgb[2 - c] - 127.5) / 127.5;
      }
    }
  }
  return new ort.Tensor("float32", data, [1, 3, 48, 160]);
}

async function infer(blob: Blob): Promise<string | null> {
  const source = await pixels(blob);
  const { detector, recognizer } = await loadModels();
  const prepared = detectorInput(source);
  const detOutput = await detector.run({
    [detector.inputNames[0]]: prepared.tensor,
  });
  const detection = detOutput[detector.outputNames[0]];
  const values = detection.data;
  if (!(values instanceof Float32Array)) return null;
  const [batch, count, stride] = detection.dims;
  if (batch !== 1 || !count || !stride) return null;
  const candidates = selectDetections(
    values,
    count,
    stride,
    prepared.scale,
    prepared.offsetX,
    prepared.offsetY,
  );
  for (const candidate of candidates.slice(0, 3)) {
    const input = recognitionInput(source, candidate.corners);
    if (!input) continue;
    const recOutput = await recognizer.run({
      [recognizer.inputNames[0]]: input,
    });
    const prediction = recOutput[recognizer.outputNames[0]];
    const scores = prediction.data;
    if (!(scores instanceof Float32Array)) continue;
    const dimensions = prediction.dims;
    const steps = dimensions[dimensions.length - 2];
    const classes = dimensions[dimensions.length - 1];
    const plate = decodePlate(scores, steps, classes);
    if (plate) return plate;
  }
  return null;
}

self.onmessage = async (event: MessageEvent<Request>) => {
  const request = event.data;
  if (request.type === "load") {
    try {
      await loadModels();
      self.postMessage({ id: request.id, type: "load", ready: true });
    } catch {
      self.postMessage({ id: request.id, type: "load", ready: false });
    }
    return;
  }
  try {
    self.postMessage({ id: request.id, plate: await infer(request.blob) });
  } catch {
    self.postMessage({ id: request.id, plate: null });
  }
};
