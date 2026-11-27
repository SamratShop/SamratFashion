"use client";

import { useState, useCallback } from "react";

const MIN_WIDTH = 220;
const MAX_WIDTH = 380;
const STORAGE_KEY_WIDTH = "threadvibe_shop_sidebar_width";

interface ShopSidebarResizerProps {
  sidebarWidth: number;
  onWidthChange: (width: number) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export function ShopSidebarResizer({
  sidebarWidth,
  onWidthChange,
  containerRef,
}: ShopSidebarResizerProps) {
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Dragging logic for desktop resizer handle
  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.button !== 0) return;
      e.preventDefault();
      setIsDragging(true);

      const startX = e.clientX;
      const startWidth = sidebarWidth;

      // v4 fix preserved: Cache getBoundingClientRect before pointermove loop
      const containerWidth = containerRef.current
        ? containerRef.current.getBoundingClientRect().width
        : 1200;
      const maxAllowed = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, containerWidth - 320));

      const handlePointerMove = (moveEvent: PointerEvent) => {
        const deltaX = moveEvent.clientX - startX;
        const targetWidth = startWidth + deltaX;
        const clamped = Math.min(maxAllowed, Math.max(MIN_WIDTH, Math.round(targetWidth)));
        onWidthChange(clamped);
      };

      const handlePointerUp = (upEvent: PointerEvent) => {
        setIsDragging(false);
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerUp);
        window.removeEventListener("pointercancel", handlePointerUp);
        document.body.style.removeProperty("cursor");
        document.body.style.removeProperty("user-select");

        const deltaX = upEvent.clientX - startX;
        const finalWidth = Math.min(maxAllowed, Math.max(MIN_WIDTH, Math.round(startWidth + deltaX)));
        onWidthChange(finalWidth);
        try {
          localStorage.setItem(STORAGE_KEY_WIDTH, finalWidth.toString());
        } catch {
          // Ignore storage errors
        }
      };

      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
      window.addEventListener("pointercancel", handlePointerUp);
    },
    [sidebarWidth, onWidthChange, containerRef]
  );

  // Keyboard navigation on resizer divider
  const handleResizerKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        const next = Math.max(MIN_WIDTH, sidebarWidth - 10);
        onWidthChange(next);
        try {
          localStorage.setItem(STORAGE_KEY_WIDTH, next.toString());
        } catch {}
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        const next = Math.min(MAX_WIDTH, sidebarWidth + 10);
        onWidthChange(next);
        try {
          localStorage.setItem(STORAGE_KEY_WIDTH, next.toString());
        } catch {}
      } else if (e.key === "Home") {
        e.preventDefault();
        onWidthChange(MIN_WIDTH);
        try {
          localStorage.setItem(STORAGE_KEY_WIDTH, MIN_WIDTH.toString());
        } catch {}
      } else if (e.key === "End") {
        e.preventDefault();
        onWidthChange(MAX_WIDTH);
        try {
          localStorage.setItem(STORAGE_KEY_WIDTH, MAX_WIDTH.toString());
        } catch {}
      }
    },
    [sidebarWidth, onWidthChange]
  );

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize filter sidebar"
      aria-valuenow={sidebarWidth}
      aria-valuemin={MIN_WIDTH}
      aria-valuemax={MAX_WIDTH}
      tabIndex={0}
      onPointerDown={handlePointerDown}
      onKeyDown={handleResizerKeyDown}
      className={`hidden lg:flex shrink-0 w-3 self-stretch justify-center cursor-col-resize select-none mx-0.5 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-full ${
        isDragging ? "bg-primary/10" : ""
      }`}
    >
      <div
        className={`w-[1px] h-full transition-colors rounded-full ${
          isDragging
            ? "bg-primary w-[2px]"
            : "bg-outline-variant/30 group-hover:bg-primary group-hover:w-[2px]"
        }`}
      />
    </div>
  );
}
