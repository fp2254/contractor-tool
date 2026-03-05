"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  token: string;
  quoteId: string;
  quoteNum: string;
};

export function SignatureCapture({ token, quoteId, quoteNum }: Props) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [drawing, setDrawing] = useState(false);
  const [hasStrokes, setHasStrokes] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (open) {
      setHasStrokes(false);
      setError("");
      setTimeout(() => clearCanvas(), 50);
    }
  }, [open]);

  function clearCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasStrokes(false);
  }

  function getPos(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = canvasRef.current!.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvasRef.current!.width / rect.width),
      y: (e.clientY - rect.top) * (canvasRef.current!.height / rect.height),
    };
  }

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    setDrawing(true);
    setHasStrokes(true);
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#1B3A6B";
    const { x, y } = getPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  function onPointerUp() {
    setDrawing(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please type your full name.");
      return;
    }
    setError("");
    setSubmitting(true);

    const signatureData = hasStrokes
      ? canvasRef.current?.toDataURL("image/png") ?? null
      : null;

    try {
      const res = await fetch(`/api/portal/${token}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quoteId, signerName: name.trim(), signatureData }),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j as { error?: string }).error ?? "Failed to accept.");
      }

      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex-1 rounded-lg py-2 text-xs font-semibold text-white bg-green-500 active:bg-green-600">
        Accept
      </button>
    );
  }

  return (
    <div className="mt-3 border border-green-200 bg-green-50 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-slate-800">Sign to Accept {quoteNum}</p>
        <button onClick={() => setOpen(false)} className="text-gray-400 text-lg leading-none">✕</button>
      </div>

      <p className="text-xs text-gray-500">
        Draw your signature below, then type your name and tap Accept.
      </p>

      <div className="space-y-2">
        <div className="relative">
          <canvas
            ref={canvasRef}
            width={560}
            height={120}
            className="w-full rounded-lg border-2 border-dashed border-green-300 bg-white touch-none"
            style={{ height: 100 }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
          />
          {!hasStrokes && (
            <p className="absolute inset-0 flex items-center justify-center text-xs text-gray-300 pointer-events-none">
              Draw your signature here
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={clearCanvas}
          className="text-xs text-gray-400 underline">
          Clear
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-2">
        <input
          required
          placeholder="Your full name *"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-200"
          style={{ fontFamily: "Georgia, serif" }}
        />

        {error && <p className="text-xs text-red-600">{error}</p>}

        <p className="text-xs text-gray-400">
          By submitting, you agree to the quoted terms and authorize work to proceed.
        </p>

        <button
          type="submit"
          disabled={submitting || !name.trim()}
          className="w-full rounded-lg py-2.5 text-sm font-semibold text-white bg-green-500 disabled:opacity-50">
          {submitting ? "Submitting…" : "✓ Accept Quote"}
        </button>
      </form>
    </div>
  );
}
