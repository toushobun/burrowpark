import Box from "@mui/material/Box";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";

import { slotMapText } from "config/slotMapText";
import { HomeHeader } from "molecules/navigation/HomeHeader/HomeHeader";
import {
  legendCardSx,
  legendGridSx,
  mapCardSx,
} from "organisms/slots/ParkingSlotMap/parkingMapStyles";
import { PageShell } from "templates/layout/PageShell/PageShell";
import { designTokens } from "theme/designTokens";
import { slotStatuses } from "theme/slotStatusTokens";

export default function Loading() {
  return (
    <PageShell
      embedded
      appearance="home"
      title={slotMapText.title}
      headerContent={<HomeHeader hasReminders={false} />}
    >
      <Stack spacing={1.5} aria-busy="true">
        <Skeleton
          variant="rounded"
          height={designTokens.size.touchTargetMin}
          sx={{ borderRadius: `${designTokens.radius.full}px` }}
        />
        <Stack spacing={1} sx={mapCardSx}>
          <Skeleton variant="text" width="40%" />
          <Skeleton
            variant="rounded"
            sx={{ width: "100%", aspectRatio: "1470 / 1260", height: "auto" }}
          />
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <Skeleton
              variant="circular"
              width={designTokens.size.touchTargetMin}
              height={designTokens.size.touchTargetMin}
            />
            <Skeleton variant="rounded" sx={{ flex: 1 }} height={32} />
            <Skeleton
              variant="circular"
              width={designTokens.size.touchTargetMin}
              height={designTokens.size.touchTargetMin}
            />
          </Stack>
          <Stack spacing={0.5} sx={legendCardSx}>
            <Skeleton variant="text" width="30%" />
            <Box sx={legendGridSx}>
              {slotStatuses.map((status) => (
                <Skeleton
                  key={status}
                  variant="rounded"
                  height={35}
                  sx={{ borderRadius: `${designTokens.radius.full}px` }}
                />
              ))}
            </Box>
          </Stack>
        </Stack>
      </Stack>
    </PageShell>
  );
}
