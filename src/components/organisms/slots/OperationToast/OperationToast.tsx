"use client";

import CloseIcon from "@mui/icons-material/Close";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import IconButton from "@mui/material/IconButton";
import Snackbar from "@mui/material/Snackbar";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useRouter } from "next/navigation";
import { useActionState, useCallback, useEffect, useState } from "react";

import { operationText } from "config/operationText";
import { FailureFeedbackDialog } from "molecules/feedback/FailureFeedbackDialog/FailureFeedbackDialog";
import { designTokens } from "theme/designTokens";
import type { ActionState } from "types/actions";
import type { OperationNotice } from "utils/operationNotice";

export type UndoAction = (
  state: ActionState,
  data: FormData,
) => Promise<ActionState>;

export type OperationUndoActions = {
  checkin: UndoAction;
  reserve: UndoAction;
  lease: UndoAction;
  checkout: UndoAction;
  renew: UndoAction;
  cancel: UndoAction;
  extend: UndoAction;
  end: UndoAction;
};

const noopUndo: UndoAction = async () => ({});
const noticeDurationMs = 10_000;

const undoField = {
  checkin: "sessionId",
  reserve: "reservationId",
  lease: "leaseId",
  checkout: "sessionId",
  renew: "paymentId",
  cancel: "reservationId",
  extend: "sessionId",
  end: "leaseId",
  edit: null,
} as const;

type Props = {
  notice: OperationNotice;
  undoActions: OperationUndoActions;
  onUndone: () => void;
  onUndoStart?: () => void;
  onDismiss?: () => void;
  initialState?: ActionState;
};

export function OperationToast({
  notice,
  undoActions,
  onUndone,
  onUndoStart,
  onDismiss,
  initialState,
}: Props) {
  const router = useRouter();
  const [state, undo, pending] = useActionState(
    notice.kind === "edit" ? noopUndo : undoActions[notice.kind],
    initialState ?? {},
  );
  const [closed, setClosed] = useState(false);
  const field = undoField[notice.kind];

  useEffect(() => {
    if (state.success) onUndone();
  }, [onUndone, state.success]);

  const close = useCallback(() => {
    setClosed(true);
    onDismiss?.();
    router.replace("/");
  }, [onDismiss, router]);

  useEffect(() => {
    if (closed || pending) return;
    const timer = setTimeout(close, noticeDurationMs);
    return () => clearTimeout(timer);
  }, [close, closed, pending, state.success]);

  return (
    <>
      <Snackbar
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        open={!closed}
        sx={{
          bottom: (t) =>
            `calc(${t.spacing(2)} + env(safe-area-inset-bottom, 0px)) !important`,
          maxWidth: designTokens.size.contentMaxWidth,
          px: 2,
          width: "100%",
        }}
      >
        <Alert
          severity="success"
          variant="filled"
          sx={{
            alignItems: "center",
            borderRadius: (t) => t.shape.borderRadius + "px",
            fontSize: designTokens.typography.bodySize,
            width: "100%",
            "& .MuiAlert-action": { alignItems: "center", ml: 1, mr: 0, p: 0 },
            "& .MuiAlert-message": { minWidth: 0, overflowWrap: "anywhere" },
          }}
          action={
            <Stack direction="row" sx={{ alignItems: "center" }}>
              {!state.success && field && (
                <form action={undo} onSubmit={onUndoStart}>
                  <input name={field} type="hidden" value={notice.id} />
                  {notice.extraUndoFields?.map(({ name, value }) => (
                    <input key={name} type="hidden" name={name} value={value} />
                  ))}
                  <Button
                    color="inherit"
                    disabled={pending}
                    size="large"
                    sx={{
                      minHeight: designTokens.size.touchTargetMin,
                      minWidth: designTokens.size.touchTargetMin,
                    }}
                    type="submit"
                    variant="text"
                  >
                    {pending ? (
                      <CircularProgress color="inherit" size={24} />
                    ) : (
                      operationText.undo
                    )}
                  </Button>
                </form>
              )}
              <IconButton
                aria-label={operationText.close}
                color="inherit"
                onClick={close}
                sx={{
                  minHeight: designTokens.size.touchTargetMin,
                  minWidth: designTokens.size.touchTargetMin,
                }}
              >
                <CloseIcon />
              </IconButton>
            </Stack>
          }
        >
          <Stack spacing={0.5}>
            <Typography
              component="span"
              sx={{
                fontSize: designTokens.typography.bodySize,
                fontWeight: 700,
              }}
            >
              {state.success ? operationText.undone : notice.message}
            </Typography>
            {notice.kind === "checkin" &&
              notice.photoSaved === false &&
              !state.success && (
                <Typography
                  component="span"
                  sx={{ fontSize: designTokens.typography.bodySize }}
                >
                  {operationText.photoUploadFailed}
                </Typography>
              )}
          </Stack>
        </Alert>
      </Snackbar>
      <FailureFeedbackDialog state={state} />
    </>
  );
}
