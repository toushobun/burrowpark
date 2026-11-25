"use client";

import { createContext, useContext, useEffect } from "react";

type SlotOperationDialogState = {
  pending: boolean;
  setPending: (pending: boolean) => void;
  complete?: () => void;
};

export const SlotOperationDialogContext =
  createContext<SlotOperationDialogState | null>(null);

/** 普通业务页不需要弹窗状态，弹窗内的提交则阻止提前关闭。 */
export function useSlotOperationPending(pending: boolean) {
  const dialog = useContext(SlotOperationDialogContext);
  const setPending = dialog?.setPending;
  useEffect(() => {
    setPending?.(pending);
    return () => setPending?.(false);
  }, [pending, setPending]);
  return dialog;
}
