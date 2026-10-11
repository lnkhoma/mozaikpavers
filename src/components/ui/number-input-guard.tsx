"use client";

import { useEffect } from "react";

/**
 * Browsers change a focused <input type="number"> when the mouse wheel moves
 * over it, which silently alters areas and prices while scrolling. Blur it
 * instead so the page scrolls and the value stays put.
 */
export function NumberInputGuard() {
  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      const el = document.activeElement;
      if (el instanceof HTMLInputElement && el.type === "number" && e.target === el) el.blur();
    };
    document.addEventListener("wheel", onWheel, { passive: true, capture: true });
    return () => document.removeEventListener("wheel", onWheel, { capture: true });
  }, []);
  return null;
}
