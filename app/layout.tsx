import "./globals.css";

import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import { AppProviders } from "providers/AppProviders";
import { designTokens } from "theme/designTokens";

export const metadata: Metadata = {
  applicationName: "途泊属",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "途泊属",
  },
  description: "途泊属 家庭停车场管理工具",
  formatDetection: {
    telephone: false,
  },
  icons: {
    apple: "/apple-touch-icon.png",
  },
  title: "途泊属",
};

export const viewport: Viewport = {
  colorScheme: "light",
  initialScale: 1,
  themeColor: designTokens.color.background.app,
  viewportFit: "cover",
  width: "device-width",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <AppRouterCacheProvider>
          <AppProviders>{children}</AppProviders>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
