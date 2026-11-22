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
import { useActionState, useEffect, useState } from "react";

import { checkInText } from "config/checkInText";
import { formatPlateForDisplay } from "internal/parking";
import { FailureFeedbackDialog } from "molecules/feedback/FailureFeedbackDialog/FailureFeedbackDialog";
import { designTokens } from "theme/designTokens";
import type { ActionState } from "types/actions";

export type CheckInNotice = {
  code: string;
  sessionId: string;
  plate: string;
  slotName: string;
  photoSaved: boolean;
};

type Props = {
  notice: CheckInNotice;
  undoAction: (state: ActionState, data: FormData) => Promise<ActionState>;
  onUndone: () => void;
  initialState?: ActionState;
};

export function CheckInToast({
  notice,
  undoAction,
  onUndone,
  initialState,
}: Props) {
  const router = useRouter();
  const [state, undo, pending] = useActionState(undoAction, initialState ?? {});
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    if (!state.success) return;
    onUndone();
    const timer = setTimeout(() => router.replace("/"), 3000);
    return () => clearTimeout(timer);
  }, [onUndone, router, state.success]);

  const close = () => {
    setClosed(true);
    router.replace("/");
  };

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
          }}
          action={
            <Stack direction="row" sx={{ alignItems: "center" }}>
              {!state.success && (
                <form action={undo}>
                  <input
                    name="sessionId"
                    type="hidden"
                    value={notice.sessionId}
                  />
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
                      checkInText.undo
                    )}
                  </Button>
                </form>
              )}
              <IconButton
                aria-label={checkInText.close}
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
              {state.success
                ? checkInText.undone
                : checkInText.toastSuccess(
                    notice.slotName,
                    formatPlateForDisplay(notice.plate),
                  )}
            </Typography>
            {!state.success && !notice.photoSaved && (
              <Typography
                component="span"
                sx={{ fontSize: designTokens.typography.bodySize }}
              >
                {checkInText.photoUploadFailed}
              </Typography>
            )}
          </Stack>
        </Alert>
      </Snackbar>
      <FailureFeedbackDialog state={state} />
    </>
  );
}
