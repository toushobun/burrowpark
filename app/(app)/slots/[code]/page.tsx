import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { notFound } from "next/navigation";

import { slotLayout } from "config/slotLayout";
import { slotMapText } from "config/slotMapText";
import { PageShell } from "templates/layout/PageShell/PageShell";

export default async function SlotDetailPlaceholder({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  if (!slotLayout.slots.some((slot) => slot.code === code)) {
    notFound();
  }

  return (
    <PageShell title={code + "号"}>
      <Stack spacing={3}>
        <Typography variant="body1">{slotMapText.detailPending}</Typography>
        <Button component={Link} href="/" size="large" variant="contained">
          {slotMapText.backHome}
        </Button>
      </Stack>
    </PageShell>
  );
}
