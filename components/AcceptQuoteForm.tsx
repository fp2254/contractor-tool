"use client";

import { useState } from "react";

type Props = {
  token: string;
  quoteId: string;
  alreadyAccepted: boolean;
  acceptedAt?: string | null;
  acceptedSignature?: string | null;
};

export function AcceptQuoteForm({ token, quoteId, alreadyAccepted, acceptedAt, acceptedSignature }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [accepted, setAccepted] = useState(alreadyAccepted);
  const [acceptedName, setAcceptedName] = useState(acceptedSignature ?? "");
  const [acceptedTime, setAcceptedTime] = useState(acceptedAt ?? "");
  const [error, setError] = useState("");

  async function handleAccept(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch(`/api/q/${token}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quoteId, signatureName: name.trim() }),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j as { error?: string }).error ?? "Failed to accept");
      }

      const j = (await res.json()) as { accepted_at: string };
      setAccepted(true);
      setAcceptedName(name.trim());
      setAcceptedTime(j.accepted_at);
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (accepted) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-2xl p-5 text-center space-y-1">
        <p className="text-2xl">✅</p>
        <p className="font-bold text-green-800">Quote Accepted</p>
        {acceptedName && <p className="text-sm text-green-700">Signed by: <span className="font-semibold">{acceptedName}</span></p>}
        {acceptedTime && (
          <p className="text-xs text-green-600">
            {new Date(acceptedTime).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
          </p>
        )}
      </div>
    );
  }

  if (showForm) {
    return (
      <form onSubmit={handleAccept} className="bg-white border-2 border-[#1B3A6B] rounded-2xl p-5 space-y-4">
        <div>
          <p className="font-bold text-slate-800 text-base mb-1">Sign to Accept</p>
          <p className="text-sm text-gray-500">Type your full name below to digitally accept this quote.</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        <input
          required
          placeholder="Your full name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-100 font-medium"
          style={{ fontFamily: "Georgia, serif", fontSize: "1.1rem" }}
        />

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={submitting || !name.trim()}
            className="flex-1 rounded-xl py-3 text-white font-semibold text-sm disabled:opacity-60"
            style={{ backgroundColor: "#1B3A6B" }}>
            {submitting ? "Accepting…" : "✓ Accept Quote"}
          </button>
          <button
            type="button"
            onClick={() => setShowForm(false)}
            className="rounded-xl px-4 py-3 border border-gray-200 text-gray-500 font-semibold text-sm">
            Cancel
          </button>
        </div>

        <p className="text-xs text-gray-400 text-center">
          By signing, you agree to the quoted terms and authorize the contractor to proceed.
        </p>
      </form>
    );
  }

  return (
    <button
      onClick={() => setShowForm(true)}
      className="w-full rounded-xl py-4 text-white font-bold text-base shadow-md active:scale-95 transition-transform"
      style={{ backgroundColor: "#1B3A6B" }}>
      ✓ Accept Quote
    </button>
  );
}
