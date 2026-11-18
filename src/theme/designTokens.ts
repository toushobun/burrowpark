/**
 * 途泊属的设计 token。主要用户是不熟悉手机操作的长辈，
 * 因此字号、点击区域都比常规移动端规范大一档。
 */
export const designTokens = {
  color: {
    background: {
      app: "#FBF7F0",
      paper: "#FFFFFF",
      subtle: "#EFE4D2",
    },
    border: {
      subtle: "#E4D8C6",
      strong: "#CDBFAE",
    },
    brand: {
      main: "#7A4A1E",
      dark: "#5C3614",
      light: "#F1D9B5",
    },
    text: {
      primary: "#2A2118",
      secondary: "#4A3F35",
    },
  },
  size: {
    // 长辈用户的最小点击区域，高于 WCAG 推荐的 44px。
    touchTargetMin: 56,
    primaryActionHeight: 68,
  },
  radius: {
    sm: 10,
    md: 14,
    lg: 18,
    full: 999,
  },
  typography: {
    fontFamily:
      '"Noto Sans SC", "PingFang SC", "Microsoft YaHei", system-ui, sans-serif',
    // 正文基准字号（px）。不得低于 18。
    bodySize: 18,
    // 任何场景允许的最小字号（px），包括注释、图例。
    minSize: 14,
  },
} as const;
