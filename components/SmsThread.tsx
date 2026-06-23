"use client";

import { useState, useEffect, useCallback } from "react";

interface SmsMessage {
  id: string;
  direction: "inbound" | "outbound";
  body: string;
  sent_at: string;
}

interface SmsConversation {
  id: string;
  status: "active" | "handed_off" | "opted_out" | "exhausted";
  from_number: string;
  to_number: string;
  created_at: string;
}

interface Props {
  leadId: string;
}

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  if (diffDays === 1) return `Yesterday ${d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
  return d.toLocaleDateString([], { month: "short", day: "numeric" }) +
    " " + d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  active: { label: "AI Active", cls: "bg-green-100 text-green-700" },
  handed_off: { label: "Handed Off", cls: "bg-blue-100 text-blue-700" },
  opted_out: { label: "Opted Out", cls: "bg-red-100 text-red-600" },
  exhausted: { label: "Rate Limited", cls: "bg-yellow-100 text-yellow-700" },
};

export function SmsThread({ leadId }: Props) {
  const [conversation, setConversation] = useState<SmsConversation | null>(null);
  const [messages, setMessages] = useState<SmsMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [takingOver, setTakingOver] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/sms/thread?leadId=${encodeURIComponent(leadId)}`);
      if (!res.ok) return;
      const data = await res.json();
      setConversation(data.conversation ?? null);
      setMessages(data.messages ?? []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => { load(); }, [load]);

  async function takeOver() {
    if (!conversation) return;
    setTakingOver(true);
    try {
      const res = await fetch("/api/sms/take-over", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: conversation.id }),
      });
      if (res.ok) {
        setConversation((prev) => prev ? { ...prev, status: "handed_off" } : prev);
      }
    } catch {
      // silent
    } finally {
      setTakingOver(false);
    }
  }

  if (loading) return null;
  if (!conversation) return null;

  const badge = STATUS_BADGE[conversation.status] ?? { label: conversation.status, cls: "bg-gray-100 text-gray-600" };

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-700">💬 SMS Thread</span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badge.cls}`}>
            {badge.label}
          </span>
        </div>
        {conversation.status === "active" && (
          <button
            onClick={takeOver}
            disabled={takingOver}
            className="text-xs font-semibold text-white px-3 py-1.5 rounded-lg disabled:opacity-50"
            style={{ backgroundColor: "#1B3A6B" }}
          >
            {takingOver ? "…" : "Take Over"}
          </button>
        )}
      </div>

      <div className="p-4 space-y-3 max-h-80 overflow-y-auto">
        {messages.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-2">No messages yet.</p>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.direction === "outbound" ? "items-end" : "items-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                msg.direction === "outbound"
                  ? "text-white rounded-br-sm"
                  : "bg-gray-100 text-slate-800 rounded-bl-sm"
              }`}
              style={msg.direction === "outbound" ? { backgroundColor: "#1B3A6B" } : undefined}
            >
              {msg.body}
            </div>
            <span className="text-[10px] text-gray-400 mt-0.5 px-1">
              {msg.direction === "outbound" ? "You · " : "Customer · "}
              {formatTime(msg.sent_at)}
            </span>
          </div>
        ))}
      </div>

      {conversation.status === "handed_off" && (
        <div className="px-4 py-2 bg-blue-50 border-t border-blue-100">
          <p className="text-xs text-blue-600">
            AI is paused — you have taken over this conversation. Reply directly by texting the customer.
          </p>
        </div>
      )}
      {conversation.status === "opted_out" && (
        <div className="px-4 py-2 bg-red-50 border-t border-red-100">
          <p className="text-xs text-red-500">This customer has opted out of SMS messages.</p>
        </div>
      )}
    </div>
  );
}
