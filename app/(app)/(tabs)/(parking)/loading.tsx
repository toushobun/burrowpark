import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";

import { slotMapText } from "config/slotMapText";
import { HomeHeader } from "molecules/navigation/HomeHeader/HomeHeader";
import { SlotCardListSkeleton } from "organisms/slots/SlotCardList/SlotCardList";
import { PageShell } from "templates/layout/PageShell/PageShell";

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
          sx={{ width: "100%", aspectRatio: "1695 / 1329", height: "auto" }}
        />
        <SlotCardListSkeleton />
        <Skeleton variant="text" width="100%" />
      </Stack>
    </PageShell>
  );
}
