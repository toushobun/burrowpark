"use client";

import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

import { authMessages } from "internal/auth";
import { PageShell } from "templates/layout/PageShell/PageShell";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <PageShell title={authMessages.title}>
      <Stack spacing={3}>
        <Typography variant="h2">{authMessages.unavailable}</Typography>
        <Button fullWidth onClick={reset} size="large" variant="contained">
          {authMessages.retry}
        </Button>
      </Stack>
    </PageShell>
  );
}
