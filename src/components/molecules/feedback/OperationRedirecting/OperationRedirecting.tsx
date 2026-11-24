"use client";

import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

import { operationText } from "config/operationText";

export function OperationRedirecting() {
  return (
    <Stack spacing={2} sx={{ alignItems: "center" }}>
      <CircularProgress aria-label={operationText.returning} />
      <Typography variant="h2">{operationText.returning}</Typography>
    </Stack>
  );
}
