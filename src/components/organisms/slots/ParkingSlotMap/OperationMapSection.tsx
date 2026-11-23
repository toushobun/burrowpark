"use client";

import Box from "@mui/material/Box";
import { useCallback, useState } from "react";

import type { SlotMapSlot } from "internal/parking";
import {
  OperationToast,
  type OperationUndoActions,
} from "organisms/slots/OperationToast/OperationToast";
import type { OperationNotice } from "utils/operationNotice";

import { ParkingSlotMap } from "./ParkingSlotMap";

type Props = {
  slots: SlotMapSlot[];
  notice: OperationNotice | null;
  queryId?: string | null;
  undoActions: OperationUndoActions;
};

export function OperationMapSection({
  slots,
  notice,
  queryId,
  undoActions,
}: Props) {
  const [retainedNotice, setRetainedNotice] = useState<OperationNotice | null>(
    null,
  );
  const [pendingUndoId, setPendingUndoId] = useState<string | null>(null);
  const [undoneId, setUndoneId] = useState<string | null>(null);
  // 撤销会刷新服务端记录：保留原提示到撤销完成后 3 秒。
  const visibleNotice =
    notice ??
    (retainedNotice?.id === pendingUndoId && pendingUndoId === queryId
      ? retainedNotice
      : null);

  const onUndoStart = useCallback(() => {
    if (!visibleNotice) return;
    setRetainedNotice(visibleNotice);
    setPendingUndoId(visibleNotice.id);
  }, [visibleNotice]);
  const onUndone = useCallback(() => {
    setUndoneId(visibleNotice?.id ?? null);
  }, [visibleNotice?.id]);
  const onDismiss = useCallback(() => {
    setRetainedNotice(null);
    setPendingUndoId(null);
  }, []);

  return (
    <Box sx={{ pb: visibleNotice ? 24 : 0 }}>
      <ParkingSlotMap
        highlightCode={
          undoneId !== visibleNotice?.id ? visibleNotice?.code : undefined
        }
        slots={slots}
      />
      {visibleNotice && (
        <OperationToast
          key={visibleNotice.kind + ":" + visibleNotice.id}
          notice={visibleNotice}
          onDismiss={onDismiss}
          onUndoStart={onUndoStart}
          onUndone={onUndone}
          undoActions={undoActions}
        />
      )}
    </Box>
  );
}
