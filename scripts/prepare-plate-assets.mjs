import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const repoRoot = process.cwd();
const modelDir = join(repoRoot, "public", "models", "hyperlpr3");
const wasmDir = join(repoRoot, "public", "onnxruntime");
const modelCommit = "bcfcfa87dc48df273903d1b770f094c39a1ebab6";
const modelBase =
  "https://raw.githubusercontent.com/lets-mica/mica-ai/" +
  modelCommit +
  "/model-tools/plate/models/";

const models = [
  {
    name: "y5fu_320x_sim.onnx",
    size: 2343161,
    gitSha: "e1094ba850557424ea87ad998758e6eee9e5f160",
  },
  {
    name: "rpv3_mdict_160_r3.onnx",
    size: 10258843,
    gitSha: "474906430474ee3ddade0cf95461f3051ed35199",
  },
];

function hashes(bytes) {
  const gitBlob = createHash("sha1")
    .update("blob " + bytes.byteLength + "\0")
    .update(bytes)
    .digest("hex");
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  return { gitBlob, sha256 };
}

async function prepareModel(model) {
  const destination = join(modelDir, model.name);
  let bytes;
  try {
    bytes = await readFile(destination);
    if (bytes.byteLength !== model.size || hashes(bytes).gitBlob !== model.gitSha) {
      bytes = undefined;
    }
  } catch {
    // 首次安装时尚无缓存。
  }
  if (!bytes) {
    const source = modelBase + model.name;
    const response = await fetch(source, { signal: AbortSignal.timeout(120000) });
    if (!response.ok) throw new Error("模型下载失败：" + model.name + " HTTP " + response.status);
    bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.byteLength !== model.size || hashes(bytes).gitBlob !== model.gitSha) {
      throw new Error("模型来源校验失败：" + model.name);
    }
    await writeFile(destination, bytes);
  }
  console.info("[plate-assets]", model.name, bytes.byteLength, "bytes", "SHA-256", hashes(bytes).sha256);
}

await mkdir(modelDir, { recursive: true });
await mkdir(wasmDir, { recursive: true });
for (const model of models) await prepareModel(model);

for (const name of ["ort-wasm-simd-threaded.mjs", "ort-wasm-simd-threaded.wasm"]) {
  const source = join(repoRoot, "node_modules", "onnxruntime-web", "dist", name);
  const destination = join(wasmDir, name);
  await copyFile(source, destination);
  const bytes = await readFile(destination);
  console.info("[plate-assets]", name, bytes.byteLength, "bytes", "SHA-256", hashes(bytes).sha256);
}
