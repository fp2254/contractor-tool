"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function SquareConnectSection({
  connected,
  alert,
  merchantId,
}: {
  connected: boolean;
  alert: string | null;
  merchantId: string | null;
}) {
  const router = useRouter();
  const [disconnecting, setDisconnecting] = useState(false);

  async function handleDisconnect() {
    setDisconnecting(true);
    await fetch("/api/square/disconnect", { method: "POST" });
    router.refresh();
    setDisconnecting(false);
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Integrations</p>
      </div>

      <div className="px-4 py-4">
        {alert === "error" && (
          <div className="mb-3 rounded-xl bg-red-50 border border-red-200 px-3 py-2">
            <p className="text-sm text-red-700 font-medium">Square connection failed. Please try again.</p>
          </div>
        )}
        {alert === "connected" && (
          <div className="mb-3 rounded-xl bg-green-50 border border-green-200 px-3 py-2">
            <p className="text-sm text-green-700 font-medium">✅ Square connected successfully!</p>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Square logo mark */}
            <div className="h-9 w-9 rounded-lg bg-black flex items-center justify-center flex-shrink-0">
              <svg viewBox="0 0 24 24" className="h-5 w-5 fill-white">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <rect x="8" y="8" width="8" height="8" rx="1" fill="black" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">Square</p>
              {connected && merchantId ? (
                <p className="text-xs text-gray-400">Merchant {merchantId.slice(0, 12)}…</p>
              ) : connected ? (
                <p className="text-xs text-green-600 font-medium">Connected</p>
              ) : (
                <p className="text-xs text-gray-400">Accept card payments on invoices</p>
              )}
            </div>
          </div>

          {connected ? (
            <button
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="rounded-xl px-4 py-2 text-sm font-semibold bg-red-50 text-red-600 border border-red-200 disabled:opacity-50">
              {disconnecting ? "…" : "Disconnect"}
            </button>
          ) : (
            <a
              href="/api/square/connect"
              className="rounded-xl px-4 py-2 text-sm font-semibold text-white"
              style={{ backgroundColor: "#1B3A6B" }}>
              Connect
            </a>
          )}
        </div>

        {!connected && (
          <p className="mt-3 text-xs text-gray-400">
            Connect your Square account to generate payment links directly from invoices. Customers pay by card — you mark it paid.
          </p>
        )}
      </div>
    </div>
  );
}
