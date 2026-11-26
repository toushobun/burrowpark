import Paper from "@mui/material/Paper";
import type { ReactNode } from "react";

import { designTokens } from "theme/designTokens";

export function InfoCard({ children }: { children: ReactNode }) {
  return (
    <Paper
      variant="outlined"
      sx={{
        bgcolor: "background.paper",
        borderColor: designTokens.color.border.subtle,
        borderRadius: `${designTokens.radius.lg}px`,
        p: 2,
      }}
    >
      {children}
    </Paper>
  );
}
