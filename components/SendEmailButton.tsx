"use client";

import { useState } from "react";

export function SendEmailButton({
  apiPath,
  label,
  customerEmail,
}: {
  apiPath: string;
  label: string;
  customerEmail?: string | null;
}) {
  const [state, setState] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  if (!customerEmail) {
    return (
      <div className="space-y-1">
        <button
          disabled
          className="w-full rounded-xl py-3 text-white font-semibold opacity-40 cursor-not-allowed flex items-center justify-center gap-2"
          style={{ backgroundColor: "#1B3A6B" }}
        >
          ✉️ {label}
        </button>
        <p className="text-xs text-gray-400 text-center px-2">
          Add a customer email to enable.
        </p>
      </div>
    );
  }

  async function handleClick() {
    setState("loading");
    try {
      const res = await fetch(apiPath, { method: "POST" });
      const json = await res.json() as { error?: string };
      if (!res.ok) {
        setErrorMsg(json.error ?? "Failed to send email");
        setState("error");
      } else {
        setState("sent");
      }
    } catch {
      setErrorMsg("Network error. Please try again.");
      setState("error");
    }
  }

  if (state === "sent") {
    return (
      <div className="rounded-xl bg-blue-50 border border-blue-100 px-4 py-3 text-center">
        <p className="text-blue-700 font-semibold text-sm">✅ Sent to {customerEmail}</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <button
        onClick={handleClick}
        disabled={state === "loading"}
        className="w-full rounded-xl py-3 text-white font-semibold disabled:opacity-60 flex items-center justify-center gap-2"
        style={{ backgroundColor: "#1B3A6B" }}
      >
        {state === "loading" ? (
          <>
            <span className="inline-block h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
            Sending…
          </>
        ) : (
          <>✉️ {label}</>
        )}
      </button>
      {state === "error" && (
        <p className="text-xs text-red-500 text-center px-2">{errorMsg}</p>
      )}
    </div>
  );
}
