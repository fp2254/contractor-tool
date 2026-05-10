"use client";

import { useState } from "react";

type Props = {
  customerId: string;
  customerPhone: string | null;
  customerEmail: string | null;
  customerName: string;
  orgName?: string;
  activeToken?: string | null;
  quoteId?: string | null;
  invoiceId?: string | null;
};

export function PortalLinkCard({
  customerId,
  customerPhone,
  customerEmail,
  customerName,
  orgName = "Your Company",
  activeToken: initialToken,
  quoteId,
  invoiceId,
}: Props) {
  const [token, setToken] = useState<string | null>(initialToken ?? null);
  const [portalUrl, setPortalUrl] = useState<string | null>(
    initialToken
      ? typeof window !== "undefined"
        ? `${window.location.origin}/portal/${initialToken}`
        : `/portal/${initialToken}`
      : null
  );
  const [showPicker, setShowPicker] = useState(false);
  const [loading, setLoading] = useState<"text" | "email" | "copy" | null>(null);
  const [result, setResult] = useState<{ method: "text" | "email" | "copy"; to: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [error, setError] = useState("");

  const hasContact = !!(customerPhone || customerEmail);
  const firstName = customerName.split(" ")[0] || customerName;

  async function getToken(reissue = false): Promise<{ token: string; url: string } | null> {
    try {
      const res = await fetch("/api/portal/generate-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_id: customerId,
          reissue,
          ...(invoiceId ? { invoice_id: invoiceId } : {}),
          ...(quoteId ? { quote_id: quoteId } : {}),
        }),
      });
      const j = await res.json() as { token?: string; portalUrl?: string; error?: string };
      if (!res.ok || !j.token) throw new Error(j.error ?? "Failed to generate link");
      setToken(j.token);
      setPortalUrl(j.portalUrl ?? null);
      return { token: j.token, url: j.portalUrl! };
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      return null;
    }
  }

  async function handleText() {
    if (!customerPhone) return;
    setLoading("text");
    setError("");
    try {
      const got = await getToken();
      if (!got) return;
      const msg = `Hi ${firstName}, here's your portal link to view your quote and sign it online: ${got.url}\n\n— ${orgName}`;
      window.location.href = `sms:${customerPhone}?body=${encodeURIComponent(msg)}`;
      setResult({ method: "text", to: customerPhone });
      setShowPicker(false);
    } finally {
      setLoading(null);
    }
  }

  async function handleEmail() {
    if (!customerEmail) return;
    setLoading("email");
    setError("");
    try {
      const res = await fetch("/api/portal/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_id: customerId,
          ...(invoiceId ? { invoice_id: invoiceId } : {}),
          ...(quoteId ? { quote_id: quoteId } : {}),
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(j.error ?? "Failed to send email");
      }
      const j = await res.json() as { token: string; portalUrl: string; to: string };
      setToken(j.token);
      setPortalUrl(j.portalUrl);
      setResult({ method: "email", to: j.to });
      setShowPicker(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(null);
    }
  }

  async function handleCopy() {
    setLoading("copy");
    setError("");
    try {
      const got = await getToken();
      if (!got) return;
      await navigator.clipboard.writeText(got.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
      setResult({ method: "copy", to: "" });
      setShowPicker(false);
    } finally {
      setLoading(null);
    }
  }

  async function revoke() {
    if (!token) return;
    if (!confirm(`Revoke the active portal link for ${customerName}?`)) return;
    setRevoking(true);
    setError("");
    try {
      const res = await fetch(`/api/portal/${token}/revoke`, { method: "POST" });
      if (!res.ok) throw new Error("Could not revoke token.");
      setToken(null);
      setPortalUrl(null);
      setResult(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setRevoking(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Customer Portal</p>

      {!hasContact && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
          Add a phone number or email to this customer to send them a portal link.
        </p>
      )}

      {error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</p>
      )}

      {result && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-3 py-2 text-xs text-green-800">
          {result.method === "text" && `✓ Portal link opened in Messages to ${result.to}`}
          {result.method === "email" && `✓ Portal link emailed to ${result.to}`}
          {result.method === "copy" && "✓ Portal link copied to clipboard"}
        </div>
      )}

      {portalUrl && (
        <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2 border border-gray-200">
          <span className="flex-1 text-xs text-gray-500 truncate font-mono">{portalUrl}</span>
          <button
            onClick={handleCopy}
            className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition-colors"
            style={{ backgroundColor: copied ? "#22C55E" : "#1B3A6B" }}>
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      )}

      {showPicker ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-500">Send portal link via:</p>
          <div className={`grid gap-2 ${customerPhone && customerEmail ? "grid-cols-3" : "grid-cols-2"}`}>
            {customerPhone && (
              <button
                onClick={handleText}
                disabled={loading !== null}
                className="flex flex-col items-center gap-1.5 bg-green-50 rounded-xl py-4 text-green-700 active:bg-green-100 disabled:opacity-50">
                {loading === "text" ? (
                  <span className="text-lg animate-spin">⏳</span>
                ) : (
                  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                )}
                <span className="text-xs font-semibold">Text</span>
                <span className="text-[10px] text-green-600 truncate px-1 w-full text-center">{customerPhone}</span>
              </button>
            )}
            {customerEmail && (
              <button
                onClick={handleEmail}
                disabled={loading !== null}
                className="flex flex-col items-center gap-1.5 bg-blue-50 rounded-xl py-4 text-blue-700 active:bg-blue-100 disabled:opacity-50">
                {loading === "email" ? (
                  <span className="text-lg animate-spin">⏳</span>
                ) : (
                  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                )}
                <span className="text-xs font-semibold">Email</span>
                <span className="text-[10px] text-blue-600 truncate px-1 w-full text-center">{customerEmail}</span>
              </button>
            )}
            <button
              onClick={handleCopy}
              disabled={loading !== null}
              className="flex flex-col items-center gap-1.5 bg-gray-50 rounded-xl py-4 text-gray-600 active:bg-gray-100 disabled:opacity-50">
              {copied ? (
                <svg viewBox="0 0 24 24" className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : loading === "copy" ? (
                <span className="text-lg animate-spin">⏳</span>
              ) : (
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              )}
              <span className={`text-xs font-semibold ${copied ? "text-green-600" : ""}`}>
                {copied ? "Copied!" : "Copy Link"}
              </span>
            </button>
          </div>
          <button
            onClick={() => setShowPicker(false)}
            className="w-full text-xs text-gray-400 py-1 text-center">
            Cancel
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <button
            onClick={() => { setShowPicker(true); setError(""); }}
            disabled={!hasContact || revoking}
            className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white disabled:opacity-50 transition-opacity"
            style={{ backgroundColor: "#1B3A6B" }}>
            {token ? "Resend Link" : "Send Portal Link"}
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
      )}

      <p className="text-xs text-gray-400">
        The customer can view their quotes and invoices, accept quotes with a digital signature, and download PDFs — no login required.
      </p>
    </div>
  );
}
