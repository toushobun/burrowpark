"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Link from "next/link";

import type { ReactNode } from "react";

import { commonText } from "config/commonText";
import { designTokens } from "theme/designTokens";

type PageShellProps = {
  title: string;
  /** 标题下方的辅助信息，例如日期。 */
  subtitle?: string;
  /** 固定在页面底部的主操作区，例如「车进来」按钮。 */
  footer?: ReactNode;
  headerAction?: ReactNode;
  headerContent?: ReactNode;
  embedded?: boolean;
  appearance?: "home" | "default";
  backHref?: string;
  children: ReactNode;
};

/** 手机端页面的统一骨架：顶部标题、可滚动内容区、底部主操作区。 */
export function PageShell({
  title,
  subtitle,
  footer,
  headerAction,
  headerContent,
  embedded = false,
  appearance = "default",
  backHref,
  children,
}: PageShellProps) {
  return (
    <Stack
      sx={{
        bgcolor: "background.default",
        backgroundImage:
          appearance === "home"
            ? `radial-gradient(ellipse at top right, ${designTokens.color.background.subtle}, transparent 45%)`
            : undefined,
        maxWidth: designTokens.size.contentMaxWidth,
        minHeight: embedded ? undefined : "100dvh",
        flex: embedded ? 1 : undefined,
        width: "100%",
        mx: "auto",
      }}
    >
      <Box
        component="header"
        sx={{
          pb: 1.5,
          pt: (t) => `calc(${t.spacing(2)} + env(safe-area-inset-top, 0px))`,
          px: 2,
        }}
      >
        {headerContent ?? (
          <>
            <Stack
              direction="row"
              spacing={1}
              sx={{ alignItems: "center", justifyContent: "space-between" }}
            >
              <Typography component="h1" variant="h1">
                {title}
              </Typography>
              {headerAction}
            </Stack>
            {subtitle && (
              <Typography color="textSecondary" variant="body1">
                {subtitle}
              </Typography>
            )}
          </>
        )}
      </Box>
      <Box
        component="main"
        sx={{
          flex: 1,
          pb: (t) => `calc(${t.spacing(4)} + env(safe-area-inset-bottom, 0px))`,
          px: 2,
        }}
      >
        {children}
      </Box>
      {(footer || backHref) && (
        <PageFooter>
          {footer}
          {backHref && (
            <Button
              component={Link}
              fullWidth
              href={backHref}
              size="large"
              sx={{ minHeight: designTokens.size.touchTargetMin }}
              variant="outlined"
            >
              {commonText.back}
            </Button>
          )}
        </PageFooter>
      )}
    </Stack>
  );
}

/** 主导航和业务返回操作共用底部安全区与定位。 */
export function PageFooter({ children }: { children: ReactNode }) {
  return (
    <Box
      component="footer"
      sx={{
        bgcolor: "background.default",
        bottom: 0,
        pb: (t) => `calc(${t.spacing(2)} + env(safe-area-inset-bottom, 0px))`,
        position: "sticky",
        pt: 1,
        px: 2,
        zIndex: 1,
      }}
    >
      <Stack spacing={2}>{children}</Stack>
    </Box>
  );
}
