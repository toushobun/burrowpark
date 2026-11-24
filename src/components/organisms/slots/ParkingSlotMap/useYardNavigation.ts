import type { KeyboardEvent, MouseEvent, TouchEvent } from "react";
import { useRef, useState } from "react";

import { getSlotYard } from "config/slotLayout";

const swipeThreshold = 45;

export function useYardNavigation(highlightCode?: string) {
  const [yard, setYard] = useState(() => getSlotYard(highlightCode));
  const [previousHighlight, setPreviousHighlight] = useState(highlightCode);
  if (previousHighlight !== highlightCode) {
    setPreviousHighlight(highlightCode);
    if (highlightCode) setYard(getSlotYard(highlightCode));
  }

  const start = useRef<{ x: number; y: number } | null>(null);
  const suppressClickUntil = useRef(0);

  function onTouchStart(event: TouchEvent) {
    suppressClickUntil.current = 0;
    if (event.touches.length !== 1) {
      start.current = null;
      return;
    }
    const touch = event.touches[0];
    start.current = { x: touch.clientX, y: touch.clientY };
  }

  function onTouchEnd(event: TouchEvent) {
    const origin = start.current;
    start.current = null;
    if (!origin || event.touches.length !== 0) return;
    const touch = event.changedTouches[0];
    if (!touch) return;
    const dx = touch.clientX - origin.x;
    const dy = touch.clientY - origin.y;
    if (Math.abs(dx) < swipeThreshold || Math.abs(dx) <= Math.abs(dy)) return;
    // 滑动即使发生在车位上，也不得触发随后的点击导航。
    suppressClickUntil.current = Date.now() + 500;
    setYard(dx < 0 ? "inner" : "outer");
  }

  function onTouchCancel() {
    start.current = null;
  }

  function onClickCapture(event: MouseEvent) {
    if (event.detail === 0 || Date.now() > suppressClickUntil.current) return;
    suppressClickUntil.current = 0;
    event.preventDefault();
    event.stopPropagation();
  }

  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const nextYard = event.key === "ArrowRight" ? "inner" : "outer";
    if (nextYard === yard) return;
    // 原院车位切换后会卸载，将键盘焦点保留在地图区域。
    event.currentTarget.focus();
    setYard(nextYard);
  }

  return {
    yard,
    setYard,
    onTouchStart,
    onTouchEnd,
    onTouchCancel,
    onClickCapture,
    onKeyDown,
  };
}
