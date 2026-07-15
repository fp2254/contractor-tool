"use client";

import { useState } from "react";
import Link from "next/link";

type Source = "external" | "tradebase";

type Props = {
  initialSource: Source;
  externalUrl: string | null;
  tradebaseUrl: string;
  tradebaseLabel: string;
};

export function WebsiteToggle({ initialSource, externalUrl, tradebaseUrl, tradebaseLabel }: Props) {
  const [source, setSource] = useState<Source>(initialSource);
  const [saving, setSaving] = useState(false);

  async function toggle(next: Source) {
    if (next === source || saving) return;
    setSaving(true);
    setSource(next);
    try {
      await fetch("/api/settings/website-preference", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: next }),
      });
    } finally {
      setSaving(false);
    }
  }

  const activeUrl = source === "external" && externalUrl ? externalUrl : tradebaseUrl;
  const isExternal = source === "external" && !!externalUrl;

  return (
    <div className="flex flex-col gap-2">
      {isExternal ? (
        <a
          href={activeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col items-center justify-center gap-1.5 rounded-2xl py-4 px-3 text-white shadow-sm"
          style={{ backgroundColor: "#1B3A6B" }}
        >
          <span className="text-2xl">🏢</span>
          <span className="text-[13px] font-bold">My Website</span>
          <span className="text-[10px] opacity-70 truncate max-w-full px-1">
            {activeUrl.replace(/^https?:\/\//, "")}
          </span>
        </a>
      ) : (
        <Link
          href={activeUrl}
          className="flex flex-col items-center justify-center gap-1.5 rounded-2xl py-4 px-3 text-white shadow-sm"
          style={{ backgroundColor: "#1B3A6B" }}
        >
          <span className="text-2xl">🏢</span>
          <span className="text-[13px] font-bold">My Website</span>
          <span className="text-[10px] opacity-70 truncate max-w-full px-1">
            {tradebaseLabel}
          </span>
        </Link>
      )}

      {/* Toggle — only show if they have an external URL */}
      {externalUrl && (
        <div className="flex rounded-xl overflow-hidden border border-gray-200 bg-white text-[11px] font-semibold">
          <button
            onClick={() => toggle("external")}
            className="flex-1 py-1.5 transition-colors"
            style={{
              backgroundColor: source === "external" ? "#1B3A6B" : "transparent",
              color: source === "external" ? "white" : "#6B7280",
            }}
          >
            My Site
          </button>
          <button
            onClick={() => toggle("tradebase")}
            className="flex-1 py-1.5 transition-colors"
            style={{
              backgroundColor: source === "tradebase" ? "#1B3A6B" : "transparent",
              color: source === "tradebase" ? "white" : "#6B7280",
            }}
          >
            TradeBase Page
          </button>
        </div>
      )}
    </div>
  );
}
