"use client";

import { useState } from "react";

type Props = {
  customerId: string;
  customerEmail: string | null;
  customerName: string;
  activeToken?: string | null;
};

export function PortalLinkCard({ customerId, customerEmail, customerName, activeToken: initialToken }: Props) {
  const [token, setToken] = useState<string | null>(initialToken ?? null);
  const [sending, setSending] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [result, setResult] = useState<{ portalUrl: string; to: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const portalUrl = result?.portalUrl ?? (token
    ? (typeof window !== "undefined"
        ? `${window.location.protocol}//${window.location.host}/portal/${token}`
        : `/portal/${token}`)
    : null);

  async function send(reissue = false) {
    if (!customerEmail) {
      setError("Add this customer's email address first before sending a portal link.");
      return;
    }
    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/portal/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer_id: customerId, reissue }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j as { error?: string }).error ?? "Failed to send link.");
      }
      const j = (await res.json()) as { success: boolean; portalUrl: string; token: string; to: string };
      setResult({ portalUrl: j.portalUrl, to: j.to });
      setToken(j.token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSending(false);
    }
  }

  async function revoke() {
    if (!token) return;
    if (!confirm(`Revoke the active portal link for ${customerName}? They will no longer be able to access it.`)) return;
    setRevoking(true);
    setError("");
    try {
      const res = await fetch(`/api/portal/${token}/revoke`, { method: "POST" });
      if (!res.ok) throw new Error("Could not revoke token.");
      setToken(null);
      setResult(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setRevoking(false);
    }
  }

  function copyUrl() {
    if (!portalUrl) return;
    navigator.clipboard.writeText(portalUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Customer Portal</p>

      {!customerEmail && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
          Add an email address to this customer to send them a portal link.
        </p>
      )}

      {error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</p>
      )}

      {result && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-3 py-2 text-xs text-green-800">
          ✓ Portal link sent to <span className="font-semibold">{result.to}</span>
        </div>
      )}

      {portalUrl && (
        <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2 border border-gray-200">
          <span className="flex-1 text-xs text-gray-500 truncate">{portalUrl}</span>
          <button
            onClick={copyUrl}
            className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition-colors"
            style={{ backgroundColor: copied ? "#22C55E" : "#1B3A6B" }}>
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={() => send(false)}
          disabled={sending || !customerEmail}
          className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white disabled:opacity-50 transition-opacity"
          style={{ backgroundColor: "#1B3A6B" }}>
          {sending ? "Sending…" : token ? "Resend Link" : "Send Portal Link"}
        </button>

        {token && (
          <button
            onClick={revoke}
            disabled={revoking}
            className="rounded-xl px-3 py-2.5 text-sm font-semibold text-red-500 border border-red-200 bg-red-50 disabled:opacity-50">
            {revoking ? "…" : "Revoke"}
          </button>
        )}
      </div>

      {token && (
        <button
          onClick={() => send(true)}
          disabled={sending}
          className="w-full text-xs text-gray-400 underline py-0.5 text-left">
          Revoke current link and send a new one
        </button>
      )}

      <p className="text-xs text-gray-400">
        The customer can view their quotes and invoices, accept quotes with a digital signature, and download PDFs — no login required.
      </p>
    </div>
  );
}
