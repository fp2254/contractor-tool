"use client";

import { useState } from "react";

export function SendPortalButton({
  customerId,
  customerEmail,
}: {
  customerId: string;
  customerEmail?: string | null;
}) {
  const [state, setState] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [portalUrl, setPortalUrl] = useState("");

  async function handleSend() {
    if (!customerEmail) {
      setErrorMsg("No email address on file. Add one to this customer's profile first.");
      setState("error");
      return;
    }
    setState("loading");
    try {
      const res = await fetch("/api/portal/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer_id: customerId }),
      });
      const json = await res.json() as { error?: string; portalUrl?: string };
      if (!res.ok) {
        setErrorMsg(json.error ?? "Failed to send portal link");
        setState("error");
      } else {
        setPortalUrl(json.portalUrl ?? "");
        setState("sent");
      }
    } catch {
      setErrorMsg("Network error. Please try again.");
      setState("error");
    }
  }

  async function handleCopy() {
    if (!portalUrl) return;
    await navigator.clipboard.writeText(portalUrl);
  }

  if (state === "sent") {
    return (
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 space-y-2">
        <p className="text-blue-700 font-semibold text-sm">✅ Portal link sent to {customerEmail}</p>
        <p className="text-xs text-blue-500">The link is valid for 30 days. Customer can view all their quotes and invoices, download PDFs, and accept or decline quotes.</p>
        {portalUrl && (
          <button
            onClick={handleCopy}
            className="text-xs font-medium text-blue-600 underline"
          >
            Copy link to clipboard
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <button
        onClick={handleSend}
        disabled={state === "loading"}
        className="w-full rounded-xl py-3 font-semibold text-sm disabled:opacity-60 flex items-center justify-center gap-2 bg-white border border-gray-200 text-slate-700 shadow-sm"
      >
        {state === "loading" ? (
          <>
            <span className="inline-block h-4 w-4 rounded-full border-2 border-slate-400 border-t-transparent animate-spin" />
            Sending…
          </>
        ) : (
          <>🔗 Send Customer Portal Link</>
        )}
      </button>
      {state === "error" && (
        <p className="text-xs text-red-500 text-center px-2">{errorMsg}</p>
      )}
    </div>
  );
}
