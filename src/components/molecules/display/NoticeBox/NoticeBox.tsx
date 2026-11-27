import EventOutlined from "@mui/icons-material/EventOutlined";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";

import { designTokens } from "theme/designTokens";

export function NoticeBox({
  title,
  children,
}: {
  title?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Stack
      direction="row"
      spacing={1}
      sx={{
        alignItems: "flex-start",
        bgcolor: designTokens.color.background.subtle,
        borderRadius: `${designTokens.radius.md}px`,
        p: 1.5,
      }}
    >
      <EventOutlined color="primary" />
      <Stack spacing={0.5} sx={{ minWidth: 0 }}>
        {title && (
          <Typography variant="body1" sx={{ fontWeight: 700 }}>
            {title}
          </Typography>
        )}
        <Typography variant="body1">{children}</Typography>
      </Stack>
    </Stack>
  );
}
