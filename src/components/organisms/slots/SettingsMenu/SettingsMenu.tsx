"use client";

import BarChartOutlined from "@mui/icons-material/BarChartOutlined";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import DirectionsCarOutlined from "@mui/icons-material/DirectionsCarOutlined";
import PaidOutlined from "@mui/icons-material/PaidOutlined";
import ReceiptLongOutlined from "@mui/icons-material/ReceiptLongOutlined";
import ListItemButton from "@mui/material/ListItemButton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Link from "next/link";

import { slotSettingsText } from "config/slotSettingsText";
import { designTokens } from "theme/designTokens";

const entries = [
  {
    href: "/settings/slots",
    label: slotSettingsText.slots,
    Icon: DirectionsCarOutlined,
  },
  {
    href: "/settings/pricing",
    label: slotSettingsText.pricing,
    Icon: PaidOutlined,
  },
  {
    href: "/stats",
    label: slotSettingsText.monthlyStats,
    Icon: BarChartOutlined,
  },
  {
    href: "/records",
    label: slotSettingsText.records,
    Icon: ReceiptLongOutlined,
  },
];

export function SettingsMenu() {
  return (
    <Stack spacing={1.5}>
      {entries.map(({ href, label, Icon }) => (
        <ListItemButton
          key={href}
          component={Link}
          href={href}
          sx={{
            bgcolor: "background.paper",
            border: 1,
            borderColor: designTokens.color.border.subtle,
            borderRadius: `${designTokens.radius.lg}px`,
            minHeight: (theme) => theme.spacing(8),
            gap: 2,
            px: 2,
            "&.Mui-focusVisible": {
              outline: "2px solid",
              outlineColor: "primary.main",
            },
          }}
        >
          <Icon color="primary" />
          <Typography variant="body1" sx={{ flex: 1 }}>
            {label}
          </Typography>
          <ChevronRightIcon />
        </ListItemButton>
      ))}
    </Stack>
  );
}
