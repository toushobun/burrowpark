"use client";

import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

import { commonText } from "config/commonText";
import { designTokens } from "theme/designTokens";
import { PageShell } from "templates/layout/PageShell/PageShell";

type Props = {
  title?: string;
  rows?: number;
  backHref?: string;
};

/** 路由切换期间使用统一的页面标题与大块骨架。 */
export function PageSkeleton({
  title = commonText.loading,
  rows = 4,
  backHref,
}: Props) {
  return (
    <PageShell title={title} backHref={backHref}>
      <Stack spacing={3} aria-busy="true">
        <Typography component="h2" variant="h2">
          <Skeleton variant="text" width="55%" />
        </Typography>
        {Array.from({ length: rows }, (_, index) => (
          <Skeleton
            key={index}
            variant="rounded"
            sx={{
              borderRadius: designTokens.radius.md + "px",
              height:
                index === 0
                  ? designTokens.size.primaryActionHeight
                  : designTokens.size.touchTargetMin,
              width: "100%",
            }}
          />
        ))}
      </Stack>
    </PageShell>
  );
}
