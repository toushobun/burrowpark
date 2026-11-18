"use client";

import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

import { commonText } from "config/commonText";
import { sharedErrorMessages } from "internal/shared/errors/sharedErrorMessages";
import { PageShell } from "templates/layout/PageShell/PageShell";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <PageShell title={commonText.appName}>
      <Stack spacing={3}>
        <Typography variant="h2">
          {sharedErrorMessages.authUnavailable}
        </Typography>
        <Button fullWidth onClick={reset} size="large" variant="contained">
          {commonText.retry}
        </Button>
      </Stack>
    </PageShell>
  );
}
