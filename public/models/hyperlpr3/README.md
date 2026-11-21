# HyperLPR3 模型来源与许可证

本项目直接将固定版本的两个 ONNX 模型提交到 `v1/`，不使用 Git LFS，`npm ci` / `postinstall` 不下载模型。`prebuild` 和 `prebuild-storybook` 仅校验文件 SHA-256 并从已安装的 `onnxruntime-web@1.23.2` 复制 WASM / MJS。浏览器运行时只访问本站的静态资源，不请求第三方 CDN。

| 文件（`v1/`）            |       字节 | SHA-256                                                            |
| ------------------------ | ---------: | ------------------------------------------------------------------ |
| `y5fu_320x_sim.onnx`     |  2,343,161 | `2a985dc63a5cc947ec36d18503d6fc0fd54525b9dba17f2fe29a71e86b44456d` |
| `rpv3_mdict_160_r3.onnx` | 10,258,843 | `8fb08b5db2adeccf43b05006bbbf409e4659d08d72e46a62631c00ff751eaeb3` |

## 来源与权利声明

- **原始项目：** [szad670401/HyperLPR](https://github.com/szad670401/HyperLPR)，HyperLPR3，Apache License 2.0。
- **当前模型取自镜像：** [lets-mica/mica-ai（固定提交 bcfcfa8）](https://github.com/lets-mica/mica-ai/tree/bcfcfa87dc48df273903d1b770f094c39a1ebab6/model-tools/plate/models)，镜像仓库的根 `LICENSE` 为 **Apache License 2.0**，根 `NOTICE` 对 `plate/models/*` 明确记载了上游 HyperLPR3 v20230229、上游地址与 Apache-2.0。
- 镜像子目录 [README](https://github.com/lets-mica/mica-ai/blob/bcfcfa87dc48df273903d1b770f094c39a1ebab6/model-tools/plate/README.md) 明确称这两个模型由 HyperLPR 官方 `20230229.zip` 解压后直接入库。**没有证据表明是另行训练的模型**；但我们未找到可独立对照 SHA-256 的官方 release 二进制，因此不能声称已经做过官方/镜像字节级一致性验证。
- 模型原始镜像路径：`model-tools/plate/models/y5fu_320x_sim.onnx` 和 `model-tools/plate/models/rpv3_mdict_160_r3.onnx`。
- 使用时请保留 Apache-2.0 授权及上述上游、镜像署名。本项目不修改模型权重。

两个模型及 `onnxruntime-web` 的运行时版本通过 URL `/models/hyperlpr3/v1/` 与 `/onnxruntime/1.23.2/` 固定；这些版本化静态资源使用一年的 immutable 缓存。未来升级权重或运行时时必须改版本目录，不能覆盖当前目录内容。
