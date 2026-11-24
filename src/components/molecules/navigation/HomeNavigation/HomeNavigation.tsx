"use client";

import DirectionsCarOutlinedIcon from "@mui/icons-material/DirectionsCarOutlined";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import AssignmentOutlinedIcon from "@mui/icons-material/AssignmentOutlined";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { useSyncExternalStore } from "react";

import { slotMapText } from "config/slotMapText";
import { designTokens } from "theme/designTokens";

const destinations = [
  { key: "home", href: "/", icon: HomeOutlinedIcon },
  { key: "slots", href: "/#slot-list", icon: DirectionsCarOutlinedIcon },
  { key: "reminders", href: "/reminders", icon: AssignmentOutlinedIcon },
  { key: "profile", href: "/settings", icon: PersonOutlineIcon },
] as const;

function subscribe(callback: () => void) {
  window.addEventListener("hashchange", callback);
  return () => window.removeEventListener("hashchange", callback);
}

export function HomeNavigation({
  active = "home",
}: {
  active?: "home" | "reminders" | "profile";
}) {
  const hash = useSyncExternalStore(subscribe, () => window.location.hash, () => "");
  const selected = active === "home" && hash === "#slot-list" ? "slots" : active;
  return (
    <Box component="nav" aria-label="主导航" sx={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 0.5 }}>
      {destinations.map(({ key, href, icon: Icon }) => {
        const current = key === selected;
        const local = active === "home" && (key === "home" || key === "slots");
        return (
          <ButtonBase
            key={key}
            component={local ? "a" : Link}
            href={local ? key === "home" ? "#top" : "#slot-list" : href}
            aria-current={current ? "page" : undefined}
            sx={{
              bgcolor: current ? "primary.light" : "transparent",
              color: "primary.dark",
              borderRadius: designTokens.radius.lg + "px",
              flexDirection: "column",
              minHeight: designTokens.size.touchTargetMin,
            }}
          >
            <Icon />
            <Typography variant="body2" sx={{ fontWeight: 700 }}>{slotMapText[key]}</Typography>
          </ButtonBase>
        );
      })}
    </Box>
  );
}
