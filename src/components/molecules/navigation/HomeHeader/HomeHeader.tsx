"use client";

import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";
import Badge from "@mui/material/Badge";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Link from "next/link";

import { slotMapText } from "config/slotMapText";
import { designTokens } from "theme/designTokens";

export function HomeHeader({ hasReminders }: { hasReminders: boolean }) {
  return (
    <Stack id="top" direction="row" spacing={1} sx={{ alignItems: "center" }}>
      <Box
        component="img"
        alt=""
        src="/icons/icon-192.png"
        sx={{
          width: designTokens.size.touchTargetMin,
          height: designTokens.size.touchTargetMin,
          borderRadius: designTokens.radius.md + "px",
        }}
      />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography component="h1" variant="h1">
          {slotMapText.title}
        </Typography>
        <Typography variant="body2">{slotMapText.subtitle}</Typography>
      </Box>
      <IconButton
        component={Link}
        href="/reminders"
        aria-label={slotMapText.reminders}
        sx={{ bgcolor: "background.paper", boxShadow: 1 }}
      >
        <Badge color="error" variant="dot" invisible={!hasReminders}>
          <NotificationsNoneIcon />
        </Badge>
      </IconButton>
    </Stack>
  );
}
