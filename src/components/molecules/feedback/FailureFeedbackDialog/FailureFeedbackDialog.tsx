"use client";

import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import Typography from "@mui/material/Typography";
import { useEffect, useState } from "react";

import { authMessages } from "internal/auth";
import type { ActionState } from "types/actions";

type FailureFeedbackDialogProps = {
  state: ActionState;
  onClose?: () => void;
};

/** 仅响应新的 errorKey；关闭后不会由同一个失败状态重新打开。 */
export function FailureFeedbackDialog({
  state,
  onClose,
}: FailureFeedbackDialogProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (state.error && state.errorKey) {
      setOpen(true);
    }
  }, [state.error, state.errorKey]);

  const close = () => {
    setOpen(false);
    onClose?.();
  };

  return (
    <Dialog
      aria-describedby="failure-feedback-message"
      onClose={close}
      open={open && Boolean(state.error && state.errorKey)}
      fullWidth
      maxWidth="xs"
    >
      <DialogContent>
        <Typography id="failure-feedback-message" variant="h3">
          {state.error}
        </Typography>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button fullWidth onClick={close} size="large" variant="contained">
          {authMessages.acknowledge}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
