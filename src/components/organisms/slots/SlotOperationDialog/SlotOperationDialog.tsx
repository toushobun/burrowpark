"use client";

import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import useMediaQuery from "@mui/material/useMediaQuery";
import Zoom from "@mui/material/Zoom";
import { useRouter } from "next/navigation";
import { useRef, useState, type ReactNode } from "react";

import { slotDetailText } from "config/slotDetailText";
import { designTokens } from "theme/designTokens";
import { theme } from "theme/theme";

import { SlotOperationDialogContext } from "./slotOperationDialogContext";

type Props = { code: string; children: ReactNode };

/** 通过拦截路由保留背景地图；关闭动画结束后仅回退历史记录。 */
export function SlotOperationDialog({ code, children }: Props) {
  const router = useRouter();
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const [open, setOpen] = useState(true);
  const [pending, setPending] = useState(false);
  const duration = reducedMotion ? 0 : theme.transitions.duration.standard;
  const origin = useRef<string | null>(null);

  const close = () => {
    if (!pending) setOpen(false);
  };

  function positionOrigin(node: HTMLElement) {
    const anchor = Array.from(document.querySelectorAll("svg a")).find(
      (element) =>
        element.getAttribute("href") === "/slots/" + encodeURIComponent(code),
    );
    if (origin.current === null && anchor) {
      const slot = anchor.getBoundingClientRect();
      origin.current =
        anchor.getAttribute("data-slot-operation-origin") ??
        `${slot.left + slot.width / 2}px ${slot.top + slot.height / 2}px`;
      anchor.removeAttribute("data-slot-operation-origin");
    }
    // Zoom 作用于覆盖整个视口的 Dialog container，而不是 Paper。
    // 直接使用视口坐标，避免测量已经缩放的节点；退出沿用同一原点。
    if (origin.current !== null) node.style.transformOrigin = origin.current;
  }

  return (
    <SlotOperationDialogContext.Provider value={{ pending, setPending }}>
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
            onExited: () => router.back(),
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
