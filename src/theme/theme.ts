import { createTheme } from "@mui/material/styles";

import { designTokens } from "./designTokens";

const { color, radius, size, typography } = designTokens;

export const theme = createTheme({
  palette: {
    mode: "light",
    background: {
      default: color.background.app,
      paper: color.background.paper,
    },
    divider: color.border.subtle,
    primary: {
      contrastText: "#FFFFFF",
      dark: color.brand.dark,
      light: color.brand.light,
      main: color.brand.main,
    },
    text: {
      primary: color.text.primary,
      secondary: color.text.secondary,
    },
  },
  shape: {
    borderRadius: radius.md,
  },
  typography: {
    fontFamily: typography.fontFamily,
    fontSize: typography.bodySize,
    h1: { fontSize: "1.75rem", fontWeight: 900, lineHeight: 1.3 },
    h2: { fontSize: "1.5rem", fontWeight: 900, lineHeight: 1.3 },
    h3: { fontSize: "1.375rem", fontWeight: 700, lineHeight: 1.35 },
    h4: { fontSize: "1.25rem", fontWeight: 700, lineHeight: 1.35 },
    h5: { fontSize: "1.25rem", fontWeight: 700, lineHeight: 1.35 },
    h6: { fontSize: "1.125rem", fontWeight: 700, lineHeight: 1.4 },
    subtitle1: { fontSize: "1.125rem", fontWeight: 600, lineHeight: 1.5 },
    subtitle2: { fontSize: "1rem", fontWeight: 600, lineHeight: 1.5 },
    body1: { fontSize: "1.125rem", lineHeight: 1.6 },
    body2: { fontSize: "1rem", lineHeight: 1.6 },
    caption: { fontSize: "1rem", lineHeight: 1.5 },
    overline: { fontSize: "1rem", lineHeight: 1.5 },
    button: { fontSize: "1.25rem", fontWeight: 700, textTransform: "none" },
  },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          borderRadius: radius.lg,
          minHeight: size.touchTargetMin,
          paddingInline: 20,
        },
        sizeLarge: { minHeight: size.primaryActionHeight },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: { minHeight: size.touchTargetMin, minWidth: size.touchTargetMin },
      },
    },
  },
});
