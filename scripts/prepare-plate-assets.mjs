import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const repoRoot = process.cwd();
const modelDir = join(repoRoot, "public", "models", "hyperlpr3", "v1");
const wasmDir = join(repoRoot, "public", "onnxruntime", "1.23.2");
const models = [
  {
    name: "y5fu_320x_sim.onnx",
    size: 2343161,
    sha256: "2a985dc63a5cc947ec36d18503d6fc0fd54525b9dba17f2fe29a71e86b44456d",
  },
  {
    name: "rpv3_mdict_160_r3.onnx",
    size: 10258843,
    sha256: "8fb08b5db2adeccf43b05006bbbf409e4659d08d72e46a62631c00ff751eaeb3",
  },
];

for (const model of models) {
  const bytes = await readFile(join(modelDir, model.name));
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  if (bytes.byteLength !== model.size || sha256 !== model.sha256) {
    throw new Error("本地模型文件校验失败：" + model.name);
  }
  console.info(
    "[plate-assets] 模型已校验",
    model.name,
    bytes.byteLength,
    "bytes",
    sha256,
  );
}

await mkdir(wasmDir, { recursive: true });
for (const name of [
  "ort-wasm-simd-threaded.mjs",
  "ort-wasm-simd-threaded.wasm",
]) {
  const source = join(
    repoRoot,
    "node_modules",
    "onnxruntime-web",
    "dist",
    name,
  );
  const destination = join(wasmDir, name);
  await copyFile(source, destination);
  const bytes = await readFile(destination);
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  console.info(
    "[plate-assets] 本地 WASM",
    name,
    bytes.byteLength,
    "bytes",
    sha256,
  );
}
