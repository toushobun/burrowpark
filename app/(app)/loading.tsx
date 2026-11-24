import Box from "@mui/material/Box";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";

import { slotMapText } from "config/slotMapText";
import { HomeHeader } from "molecules/navigation/HomeHeader/HomeHeader";
import { HomeNavigation } from "molecules/navigation/HomeNavigation/HomeNavigation";
import { PageShell } from "templates/layout/PageShell/PageShell";
import { designTokens } from "theme/designTokens";

export default function Loading() {
  return (
    <PageShell
      title={slotMapText.title}
      headerContent={<HomeHeader hasReminders={false} />}
      footer={<HomeNavigation />}
    >
      <Stack spacing={1} aria-busy="true">
        <Skeleton
          variant="rounded"
          sx={{ width: "100%", aspectRatio: "1695 / 1329", height: "auto" }}
        />
        <Skeleton variant="text" width="60%" />
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: 1,
          }}
        >
          {Array.from({ length: 14 }, (_, index) => (
            <Skeleton
              key={index}
              variant="rounded"
              height={designTokens.size.touchTargetMin}
            />
          ))}
        </Box>
        <Skeleton variant="text" width="100%" />
      </Stack>
    </PageShell>
  );
}
