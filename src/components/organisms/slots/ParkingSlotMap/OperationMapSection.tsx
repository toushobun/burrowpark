"use client";

import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { SlotStatusBadge } from "atoms/slots/SlotStatusBadge/SlotStatusBadge";
import { slotMapText } from "config/slotMapText";
import { slotStatusShortLabels } from "config/slotStatusText";
import type { SlotMapSlot } from "internal/parking";
import { SlotCardList } from "organisms/slots/SlotCardList/SlotCardList";
import { slotStatuses } from "theme/slotStatusTokens";
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
  const router = useRouter();
  const consumedUrlNotice = useRef<string | null>(null);
  const {
    notice: submittedNotice,
    sequence,
    showNotice,
    dismissNotice,
  } = useOperationFeedback();
  useEffect(() => {
    if (!notice || !queryId) return;
    const key = `${notice.kind}:${queryId}`;
    if (consumedUrlNotice.current === key) return;
    consumedUrlNotice.current = key;
    // URL 提示已经过服务端验证，转为一次性状态后清理历史记录中的参数。
    showNotice(notice);
    router.replace("/");
  }, [notice, queryId, router, showNotice]);
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
  // URL 提示转入 Provider 时保留 Toast 实例，避免重置撤销进度与倒计时。
  const toastSequence =
    notice && submittedNotice !== notice ? sequence + 1 : sequence;

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

  const highlightCode =
    undoneNotice !== visibleNotice ? visibleNotice?.code : undefined;

  return (
    <Box sx={{ pb: visibleNotice ? 24 : 0 }}>
      <Stack spacing={1}>
        <ParkingSlotMap highlightCode={highlightCode} slots={slots} />
        <SlotCardList highlightCode={highlightCode} slots={slots} />
        <Stack direction="row" spacing={0.5} useFlexGap sx={{ alignItems: "center", flexWrap: "wrap" }}>
          <Typography variant="body2">{slotMapText.legendTitle}：</Typography>
          {slotStatuses.map((status) => (
            <SlotStatusBadge key={status} status={status} label={status === "expiringSoon" ? "快到期" : status === "overdue" ? "已过期" : slotStatusShortLabels[status]} />
          ))}
        </Stack>
      </Stack>
      {visibleNotice && (
        <OperationToast
          key={`${visibleNotice.kind}:${visibleNotice.id}:${toastSequence}`}
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
