"use client";

import { useState, useEffect, useCallback, useRef } from "react";

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
  const [leadPhone, setLeadPhone] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [takingOver, setTakingOver] = useState(false);

  // Reply box state
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/sms/thread?leadId=${encodeURIComponent(leadId)}`);
      if (!res.ok) return;
      const data = await res.json();
      setConversation(data.conversation ?? null);
      setMessages(data.messages ?? []);
      setLeadPhone(data.leadPhone ?? null);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => { load(); }, [load]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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

  async function sendReply() {
    if (!replyText.trim() || sending) return;
    setSendError(null);
    setSending(true);

    const payload: Record<string, string> = { message: replyText.trim() };
    if (conversation) {
      payload.conversationId = conversation.id;
    } else {
      payload.leadId = leadId;
    }

    // Optimistic update
    const optimisticId = `opt-${Date.now()}`;
    const optimisticMsg: SmsMessage = {
      id: optimisticId,
      direction: "outbound",
      body: replyText.trim(),
      sent_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMsg]);
    setReplyText("");

    try {
      const res = await fetch("/api/sms/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        // Roll back optimistic message
        setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
        setReplyText(optimisticMsg.body);
        setSendError(data.error ?? "Failed to send message");
        return;
      }

      // Replace optimistic message with real one from server
      if (data.message) {
        setMessages((prev) =>
          prev.map((m) => (m.id === optimisticId ? data.message : m))
        );
      }

      // If we just created the first conversation, update local state
      if (!conversation && data.conversationId) {
        // Reload to get full conversation data
        load();
      } else if (conversation && conversation.status !== "handed_off" && data.ok) {
        setConversation((prev) => prev ? { ...prev, status: "handed_off" } : prev);
      }
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      setReplyText(optimisticMsg.body);
      setSendError("Network error — please try again");
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendReply();
    }
  }

  if (loading) return null;

  // Show the reply box when:
  // 1. No conversation exists yet (contractor wants to initiate) — only if lead has a phone
  // 2. Conversation is handed_off (contractor has taken over from AI)
  const canReply =
    (!conversation && !!leadPhone) ||
    (conversation?.status === "handed_off");

  // Don't render if there's no conversation and lead has no phone
  if (!conversation && !leadPhone) return null;

  // If no conversation and lead has phone, show a minimal "start a thread" card
  if (!conversation) {
    return (
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-700">💬 SMS</span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
            No thread yet
          </span>
        </div>
        <div className="p-4">
          <p className="text-sm text-gray-400 text-center py-2 mb-3">No messages yet.</p>
          <ReplyBox
            value={replyText}
            onChange={setReplyText}
            onSend={sendReply}
            onKeyDown={handleKeyDown}
            sending={sending}
            error={sendError}
            placeholder={`Text ${leadPhone}…`}
          />
        </div>
      </div>
    );
  }

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
        <div ref={messagesEndRef} />
      </div>

      {conversation.status === "opted_out" && (
        <div className="px-4 py-2 bg-red-50 border-t border-red-100">
          <p className="text-xs text-red-500">This customer has opted out of SMS messages.</p>
        </div>
      )}

      {canReply && (
        <div className="px-4 pb-4 pt-2 border-t border-gray-100">
          <ReplyBox
            value={replyText}
            onChange={setReplyText}
            onSend={sendReply}
            onKeyDown={handleKeyDown}
            sending={sending}
            error={sendError}
            placeholder="Type a message… (Enter to send)"
          />
        </div>
      )}
    </div>
  );
}

// ── Extracted reply box so it can be reused for both "no conversation" and "handed_off" states ──

interface ReplyBoxProps {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  sending: boolean;
  error: string | null;
  placeholder?: string;
}

function ReplyBox({ value, onChange, onSend, onKeyDown, sending, error, placeholder }: ReplyBoxProps) {
  return (
    <div className="space-y-1.5">
      {error && (
        <p className="text-xs text-red-500 px-1">{error}</p>
      )}
      <div className="flex gap-2 items-end">
        <textarea
          className="flex-1 resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm text-slate-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300 min-h-[40px] max-h-32"
          rows={1}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder ?? "Type a message…"}
          disabled={sending}
        />
        <button
          onClick={onSend}
          disabled={sending || !value.trim()}
          className="flex-shrink-0 text-sm font-semibold text-white px-4 py-2 rounded-xl disabled:opacity-40 transition-opacity"
          style={{ backgroundColor: "#1B3A6B" }}
        >
          {sending ? "…" : "Send"}
        </button>
      </div>
      <p className="text-[10px] text-gray-400 px-1">
        Enter to send · Shift+Enter for new line
      </p>
    </div>
  );
}
