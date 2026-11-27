"use client";

import Box from "@mui/material/Box";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

import { commonText } from "config/commonText";
import { designTokens } from "theme/designTokens";
import { PageShell } from "templates/layout/PageShell/PageShell";

type Props = {
  title?: string;
  rows?: number;
  rowColumns?: readonly number[];
  backHref?: string;
  embedded?: boolean;
};

/** 路由切换期间使用统一的页面标题与大块骨架。 */
export function PageSkeleton({
  title = commonText.loading,
  rows = 4,
  rowColumns,
  backHref,
  embedded,
}: Props) {
  return (
    <PageShell title={title} backHref={backHref} embedded={embedded}>
      <Stack spacing={3} aria-busy="true">
        <Typography component="h2" variant="h2">
          <Skeleton variant="text" width="55%" />
        </Typography>
        {rowColumns
          ? rowColumns.map((columns, index) => (
              <Box
                key={index}
                sx={{
                  display: "grid",
                  gap: 1,
                  gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                }}
              >
                {Array.from({ length: columns }, (_, column) => (
                  <Skeleton
                    key={column}
                    variant="rounded"
                    sx={{
                      borderRadius: designTokens.radius.md + "px",
                      height: designTokens.size.touchTargetMin,
                      width: "100%",
                    }}
                  />
                ))}
              </Box>
            ))
          : Array.from({ length: rows }, (_, index) => (
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
