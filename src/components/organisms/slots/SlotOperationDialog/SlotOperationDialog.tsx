"use client";

import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import useMediaQuery from "@mui/material/useMediaQuery";
import Zoom from "@mui/material/Zoom";
import { useState, type ReactNode } from "react";

import { slotDetailText } from "config/slotDetailText";
import { designTokens } from "theme/designTokens";
import { theme } from "theme/theme";

import { SlotOperationDialogContext } from "./slotOperationDialogContext";

type Props = {
  origin: string;
  children: ReactNode;
  onClosed: () => void;
};

/** 首页本地弹窗；关闭动画结束后只清除当前选中的车位。 */
export function SlotOperationDialog({ origin, children, onClosed }: Props) {
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const [open, setOpen] = useState(true);
  const [pending, setPending] = useState(false);
  const duration = reducedMotion ? 0 : theme.transitions.duration.standard;

  const close = () => {
    if (!pending) setOpen(false);
  };

  function positionOrigin(node: HTMLElement) {
    node.style.transformOrigin = origin;
  }

  return (
    <SlotOperationDialogContext.Provider
      value={{ pending, setPending, complete: onClosed }}
    >
      <Dialog
        open={open}
        onClose={close}
        aria-labelledby="slot-title"
        fullWidth
        maxWidth={false}
        scroll="paper"
        slots={{ transition: Zoom }}
        slotProps={{
          paper: {
            sx: {
              m: 2,
              maxWidth: designTokens.size.contentMaxWidth,
              maxHeight: "calc(100dvh - 32px)",
              borderRadius: `${designTokens.radius.lg}px`,
            },
          },
          transition: {
            onEnter: positionOrigin,
            onExited: onClosed,
          },
        }}
        transitionDuration={duration}
      >
        <DialogTitle id="slot-title">{slotDetailText.pageTitle}</DialogTitle>
        <DialogContent dividers>{children}</DialogContent>
        <DialogActions>
          <Button
            fullWidth
            disabled={pending || !open}
            size="large"
            onClick={close}
          >
            {slotDetailText.backToMap}
          </Button>
        </DialogActions>
      </Dialog>
    </SlotOperationDialogContext.Provider>
  );
}
