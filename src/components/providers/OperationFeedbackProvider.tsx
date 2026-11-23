"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";

import type { OperationNotice } from "utils/operationNotice";

type OperationFeedback = {
  notice: OperationNotice | null;
  sequence: number;
  showNotice: (notice: OperationNotice) => void;
  dismissNotice: () => void;
};

const emptyFeedback: OperationFeedback = {
  notice: null,
  sequence: 0,
  showNotice: () => {},
  dismissNotice: () => {},
};

const OperationFeedbackContext =
  createContext<OperationFeedback>(emptyFeedback);

/** 在认证布局内保存一次性操作反馈，跨页面跳转后仍能在地图上显示。 */
export function OperationFeedbackProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [current, setCurrent] = useState<{
    notice: OperationNotice;
    sequence: number;
  } | null>(null);
  const sequence = useRef(0);
  const showNotice = useCallback((value: OperationNotice) => {
    sequence.current += 1;
    setCurrent({ notice: value, sequence: sequence.current });
  }, []);
  const dismissNotice = useCallback(() => setCurrent(null), []);
  const value = useMemo(
    () => ({
      notice: current?.notice ?? null,
      sequence: current?.sequence ?? 0,
      showNotice,
      dismissNotice,
    }),
    [current, showNotice, dismissNotice],
  );

  return (
    <OperationFeedbackContext.Provider value={value}>
      {children}
    </OperationFeedbackContext.Provider>
  );
}

export function useOperationFeedback(): OperationFeedback {
  return useContext(OperationFeedbackContext);
}
