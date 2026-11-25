import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";

import { slotMapText } from "config/slotMapText";
import { HomeHeader } from "molecules/navigation/HomeHeader/HomeHeader";
import { PageShell } from "templates/layout/PageShell/PageShell";
import { designTokens } from "theme/designTokens";

export default function Loading() {
  return (
    <PageShell
      embedded
      title={slotMapText.title}
      headerContent={<HomeHeader hasReminders={false} />}
    >
      <Stack spacing={1} aria-busy="true">
        <Skeleton
          variant="rounded"
          height={designTokens.size.touchTargetMin}
          sx={{ borderRadius: `${designTokens.radius.full}px` }}
        />
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
        <Skeleton variant="text" width="100%" />
        <Skeleton variant="text" width="100%" />
      </Stack>
    </PageShell>
  );
}
