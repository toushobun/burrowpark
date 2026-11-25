import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";

import { designTokens } from "theme/designTokens";

export default function Loading() {
  return (
    <Stack spacing={2} aria-busy="true">
      <Skeleton variant="text" width="40%" />
      {[0, 1, 2].map((index) => (
        <Skeleton
          key={index}
          variant="rounded"
          height={designTokens.size.touchTargetMin}
        />
      ))}
    </Stack>
  );
}
