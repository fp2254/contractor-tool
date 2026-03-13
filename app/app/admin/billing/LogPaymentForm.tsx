"use client";

import { useRef, useState, useTransition } from "react";
import { logPaymentAction } from "./actions";

export function LogPaymentForm() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await logPaymentAction(fd);
        formRef.current?.reset();
        setOpen(false);
      } catch (err: any) {
        setError(err.message ?? "Something went wrong");
      }
    });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-2 rounded-xl text-sm font-semibold text-white"
        style={{ backgroundColor: "#1B3A6B" }}>
        + Log a Payment
      </button>
    );
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="bg-blue-50 border border-blue-100 rounded-2xl p-4 space-y-3">
      <h3 className="font-semibold text-slate-700 text-sm">Log a Payment</h3>

      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2">
          <label className="text-xs font-medium text-gray-500 block mb-1">Payer Name</label>
          <input name="payer_name" required placeholder="Jane Smith"
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400" />
        </div>
        <div className="col-span-2">
          <label className="text-xs font-medium text-gray-500 block mb-1">Payer Email</label>
          <input name="payer_email" type="email" required placeholder="jane@example.com"
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400" />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1">Plan</label>
          <select name="plan_type"
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400 bg-white">
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1">Amount ($)</label>
          <input name="amount" type="number" step="0.01" min="0" required placeholder="29.00"
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400" />
        </div>
        <div className="col-span-2">
          <label className="text-xs font-medium text-gray-500 block mb-1">Payment Date</label>
          <input name="payment_date" type="date" required
            defaultValue={new Date().toISOString().slice(0, 10)}
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400" />
        </div>
        <div className="col-span-2">
          <label className="text-xs font-medium text-gray-500 block mb-1">Notes (optional)</label>
          <input name="notes" placeholder="e.g. Square payment link, check #1234"
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400" />
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-2 pt-1">
        <button type="submit" disabled={pending}
          className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          style={{ backgroundColor: "#1B3A6B" }}>
          {pending ? "Saving…" : "Save Payment"}
        </button>
        <button type="button" onClick={() => { setOpen(false); setError(null); }}
          className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-slate-600 border border-gray-200">
          Cancel
        </button>
      </div>
    </form>
  );
}
