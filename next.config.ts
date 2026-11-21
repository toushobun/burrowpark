import type { NextConfig } from "next";

const immutableHeader = {
  key: "Cache-Control",
  value: "public, max-age=31536000, immutable",
};

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/models/hyperlpr3/v1/:path*",
        headers: [immutableHeader],
      },
      {
        source: "/onnxruntime/1.23.2/:path*",
        headers: [immutableHeader],
      },
    ];
  },
  experimental: {
    serverActions: { bodySizeLimit: "3mb" },
  },
  turbopack: {
    // 本地开发时显式指定 root，减少自动探测带来的卡顿。
    root: process.cwd(),
  },
};

export default nextConfig;
