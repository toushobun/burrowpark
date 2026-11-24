import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";

import { slotMapText } from "config/slotMapText";
import { HomeHeader } from "molecules/navigation/HomeHeader/HomeHeader";
import { PageShell } from "templates/layout/PageShell/PageShell";

export default function Loading() {
  return (
    <PageShell
      embedded
      title={slotMapText.title}
      headerContent={<HomeHeader hasReminders={false} />}
    >
      <Stack spacing={1} aria-busy="true">
        <Skeleton variant="text" width="40%" />
        <Skeleton
          variant="rounded"
          sx={{ width: "100%", aspectRatio: "1470 / 1260", height: "auto" }}
        />
        <Skeleton variant="text" width="30%" sx={{ alignSelf: "center" }} />
        <Skeleton variant="text" width="100%" />
        <Skeleton variant="text" width="100%" />
      </Stack>
    </PageShell>
  );
}
