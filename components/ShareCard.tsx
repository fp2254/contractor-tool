"use client";

import { useState } from "react";

interface ShareCardProps {
  type: "quote" | "invoice";
  customerName: string;
  customerPhone: string | null;
  customerEmail: string | null;
  amount: number;
  customerId: string;
  portalToken: string | null;
  orgName: string;
  entityNumber?: string;
}

export function ShareCard({
  type,
  customerName,
  customerPhone,
  customerEmail,
  amount,
  customerId,
  portalToken: initialPortalToken,
  orgName,
  entityNumber,
}: ShareCardProps) {
  const [portalToken, setPortalToken] = useState<string | null>(initialPortalToken);
  const [textLoading, setTextLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const label = type === "quote" ? "Quote" : "Invoice";
  const firstName = customerName.split(" ")[0] || customerName;
  const amountStr = `$${Number(amount).toLocaleString()}`;

  function buildPortalUrl(token: string) {
    return `${typeof window !== "undefined" ? window.location.origin : ""}/portal/${token}`;
  }

  function buildSmsMessage(token: string | null) {
    const portalUrl = token ? buildPortalUrl(token) : null;
    const ref = entityNumber ? ` ${entityNumber}` : "";
    return portalUrl
      ? `Hi ${firstName}, your ${label.toLowerCase()}${ref} from ${orgName} is ready. View and approve it here: ${portalUrl}`
      : `Hi ${firstName}, your ${label.toLowerCase()}${ref} from ${orgName} is ready. Give us a call to go over the details!`;
  }

  function buildEmailMessage(token: string | null) {
    const portalUrl = token ? buildPortalUrl(token) : null;
    return portalUrl
      ? `Hi ${firstName}, your ${label.toLowerCase()} for ${amountStr} from ${orgName} is ready. View and approve it here: ${portalUrl}`
      : `Hi ${firstName}, your ${label.toLowerCase()} for ${amountStr} from ${orgName} is ready. Give us a call to go over the details!`;
  }

  async function ensureToken(): Promise<string | null> {
    try {
      const res = await fetch("/api/portal/generate-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer_id: customerId }),
      });
      if (!res.ok) return null;
      const j = await res.json() as { token?: string };
      if (j.token) {
        setPortalToken(j.token);
        return j.token;
      }
    } catch {
      // non-fatal
    }
    return null;
  }

  async function handleText() {
    setTextLoading(true);
    try {
      const token = await ensureToken();
      const msg = buildSmsMessage(token);
      const cleanPhone = customerPhone ? customerPhone.replace(/[^\d+]/g, "") : null;
      const smsUri = cleanPhone
        ? `sms:${cleanPhone}?body=${encodeURIComponent(msg)}`
        : `sms:?body=${encodeURIComponent(msg)}`;
      window.location.href = smsUri;
    } finally {
      setTextLoading(false);
    }
  }

  async function handleEmail() {
    const token = await ensureToken();
    const subject = encodeURIComponent(`Your ${label} from ${orgName}`);
    const body = encodeURIComponent(buildEmailMessage(token));
    const href = customerEmail
      ? `mailto:${customerEmail}?subject=${subject}&body=${body}`
      : `mailto:?subject=${subject}&body=${body}`;
    window.location.href = href;
  }

  const handleCopy = async () => {
    try {
      const token = await ensureToken();
      const url = token ? buildPortalUrl(token) : window.location.href;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      <p className="text-xs font-semibold text-gray-500 uppercase mb-3">
        Send {label}
      </p>
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={handleText}
          disabled={textLoading}
          className="flex flex-col items-center gap-1.5 bg-green-50 rounded-xl py-4 text-green-700 active:bg-green-100 disabled:opacity-40">
          {textLoading ? (
            <svg className="h-6 w-6 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          )}
          <span className="text-xs font-semibold">Text</span>
        </button>

        <button
          onClick={handleEmail}
          className="flex flex-col items-center gap-1.5 bg-blue-50 rounded-xl py-4 text-blue-700 active:bg-blue-100">
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <span className="text-xs font-semibold">Email</span>
        </button>

        <button
          onClick={handleCopy}
          className="flex flex-col items-center gap-1.5 bg-gray-50 rounded-xl py-4 text-gray-600 active:bg-gray-100">
          {copied ? (
            <svg viewBox="0 0 24 24" className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
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

      {(!customerPhone || !customerEmail) && (
        <p className="text-xs text-gray-400 text-center mt-3">
          {customerPhone && !customerEmail ? "Email will open without a pre-filled address." : ""}
          {!customerPhone && customerEmail ? "Text will open without a pre-filled number." : ""}
          {!customerPhone && !customerEmail ? "Text and email will open without pre-filled contact info." : ""}
        </p>
      )}
    </div>
  );
}
