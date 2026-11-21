import * as ort from "onnxruntime-web/wasm";

import { decodePlate, plateTokens, selectDetections } from "./recognitionMath";

type Request = { id: number; blob: Blob };
type PixelSource = { width: number; height: number; data: Uint8ClampedArray };

ort.env.wasm.numThreads = 1;
ort.env.wasm.wasmPaths = "/onnxruntime/";

let sessions: Promise<{
  detector: ort.InferenceSession;
  recognizer: ort.InferenceSession;
}> | undefined;

function loadModels() {
  sessions ??= Promise.all([
    ort.InferenceSession.create("/models/hyperlpr3/y5fu_320x_sim.onnx", { executionProviders: ["wasm"] }),
    ort.InferenceSession.create("/models/hyperlpr3/rpv3_mdict_160_r3.onnx", { executionProviders: ["wasm"] }),
  ]).then(([detector, recognizer]) => ({ detector, recognizer }));
  return sessions;
}

async function pixels(blob: Blob): Promise<PixelSource> {
  const bitmap = await createImageBitmap(blob);
  try {
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("canvas unavailable");
    context.drawImage(bitmap, 0, 0);
    return { width: bitmap.width, height: bitmap.height, data: context.getImageData(0, 0, bitmap.width, bitmap.height).data };
  } finally {
    bitmap.close();
  }
}

function pixelAt(source: PixelSource, x: number, y: number): [number, number, number] {
  const ix = Math.max(0, Math.min(source.width - 1, Math.round(x)));
  const iy = Math.max(0, Math.min(source.height - 1, Math.round(y)));
  const index = (iy * source.width + ix) * 4;
  return [source.data[index], source.data[index + 1], source.data[index + 2]];
}

function detectorInput(source: PixelSource) {
  const scale = Math.min(320 / source.width, 320 / source.height);
  const offsetX = Math.floor((320 - Math.floor(source.width * scale)) / 2);
  const offsetY = Math.floor((320 - Math.floor(source.height * scale)) / 2);
  const data = new Float32Array(3 * 320 * 320);
  for (let y = 0; y < 320; y += 1) {
    for (let x = 0; x < 320; x += 1) {
      if (x < offsetX || y < offsetY || x >= offsetX + source.width * scale || y >= offsetY + source.height * scale) continue;
      const pixel = pixelAt(source, (x - offsetX) / scale, (y - offsetY) / scale);
      for (let c = 0; c < 3; c += 1) data[c * 320 * 320 + y * 320 + x] = pixel[c] / 255;
    }
  }
  return { tensor: new ort.Tensor("float32", data, [1, 3, 320, 320]), scale, offsetX, offsetY };
}

function recognitionInput(source: PixelSource, points: readonly number[]) {
  const data = new Float32Array(3 * 48 * 160);
  for (let y = 0; y < 48; y += 1) {
    for (let x = 0; x < 160; x += 1) {
      const u = x / 159;
      const v = y / 47;
      // 依四角点双线性展开车牌，避免仅截取方框导致透视角度误判。
      const px =
        (1 - u) * (1 - v) * points[0] + u * (1 - v) * points[2] +
        u * v * points[4] + (1 - u) * v * points[6];
      const py =
        (1 - u) * (1 - v) * points[1] + u * (1 - v) * points[3] +
        u * v * points[5] + (1 - u) * v * points[7];
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
  const detOutput = await detector.run({ [detector.inputNames[0]]: prepared.tensor });
  const detection = detOutput[detector.outputNames[0]];
  const values = detection.data;
  if (!(values instanceof Float32Array)) return null;
  const [batch, count, stride] = detection.dims;
  if (batch !== 1 || !count || !stride) return null;
  const candidates = selectDetections(values, count, stride, prepared.scale, prepared.offsetX, prepared.offsetY);
  for (const candidate of candidates.slice(0, 3)) {
    const recOutput = await recognizer.run({
      [recognizer.inputNames[0]]: recognitionInput(source, candidate.corners),
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
  const { id, blob } = event.data;
  try {
    self.postMessage({ id, plate: await infer(blob) });
  } catch {
    self.postMessage({ id, plate: null });
  }
};
