"use client";

import { useState } from "react";

export function CopyLinkButton({ path }: { path: string }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    const url = `${window.location.origin}${path}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const url = typeof window !== "undefined" ? `${window.location.origin}${path}` : path;

  return (
    <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2 border border-gray-200">
      <span className="flex-1 text-xs text-gray-500 truncate">{url}</span>
      <button
        onClick={copy}
        className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors"
        style={{ backgroundColor: copied ? "#22C55E" : "#1B3A6B", color: "white" }}>
        {copied ? "Copied!" : "Copy"}
      </button>
    </div>
  );
}
