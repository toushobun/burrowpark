"use client";

import Box from "@mui/material/Box";
import { useCallback, useState } from "react";

import type { SlotMapSlot } from "internal/parking";
import {
  CheckInToast,
  type CheckInNotice,
} from "organisms/parkingSessions/CheckInToast/CheckInToast";
import type { ActionState } from "types/actions";

import { ParkingSlotMap } from "./ParkingSlotMap";

type Props = {
  slots: SlotMapSlot[];
  notice: CheckInNotice | null;
  undoAction: (state: ActionState, data: FormData) => Promise<ActionState>;
};

export function CheckInMapSection({ slots, notice, undoAction }: Props) {
  const [undoneSessionId, setUndoneSessionId] = useState<string | null>(null);
  const onUndone = useCallback(() => {
    setUndoneSessionId(notice?.sessionId ?? null);
  }, [notice?.sessionId]);

  return (
    <Box sx={{ pb: notice ? 24 : 0 }}>
      <ParkingSlotMap
        highlightCode={
          undoneSessionId !== notice?.sessionId ? notice?.code : undefined
        }
        slots={slots}
      />
      {notice && (
        <CheckInToast
          key={notice.sessionId}
          notice={notice}
          onUndone={onUndone}
          undoAction={undoAction}
        />
      )}
    </Box>
  );
}
