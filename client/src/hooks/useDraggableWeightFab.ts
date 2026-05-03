import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";

const STORAGE_KEY = "fitai:weight-fab-position";
const HOLD_TO_DRAG_MS = 2000;
const FAB_SIZE = 56;
const PANEL_WIDTH = 224;
const PANEL_HEIGHT = 176;
const EDGE_GAP = 12;
const BOTTOM_RESERVED = 116;
const DEFAULT_RIGHT_GAP = 16;
const DEFAULT_BOTTOM_GAP = 128;

type Position = { x: number; y: number };

function isCoarsePointer() {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia("(pointer: coarse)").matches;
}

function clampPosition(position: Position, viewportWidth: number, viewportHeight: number): Position {
  const maxX = Math.max(EDGE_GAP, viewportWidth - FAB_SIZE - EDGE_GAP);
  const maxY = Math.max(EDGE_GAP, viewportHeight - FAB_SIZE - BOTTOM_RESERVED);

  return {
    x: Math.min(Math.max(position.x, EDGE_GAP), maxX),
    y: Math.min(Math.max(position.y, EDGE_GAP), maxY),
  };
}

function getDefaultPosition(viewportWidth: number, viewportHeight: number) {
  return clampPosition(
    {
      x: viewportWidth - FAB_SIZE - DEFAULT_RIGHT_GAP,
      y: viewportHeight - FAB_SIZE - DEFAULT_BOTTOM_GAP,
    },
    viewportWidth,
    viewportHeight,
  );
}

function readStoredPosition(viewportWidth: number, viewportHeight: number) {
  if (typeof window === "undefined") {
    return getDefaultPosition(viewportWidth, viewportHeight);
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultPosition(viewportWidth, viewportHeight);
    const parsed = JSON.parse(raw) as Partial<Position>;
    if (typeof parsed.x !== "number" || typeof parsed.y !== "number") {
      return getDefaultPosition(viewportWidth, viewportHeight);
    }
    return clampPosition({ x: parsed.x, y: parsed.y }, viewportWidth, viewportHeight);
  } catch {
    return getDefaultPosition(viewportWidth, viewportHeight);
  }
}

export function useDraggableWeightFab(showPanel: boolean) {
  const [position, setPosition] = useState<Position>(() => {
    if (typeof window === "undefined") {
      return { x: 0, y: 0 };
    }
    return readStoredPosition(window.innerWidth, window.innerHeight);
  });
  const [isDragging, setIsDragging] = useState(false);
  const dragEnabled = isCoarsePointer();
  const holdTimerRef = useRef<number | null>(null);
  const pointerIdRef = useRef<number | null>(null);
  const suppressClickRef = useRef(false);
  const longPressReadyRef = useRef(false);
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
  const latestPositionRef = useRef(position);

  useEffect(() => {
    latestPositionRef.current = position;
  }, [position]);

  const persistPosition = useCallback((next: Position) => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const syncToViewport = useCallback((preferStored: boolean) => {
    if (typeof window === "undefined") return;
    const next = preferStored
      ? readStoredPosition(window.innerWidth, window.innerHeight)
      : clampPosition(latestPositionRef.current, window.innerWidth, window.innerHeight);
    latestPositionRef.current = next;
    setPosition(next);
    if (dragEnabled) {
      persistPosition(next);
    }
  }, [dragEnabled, persistPosition]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    syncToViewport(dragEnabled);
  }, [dragEnabled, syncToViewport]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleResize = () => syncToViewport(false);
    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
    };
  }, [syncToViewport]);

  const clearHold = useCallback(() => {
    if (holdTimerRef.current !== null) {
      window.clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  }, []);

  const finishDrag = useCallback(() => {
    clearHold();
    longPressReadyRef.current = false;
    pointerIdRef.current = null;
    pointerStartRef.current = null;
    if (isDragging) {
      setIsDragging(false);
      suppressClickRef.current = true;
      if (dragEnabled) {
        persistPosition(latestPositionRef.current);
      }
    }
  }, [clearHold, dragEnabled, isDragging, persistPosition]);

  const moveToPointer = useCallback((clientX: number, clientY: number) => {
    if (typeof window === "undefined") return;
    const next = clampPosition(
      { x: clientX - FAB_SIZE / 2, y: clientY - FAB_SIZE / 2 },
      window.innerWidth,
      window.innerHeight,
    );
    latestPositionRef.current = next;
    setPosition(next);
  }, []);

  const handlePointerDown = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!dragEnabled) return;
    pointerIdRef.current = event.pointerId;
    pointerStartRef.current = { x: event.clientX, y: event.clientY };
    longPressReadyRef.current = false;
    clearHold();
    holdTimerRef.current = window.setTimeout(() => {
      longPressReadyRef.current = true;
      setIsDragging(true);
      moveToPointer(event.clientX, event.clientY);
    }, HOLD_TO_DRAG_MS);
  }, [clearHold, dragEnabled, moveToPointer]);

  const handlePointerMove = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!dragEnabled || pointerIdRef.current !== event.pointerId) return;

    if (isDragging) {
      event.preventDefault();
      moveToPointer(event.clientX, event.clientY);
      return;
    }

    const start = pointerStartRef.current;
    if (!start) return;
    const moved = Math.hypot(event.clientX - start.x, event.clientY - start.y);
    if (moved > 10 && !longPressReadyRef.current) {
      clearHold();
    }
  }, [clearHold, dragEnabled, isDragging, moveToPointer]);

  const handlePointerUp = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!dragEnabled || pointerIdRef.current !== event.pointerId) return;
    finishDrag();
  }, [dragEnabled, finishDrag]);

  const handlePointerCancel = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!dragEnabled || pointerIdRef.current !== event.pointerId) return;
    finishDrag();
  }, [dragEnabled, finishDrag]);

  const handleButtonClick = useCallback((toggle: () => void) => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    toggle();
  }, []);

  const buttonStyle = useMemo<CSSProperties>(() => ({
    position: "absolute",
    left: `${position.x}px`,
    top: `${position.y}px`,
    width: `${FAB_SIZE}px`,
    height: `${FAB_SIZE}px`,
    borderRadius: "9999px",
    touchAction: isDragging ? "none" : "manipulation",
    cursor: isDragging ? "grabbing" : "pointer",
    transform: isDragging ? "scale(1.04)" : undefined,
    zIndex: 2,
  }), [isDragging, position.x, position.y]);

  const panelStyle = useMemo<CSSProperties>(() => {
    if (typeof window === "undefined") return { display: "none" };
    const left = Math.min(
      Math.max(position.x + FAB_SIZE - PANEL_WIDTH, EDGE_GAP),
      window.innerWidth - PANEL_WIDTH - EDGE_GAP,
    );
    const top = Math.max(EDGE_GAP, position.y - PANEL_HEIGHT - 12);

    return {
      position: "absolute",
      left: `${left}px`,
      top: `${showPanel ? top : -9999}px`,
      width: `${PANEL_WIDTH}px`,
      zIndex: 1,
    };
  }, [position.x, position.y, showPanel]);

  return {
    isDragging,
    buttonStyle,
    panelStyle,
    buttonProps: {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onPointerCancel: handlePointerCancel,
      onLostPointerCapture: handlePointerCancel,
    },
    handleButtonClick,
  };
}
