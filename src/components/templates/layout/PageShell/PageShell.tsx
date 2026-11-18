import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";

type PageShellProps = {
  title: string;
  /** 标题下方的辅助信息，例如日期。 */
  subtitle?: string;
  /** 固定在页面底部的主操作区，例如「车进来」按钮。 */
  footer?: ReactNode;
  children: ReactNode;
};

/** 手机端页面的统一骨架：顶部标题、可滚动内容区、底部主操作区。 */
export function PageShell({
  title,
  subtitle,
  footer,
  children,
}: PageShellProps) {
  return (
    <Stack
      sx={{
        bgcolor: "background.default",
        maxWidth: 480,
        minHeight: "100dvh",
        mx: "auto",
      }}
    >
      <Box component="header" sx={{ pb: 1.5, pt: 2, px: 2 }}>
        <Typography component="h1" variant="h1">
          {title}
        </Typography>
        {subtitle && (
          <Typography color="textSecondary" variant="body1">
            {subtitle}
          </Typography>
        )}
      </Box>
      <Box component="main" sx={{ flex: 1, px: 2 }}>
        {children}
      </Box>
      {footer && (
        <Box
          component="footer"
          sx={{
            bgcolor: "background.default",
            bottom: 0,
            pb: "calc(16px + env(safe-area-inset-bottom, 0px))",
            position: "sticky",
            pt: 1,
            px: 2,
          }}
        >
          {footer}
        </Box>
      )}
    </Stack>
  );
}
