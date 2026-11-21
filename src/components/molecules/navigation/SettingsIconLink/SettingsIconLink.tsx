"use client";

import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import IconButton from "@mui/material/IconButton";
import Link from "next/link";

import { designTokens } from "theme/designTokens";

export function SettingsIconLink() {
  return (
    <IconButton
      component={Link}
      href="/settings"
      aria-label="设置"
      sx={{
        minHeight: designTokens.size.touchTargetMin,
        minWidth: designTokens.size.touchTargetMin,
      }}
    >
      <SettingsOutlinedIcon />
    </IconButton>
  );
}
