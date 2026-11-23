"use client";

import Box from "@mui/material/Box";
import { useCallback, useState } from "react";

import type { SlotMapSlot } from "internal/parking";
import { useOperationFeedback } from "providers/OperationFeedbackProvider";
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
  const {
    notice: submittedNotice,
    sequence,
    dismissNotice,
  } = useOperationFeedback();
  const [retainedNotice, setRetainedNotice] = useState<OperationNotice | null>(
    null,
  );
  const [pendingUndoId, setPendingUndoId] = useState<string | null>(null);
  const [undoneNotice, setUndoneNotice] = useState<OperationNotice | null>(
    null,
  );
  // 撤销刷新后必须优先保留当前结果，避免此前跨页面保存的提示覆盖它。
  const retainedUndoNotice =
    retainedNotice?.id === pendingUndoId && pendingUndoId === queryId
      ? retainedNotice
      : null;
  const visibleNotice = notice ?? retainedUndoNotice ?? submittedNotice;

  const onUndoStart = useCallback(() => {
    if (!visibleNotice) return;
    setRetainedNotice(visibleNotice);
    setPendingUndoId(visibleNotice.id);
  }, [visibleNotice]);
  const onUndone = useCallback(() => {
    setUndoneNotice(visibleNotice ?? null);
  }, [visibleNotice]);
  const onDismiss = useCallback(() => {
    setRetainedNotice(null);
    setPendingUndoId(null);
    dismissNotice();
  }, [dismissNotice]);

  return (
    <Box sx={{ pb: visibleNotice ? 24 : 0 }}>
      <ParkingSlotMap
        highlightCode={
          undoneNotice !== visibleNotice ? visibleNotice?.code : undefined
        }
        slots={slots}
      />
      {visibleNotice && (
        <OperationToast
          key={`${visibleNotice.kind}:${visibleNotice.id}:${sequence}`}
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
