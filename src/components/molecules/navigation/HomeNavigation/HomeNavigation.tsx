"use client";

import DirectionsCarOutlinedIcon from "@mui/icons-material/DirectionsCarOutlined";
import AssignmentOutlinedIcon from "@mui/icons-material/AssignmentOutlined";
import PersonOutlinedIcon from "@mui/icons-material/PersonOutlined";
import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { slotMapText } from "config/slotMapText";
import { designTokens } from "theme/designTokens";

const destinations = [
  { key: "slots", href: "/", icon: DirectionsCarOutlinedIcon },
  { key: "reminders", href: "/reminders", icon: AssignmentOutlinedIcon },
  { key: "profile", href: "/settings", icon: PersonOutlinedIcon },
] as const;

export function HomeNavigation() {
  const pathname = usePathname();
  return (
    <Box
      component="nav"
      aria-label="主导航"
      sx={{
        display: "grid",
        gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
        gap: 0.5,
      }}
    >
      {destinations.map(({ key, href, icon: Icon }) => {
        const current = pathname === href;
        return (
          <ButtonBase
            key={key}
            component={Link}
            href={href}
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
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {slotMapText[key]}
            </Typography>
          </ButtonBase>
        );
      })}
    </Box>
  );
}
