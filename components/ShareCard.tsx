"use client";

import { useState } from "react";

interface ShareCardProps {
  type: "quote" | "invoice";
  customerName: string;
  customerPhone: string | null;
  customerEmail: string | null;
  amount: number;
  portalToken: string | null;
  orgName: string;
}

export function ShareCard({
  type,
  customerName,
  customerPhone,
  customerEmail,
  amount,
  portalToken,
  orgName,
}: ShareCardProps) {
  const [copied, setCopied] = useState(false);

  const label = type === "quote" ? "Quote" : "Invoice";
  const firstName = customerName.split(" ")[0] || customerName;
  const amountStr = `$${Number(amount).toLocaleString()}`;

  const portalUrl = portalToken
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/portal/${portalToken}`
    : null;

  const message = portalUrl
    ? `Hi ${firstName}, here's your ${label.toLowerCase()} for ${amountStr} from ${orgName}. View and approve it here: ${portalUrl}`
    : `Hi ${firstName}, your ${label.toLowerCase()} for ${amountStr} from ${orgName} is ready. Give us a call to go over the details!`;

  const smsHref = `sms:${customerPhone ?? ""}?body=${encodeURIComponent(message)}`;
  const emailHref = `mailto:${customerEmail ?? ""}?subject=${encodeURIComponent(`Your ${label} from ${orgName}`)}&body=${encodeURIComponent(message)}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(
        portalUrl ?? window.location.href
      );
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
        <a
          href={smsHref}
          className="flex flex-col items-center gap-1.5 bg-green-50 rounded-xl py-4 text-green-700 active:bg-green-100"
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <span className="text-xs font-semibold">Text</span>
        </a>

        <a
          href={emailHref}
          className="flex flex-col items-center gap-1.5 bg-blue-50 rounded-xl py-4 text-blue-700 active:bg-blue-100"
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <span className="text-xs font-semibold">Email</span>
        </a>

        <button
          onClick={handleCopy}
          className="flex flex-col items-center gap-1.5 bg-gray-50 rounded-xl py-4 text-gray-600 active:bg-gray-100"
        >
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

      {!customerPhone && !customerEmail && (
        <p className="text-xs text-gray-400 text-center mt-3">
          Add a phone or email to the customer to pre-fill the message.
        </p>
      )}
    </div>
  );
}
