"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export function CopyNumberButton({ phoneNumber }: { phoneNumber: string }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(phoneNumber).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }

  return (
    <button onClick={copy}
      className="text-xs font-semibold bg-white/20 text-white px-3 py-1.5 rounded-full active:bg-white/30 transition-colors">
      {copied ? "✓ Copied!" : "Copy Number"}
    </button>
  );
}

interface CallLog {
  id: string;
  direction: "inbound" | "outbound";
  from_number: string;
  to_number: string;
  status: string;
  duration_seconds: number | null;
  recording_url: string | null;
  caller_name: string | null;
  answered_by: string | null;
  started_at: string;
  call_transcripts?: { ai_summary: string | null; sentiment: string | null } | null;
}

function formatDuration(secs: number | null): string {
  if (!secs) return "—";
  if (secs < 60) return `${secs}s`;
  return `${Math.floor(secs / 60)}m ${secs % 60}s`;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function StatusBadge({ call }: { call: CallLog }) {
  if (call.answered_by === "contractor") return <span className="text-xs font-semibold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Answered</span>;
  if (call.answered_by === "retell") return <span className="text-xs font-semibold bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">AI Handled</span>;
  if (call.status === "completed") return <span className="text-xs font-semibold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Answered</span>;
  return <span className="text-xs font-semibold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Missed</span>;
}

function CallRow({ call }: { call: CallLog }) {
  const [expanded, setExpanded] = useState(false);
  const displayName = call.caller_name || call.from_number || "Unknown";
  const summary = (call.call_transcripts as any)?.ai_summary ?? null;

  return (
    <div className="border-b border-gray-100 last:border-0">
      <div className="flex items-center gap-3 px-4 py-3 active:bg-gray-50" onClick={() => setExpanded((p) => !p)}>
        <div className={`h-9 w-9 rounded-full flex items-center justify-center flex-shrink-0 text-base ${call.direction === "inbound" ? "bg-blue-50" : "bg-gray-100"}`}>
          {call.direction === "inbound" ? "📞" : "📲"}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-800 truncate">{displayName}</p>
          <p className="text-xs text-gray-400">{timeAgo(call.started_at)} · {formatDuration(call.duration_seconds)}</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge call={call} />
          {call.recording_url && (
            <a href={call.recording_url} target="_blank" rel="noopener noreferrer"
               className="p-1.5 rounded-lg bg-gray-100 active:bg-gray-200"
               onClick={(e) => e.stopPropagation()}
               title="Play recording">
              🎧
            </a>
          )}
          <span className={`text-gray-300 transition-transform ${expanded ? "rotate-90" : ""}`}>›</span>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 pt-1 bg-gray-50 border-t border-gray-100">
          {summary ? (
            <>
              <p className="text-xs font-semibold text-gray-400 uppercase mb-1.5">AI Summary</p>
              <p className="text-sm text-slate-700 leading-relaxed">{summary}</p>
            </>
          ) : (
            <p className="text-xs text-gray-400 italic">No transcript yet — AI will process after the call ends.</p>
          )}
          {call.from_number && (
            <div className="flex gap-2 mt-3">
              <a href={`tel:${call.from_number}`}
                 className="flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold bg-white border border-gray-200 text-slate-700">
                📞 Call Back
              </a>
              <a href={`sms:${call.from_number}`}
                 className="flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold bg-white border border-gray-200 text-slate-700">
                💬 Text
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface Props {
  initialCalls: CallLog[];
  nextCursor: string | null;
  phoneNumber: string | null;
  isProvisioning?: boolean;
}

export function PhoneCallLog({ initialCalls, nextCursor: initCursor }: Props) {
  const [calls, setCalls] = useState<CallLog[]>(initialCalls);
  const [cursor, setCursor] = useState<string | null>(initCursor);
  const [filter, setFilter] = useState<"all" | "missed" | "answered">("all");
  const [loading, setLoading] = useState(false);

  async function loadMore() {
    if (!cursor || loading) return;
    setLoading(true);
    const res = await fetch(`/api/phone/calls?filter=${filter}&cursor=${encodeURIComponent(cursor)}`);
    const data = await res.json();
    setCalls((p) => [...p, ...(data.calls ?? [])]);
    setCursor(data.nextCursor ?? null);
    setLoading(false);
  }

  async function applyFilter(f: "all" | "missed" | "answered") {
    setFilter(f);
    setLoading(true);
    const res = await fetch(`/api/phone/calls?filter=${f}`);
    const data = await res.json();
    setCalls(data.calls ?? []);
    setCursor(data.nextCursor ?? null);
    setLoading(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(["all", "missed", "answered"] as const).map((f) => (
          <button key={f} onClick={() => applyFilter(f)}
            className={`px-4 py-2 rounded-full text-xs font-semibold transition-colors ${filter === f ? "text-white" : "text-gray-500 bg-white border border-gray-200"}`}
            style={filter === f ? { backgroundColor: "#1B3A6B" } : {}}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {calls.length === 0 && !loading && (
          <p className="text-center text-sm text-gray-400 py-10">
            {filter === "missed" ? "No missed calls." : filter === "answered" ? "No answered calls." : "No calls yet — share your number to get started."}
          </p>
        )}
        {calls.map((c) => <CallRow key={c.id} call={c} />)}
      </div>

      {cursor && (
        <button onClick={loadMore} disabled={loading}
          className="w-full py-3 text-sm font-semibold text-slate-600 bg-white rounded-2xl border border-gray-200 disabled:opacity-50">
          {loading ? "Loading…" : "Load more"}
        </button>
      )}
    </div>
  );
}

export function ProvisionButton({ areaCode, autoStart }: { areaCode?: string; autoStart?: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function provision() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/phone/numbers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ areaCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Provisioning failed");
      router.refresh();
    } catch (e: any) {
      setError(e.message ?? "Something went wrong");
      setLoading(false);
    }
  }

  useEffect(() => {
    if (autoStart) provision();
  }, []);

  return (
    <div className="space-y-3">
      <button onClick={provision} disabled={loading}
        className="w-full py-4 rounded-2xl text-white font-bold text-base disabled:opacity-60 transition-opacity"
        style={{ backgroundColor: "#1B3A6B" }}>
        {loading ? "Setting up your number…" : "🎉 Get My Phone Number"}
      </button>
      {error && <p className="text-sm text-red-600 text-center">{error}</p>}
      {loading && (
        <p className="text-xs text-gray-400 text-center">
          Provisioning your Twilio number and AI agent — this takes about 10 seconds…
        </p>
      )}
    </div>
  );
}

export function GetPhoneButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startCheckout() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/checkout", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not start checkout");
      window.location.href = data.checkoutUrl;
    } catch (e: any) {
      setError(e.message ?? "Something went wrong — please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <button onClick={startCheckout} disabled={loading}
        className="w-full py-4 rounded-2xl text-white font-bold text-base disabled:opacity-60 transition-opacity"
        style={{ backgroundColor: "#1B3A6B" }}>
        {loading ? "Loading checkout…" : "Get AI Phone — $29/mo"}
      </button>
      {error && <p className="text-sm text-red-600 text-center">{error}</p>}
    </div>
  );
}

export function ActivationPendingBanner() {
  const router = useRouter();

  useEffect(() => {
    const t = setInterval(() => router.refresh(), 3000);
    return () => clearInterval(t);
  }, [router]);

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-center space-y-3">
      <div className="text-3xl">⏳</div>
      <p className="text-sm font-semibold text-amber-800">Activating your add-on…</p>
      <p className="text-xs text-amber-600 leading-relaxed">
        Your payment is processing. This page will update automatically in a few seconds.
      </p>
      <div className="flex justify-center gap-1">
        {[0, 1, 2].map((i) => (
          <span key={i} className="w-2 h-2 rounded-full bg-amber-400 animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }} />
        ))}
      </div>
    </div>
  );
}

export function RequestAccessButton() {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function request() {
    setLoading(true);
    await fetch("/api/phone/addon-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Contractor requested access to the AI Phone Receptionist add-on." }),
    });
    setSent(true);
    setLoading(false);
  }

  if (sent) return (
    <div className="w-full py-4 rounded-2xl bg-green-50 border border-green-200 text-center">
      <p className="text-sm font-semibold text-green-700">✓ Request sent!</p>
      <p className="text-xs text-green-600 mt-1">We'll be in touch shortly to get you set up.</p>
    </div>
  );

  return (
    <button onClick={request} disabled={loading}
      className="w-full py-4 rounded-2xl text-white font-bold text-base disabled:opacity-60"
      style={{ backgroundColor: "#1B3A6B" }}>
      {loading ? "Sending…" : "Request Access — $29/mo"}
    </button>
  );
}
