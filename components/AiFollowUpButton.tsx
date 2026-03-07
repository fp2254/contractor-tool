"use client";

import { useState } from "react";
import type { FollowUpResult } from "@/app/api/ai/followup/route";

type Props = {
  recordType: "quote" | "invoice";
  recordId: string;
  clientName?: string;
  recordTitle?: string;
  daysSinceSent?: number;
  amount?: number;
  customerPhone?: string | null;
  customerEmail?: string | null;
};

export function AiFollowUpButton({
  recordType,
  recordId,
  clientName,
  recordTitle,
  daysSinceSent = 0,
  amount,
  customerPhone,
  customerEmail,
}: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<FollowUpResult | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState<"sms" | "email" | null>(null);

  async function generate() {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/ai/followup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          record_type: recordType,
          record_id: recordId,
          client_name: clientName,
          record_title: recordTitle,
          days_since_sent: daysSinceSent,
          amount,
        }),
      });
      const data = await res.json() as FollowUpResult & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "AI request failed");
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate follow-up");
    } finally {
      setLoading(false);
    }
  }

  function openSheet() {
    setOpen(true);
    if (!result) generate();
  }

  function close() {
    setOpen(false);
  }

  async function copyText(text: string, type: "sms" | "email") {
    await navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  }

  function openSms() {
    if (!result) return;
    const body = encodeURIComponent(result.sms);
    const phone = customerPhone?.replace(/\D/g, "") ?? "";
    window.open(`sms:${phone}${phone ? "?" : "?"}body=${body}`, "_blank");
  }

  function openEmail() {
    if (!result || !customerEmail) return;
    const subject = encodeURIComponent(result.email_subject);
    const body = encodeURIComponent(result.email_body);
    window.open(`mailto:${customerEmail}?subject=${subject}&body=${body}`, "_blank");
  }

  return (
    <>
      <button
        onClick={openSheet}
        className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-purple-50 text-purple-700 border border-purple-200 active:bg-purple-100">
        ✨ AI Follow-Up
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={close} />
          <div className="relative bg-white rounded-t-3xl shadow-xl max-h-[88vh] flex flex-col">
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <span className="text-lg">✨</span>
                <h2 className="text-base font-bold text-slate-800">AI Follow-Up</h2>
                {clientName && <span className="text-sm text-gray-400">for {clientName}</span>}
              </div>
              <button onClick={close} className="text-gray-400 text-xl leading-none">✕</button>
            </div>

            <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
              {loading && (
                <div className="flex flex-col items-center justify-center py-12 gap-4">
                  <div className="w-10 h-10 border-4 border-gray-200 border-t-purple-500 rounded-full animate-spin" />
                  <p className="text-sm text-gray-500">Generating follow-up drafts…</p>
                </div>
              )}

              {error && !loading && (
                <div className="space-y-3">
                  <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>
                  <button onClick={generate} className="text-sm font-semibold text-purple-600">Try Again</button>
                </div>
              )}

              {result && !loading && (
                <div className="space-y-4">
                  {/* SMS draft */}
                  <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">SMS Draft</p>
                      <span className={`text-[10px] font-medium rounded-full px-2 py-0.5 ${result.sms.length > 160 ? "bg-red-100 text-red-600" : "bg-green-100 text-green-700"}`}>
                        {result.sms.length}/160
                      </span>
                    </div>
                    <p className="text-sm text-slate-700 leading-relaxed">{result.sms}</p>
                    <div className="flex gap-2">
                      {customerPhone && (
                        <button
                          onClick={openSms}
                          className="flex-1 rounded-xl py-2.5 text-xs font-semibold text-white bg-green-500 active:bg-green-600">
                          📱 Open in Messages
                        </button>
                      )}
                      <button
                        onClick={() => copyText(result.sms, "sms")}
                        className="flex-1 rounded-xl py-2.5 text-xs font-semibold border border-gray-200 text-slate-600">
                        {copied === "sms" ? "✓ Copied" : "Copy"}
                      </button>
                    </div>
                  </div>

                  {/* Email draft */}
                  <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Email Draft</p>
                    <div>
                      <p className="text-[11px] text-gray-400 mb-0.5">Subject</p>
                      <p className="text-sm font-semibold text-slate-800">{result.email_subject}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-gray-400 mb-0.5">Body</p>
                      <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{result.email_body}</p>
                    </div>
                    <div className="flex gap-2">
                      {customerEmail && (
                        <button
                          onClick={openEmail}
                          className="flex-1 rounded-xl py-2.5 text-xs font-semibold text-white bg-blue-600 active:bg-blue-700">
                          ✉️ Open in Email
                        </button>
                      )}
                      <button
                        onClick={() => copyText(`Subject: ${result.email_subject}\n\n${result.email_body}`, "email")}
                        className="flex-1 rounded-xl py-2.5 text-xs font-semibold border border-gray-200 text-slate-600">
                        {copied === "email" ? "✓ Copied" : "Copy"}
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={generate}
                    className="w-full rounded-xl py-2.5 text-sm font-semibold border border-gray-200 text-slate-600">
                    ↻ Regenerate
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
