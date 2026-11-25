"use client";

import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";
import Badge from "@mui/material/Badge";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Link from "next/link";

import { slotMapText } from "config/slotMapText";
import { designTokens } from "theme/designTokens";

export function HomeHeader({ hasReminders }: { hasReminders: boolean }) {
  return (
    <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", py: 0.5 }}>
      <Box component="h1" sx={{ flex: 1, minWidth: 0, m: 0 }}>
        <Box
          component="img"
          alt={slotMapText.title + " · " + slotMapText.subtitle}
          src="/icons/brand-logo.png"
          width={800}
          height={259}
          sx={{ display: "block", width: "100%", height: "auto" }}
        />
      </Box>
      <IconButton
        component={Link}
        href="/reminders"
        aria-label={slotMapText.reminders}
        sx={{
          bgcolor: "background.paper",
          boxShadow: 1,
          border: 1,
          borderColor: "divider",
          color: "primary.dark",
          flexShrink: 0,
          width: designTokens.size.touchTargetMin,
          height: designTokens.size.touchTargetMin,
        }}
      >
        <Badge color="error" variant="dot" invisible={!hasReminders}>
          <NotificationsNoneIcon fontSize="large" />
        </Badge>
      </IconButton>
    </Stack>
  );
}
