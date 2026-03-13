"use client";

import { useTransition, useState } from "react";
import { approveNotificationAction, ignoreNotificationAction } from "./actions";

interface Props {
  id: string;
  payerEmail: string;
  planType: string;
}

export function NotificationActions({ id, payerEmail, planType }: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<"approved" | "ignored" | null>(null);

  function approve() {
    setError(null);
    startTransition(async () => {
      try {
        await approveNotificationAction(id, payerEmail, planType);
        setDone("approved");
      } catch (err: any) {
        setError(err.message ?? "Failed to approve");
      }
    });
  }

  function ignore() {
    setError(null);
    startTransition(async () => {
      try {
        await ignoreNotificationAction(id);
        setDone("ignored");
      } catch (err: any) {
        setError(err.message ?? "Failed to ignore");
      }
    });
  }

  if (done === "approved") {
    return <span className="text-xs font-semibold text-green-600">✓ Subscription activated</span>;
  }
  if (done === "ignored") {
    return <span className="text-xs font-semibold text-gray-400">Ignored</span>;
  }

  return (
    <div className="space-y-1.5">
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={approve}
          disabled={pending}
          className="flex-1 rounded-lg py-2 text-xs font-semibold text-white disabled:opacity-60"
          style={{ backgroundColor: "#1B3A6B" }}>
          {pending ? "Working…" : "Mark Subscription Paid"}
        </button>
        <button
          onClick={ignore}
          disabled={pending}
          className="rounded-lg px-3 py-2 text-xs font-semibold text-gray-500 border border-gray-200 disabled:opacity-60">
          Ignore
        </button>
      </div>
    </div>
  );
}
