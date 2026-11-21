# HyperLPR3 自托管模型

安装依赖时运行 `scripts/prepare-plate-assets.mjs`，自动将两个锁定版本的 ONNX 模型放在本目录。
模型只在构建/安装时从固定的公开 GitHub commit 下载，运行时浏览器只访问本站 `/models/hyperlpr3/`，绝不从第三方 CDN 获取模型。

来源：HyperLPR3（Apache-2.0）。

- 检测：`https://github.com/lets-mica/mica-ai/blob/bcfcfa87dc48df273903d1b770f094c39a1ebab6/model-tools/plate/models/y5fu_320x_sim.onnx`，2,343,161 字节，Git Blob SHA-1 `e1094ba850557424ea87ad998758e6eee9e5f160`。
- 识别：`https://github.com/lets-mica/mica-ai/blob/bcfcfa87dc48df273903d1b770f094c39a1ebab6/model-tools/plate/models/rpv3_mdict_160_r3.onnx`，10,258,843 字节，Git Blob SHA-1 `474906430474ee3ddade0cf95461f3051ed35199`。

SHA-256 由脚本对真实二进制文件计算并打印在 npm install/CI 日志中。这里的 Git Blob SHA-1 与 SHA-256 不可互换。
