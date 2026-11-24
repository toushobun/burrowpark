import Stack from "@mui/material/Stack";
import type { ReactNode } from "react";

import { HomeNavigation } from "molecules/navigation/HomeNavigation/HomeNavigation";
import { PageFooter } from "templates/layout/PageShell/PageShell";
import { designTokens } from "theme/designTokens";

export default function MainNavigationLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <Stack
      sx={{
        minHeight: "100dvh",
        maxWidth: designTokens.size.contentMaxWidth,
        mx: "auto",
      }}
    >
      {children}
      <PageFooter>
        <HomeNavigation />
      </PageFooter>
    </Stack>
  );
}
