"use client";

import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Link from "next/link";

import { slotSettingsText } from "config/slotSettingsText";
import { designTokens } from "theme/designTokens";

export function SettingsMenu() {
  return (
    <List>
      <ListItemButton
        component={Link}
        href="/settings/slots"
        sx={{ minHeight: designTokens.size.touchTargetMin }}
      >
        <ListItemText primary={slotSettingsText.slots} />
        <ChevronRightIcon />
      </ListItemButton>
    </List>
  );
}
