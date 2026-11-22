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
  querySessionId?: string | null;
  undoAction: (state: ActionState, data: FormData) => Promise<ActionState>;
};

export function CheckInMapSection({
  slots,
  notice,
  querySessionId,
  undoAction,
}: Props) {
  const [retainedNotice, setRetainedNotice] = useState<CheckInNotice | null>(
    null,
  );
  const [pendingUndoSessionId, setPendingUndoSessionId] = useState<
    string | null
  >(null);
  const [undoneSessionId, setUndoneSessionId] = useState<string | null>(null);
  // 撤销的 Server Action 会刷新首页：保留本次提示，直到 3 秒提示结束。
  const visibleNotice =
    notice ??
    (retainedNotice?.sessionId === pendingUndoSessionId &&
    pendingUndoSessionId === querySessionId
      ? retainedNotice
      : null);

  const onUndoStart = useCallback(() => {
    if (!visibleNotice) return;
    setRetainedNotice(visibleNotice);
    setPendingUndoSessionId(visibleNotice.sessionId);
  }, [visibleNotice]);
  const onUndone = useCallback(() => {
    setUndoneSessionId(visibleNotice?.sessionId ?? null);
  }, [visibleNotice?.sessionId]);
  const onDismiss = useCallback(() => {
    setRetainedNotice(null);
    setPendingUndoSessionId(null);
  }, []);

  return (
    <Box sx={{ pb: visibleNotice ? 24 : 0 }}>
      <ParkingSlotMap
        highlightCode={
          undoneSessionId !== visibleNotice?.sessionId
            ? visibleNotice?.code
            : undefined
        }
        slots={slots}
      />
      {visibleNotice && (
        <CheckInToast
          key={visibleNotice.sessionId}
          notice={visibleNotice}
          onDismiss={onDismiss}
          onUndoStart={onUndoStart}
          onUndone={onUndone}
          undoAction={undoAction}
        />
      )}
    </Box>
  );
}
