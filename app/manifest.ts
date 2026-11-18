import type { MetadataRoute } from "next";

import { designTokens } from "theme/designTokens";

export default function manifest(): MetadataRoute.Manifest {
  return {
    background_color: designTokens.color.background.app,
    description: "途泊属 家庭停车场管理工具",
    display: "standalone",
    icons: [
      { sizes: "192x192", src: "/icons/icon-192.png", type: "image/png" },
      { sizes: "512x512", src: "/icons/icon-512.png", type: "image/png" },
      {
        purpose: "maskable",
        sizes: "512x512",
        src: "/icons/icon-512.png",
        type: "image/png",
      },
    ],
    lang: "zh-CN",
    name: "途泊属 BurrowPark",
    orientation: "portrait",
    scope: "/",
    short_name: "途泊属",
    start_url: "/",
    theme_color: designTokens.color.background.app,
  };
}
