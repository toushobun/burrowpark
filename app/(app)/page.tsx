import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

import { SlotStatusBadge } from "atoms/slots/SlotStatusBadge/SlotStatusBadge";
import { slotStatuses } from "theme/slotStatusTokens";
import { PageShell } from "templates/layout/PageShell/PageShell";

export default function HomePage() {
  return (
    <PageShell subtitle="家庭停车场管理" title="途泊属">
      <Stack spacing={2}>
        <Typography>工程框架已就绪，车位地图将在后续 Issue 中实现。</Typography>
        <Stack
          direction="row"
          spacing={1.5}
          sx={{ flexWrap: "wrap" }}
          useFlexGap
        >
          {slotStatuses.map((status) => (
            <SlotStatusBadge key={status} status={status} />
          ))}
        </Stack>
      </Stack>
    </PageShell>
  );
}
