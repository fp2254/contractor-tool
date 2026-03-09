"use client";

import { useState, useRef, useEffect } from "react";

const REVEAL_WIDTH = 148;
const SNAP_THRESHOLD = 60;

export type SwipeActionRowProps = {
  children: React.ReactNode;
  onArchive: () => Promise<void>;
  onDelete: () => Promise<void>;
  itemId: string;
  openItemId: string | null;
  setOpenItemId: (id: string | null) => void;
  archiveLabel?: string;
  archiveColor?: string;
  deleteConfirmMessage?: string;
};

export function SwipeActionRow({
  children,
  onArchive,
  onDelete,
  itemId,
  openItemId,
  setOpenItemId,
  archiveLabel = "Archive",
  archiveColor = "#64748b",
  deleteConfirmMessage = "Are you sure? This cannot be undone.",
}: SwipeActionRowProps) {
  const isOpen = openItemId === itemId;

  const [offset, setOffset] = useState(0);
  const [snapping, setSnapping] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const draggingRef = useRef(false);
  const capturedRef = useRef(false);
  const wasOpen = useRef(false);

  function snapTo(x: number) {
    setSnapping(true);
    setOffset(x);
    setTimeout(() => setSnapping(false), 240);
  }

  useEffect(() => {
    if (wasOpen.current && !isOpen) snapTo(0);
    wasOpen.current = isOpen;
  }, [isOpen]);

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).closest(".swar-actions")) return;
    startXRef.current = e.clientX;
    startYRef.current = e.clientY;
    draggingRef.current = true;
    if (isOpen) {
      capturedRef.current = true;
      e.currentTarget.setPointerCapture(e.pointerId);
    } else {
      capturedRef.current = false;
    }
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!draggingRef.current) return;
    const dx = e.clientX - startXRef.current;
    const dy = e.clientY - startYRef.current;

    if (!capturedRef.current) {
      if (Math.abs(dx) < 5 && Math.abs(dy) < 5) return;
      if (Math.abs(dy) > Math.abs(dx)) {
        draggingRef.current = false;
        return;
      }
      capturedRef.current = true;
      e.currentTarget.setPointerCapture(e.pointerId);
    }

    const base = isOpen ? -REVEAL_WIDTH : 0;
    setOffset(Math.max(-REVEAL_WIDTH, Math.min(12, base + dx)));
    setSnapping(false);
  }

  function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    if (!capturedRef.current) return;
    capturedRef.current = false;

    const dx = e.clientX - startXRef.current;
    if (!isOpen && dx < -SNAP_THRESHOLD) {
      setOpenItemId(itemId);
      snapTo(-REVEAL_WIDTH);
    } else if (isOpen && dx > SNAP_THRESHOLD) {
      setOpenItemId(null);
      snapTo(0);
    } else if (isOpen) {
      setOpenItemId(null);
      snapTo(0);
    } else {
      snapTo(0);
    }
  }

  function onPointerCancel() {
    draggingRef.current = false;
    capturedRef.current = false;
    snapTo(isOpen ? -REVEAL_WIDTH : 0);
  }

  async function handleArchive() {
    setArchiving(true);
    try {
      await onArchive();
      setOpenItemId(null);
      snapTo(0);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Action failed";
      window.alert(msg);
    } finally {
      setArchiving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(deleteConfirmMessage)) return;
    setDeleting(true);
    try {
      await onDelete();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Delete failed";
      window.alert(msg);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div
      className="relative rounded-2xl overflow-hidden shadow-sm"
      style={{ touchAction: "pan-y", userSelect: "none" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
    >
      <div className="swar-actions absolute inset-y-0 right-0 flex" style={{ width: REVEAL_WIDTH }}>
        <button
          onClick={handleArchive}
          disabled={archiving}
          className="flex flex-col items-center justify-center gap-1 flex-1 text-white text-xs font-semibold disabled:opacity-60 active:opacity-80"
          style={{ backgroundColor: archiveColor }}>
          {archiving ? (
            <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8l1 12a2 2 0 002 2h8a2 2 0 002-2L19 8m-9 4v4m4-4v4" />
              </svg>
              {archiveLabel}
            </>
          )}
        </button>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="flex flex-col items-center justify-center gap-1 bg-red-500 text-white text-xs font-semibold disabled:opacity-60 active:opacity-80"
          style={{ width: 72 }}>
          {deleting ? (
            <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete
            </>
          )}
        </button>
      </div>

      <div
        style={{
          transform: `translateX(${offset}px)`,
          transition: snapping ? "transform 0.22s cubic-bezier(0.25,0.46,0.45,0.94)" : "none",
          willChange: "transform",
        }}>
        {children}
      </div>
    </div>
  );
}
