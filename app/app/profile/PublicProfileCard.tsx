"use client";

import { useState } from "react";
import Link from "next/link";

const BASE_URL = "https://tradebase.contractors/pro";

type Props = {
  initialProfile: {
    slug: string;
    is_published: boolean;
  } | null;
};

export function PublicProfileCard({ initialProfile }: Props) {
  const [profile, setProfile] = useState(initialProfile);
  const [publishing, setPublishing] = useState(false);
  const [copied, setCopied] = useState(false);

  const publicUrl = profile?.slug ? `${BASE_URL}/${profile.slug}` : null;

  async function handleToggle() {
    if (!profile?.slug) return;
    setPublishing(true);
    try {
      const res = await fetch("/api/profile/public-profile/publish", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_published: !profile.is_published }),
      });
      const j = await res.json();
      if (res.ok) {
        setProfile((p) => p ? { ...p, is_published: j.is_published } : p);
      } else {
        alert(j.error ?? "Failed to toggle. Save your profile first.");
      }
    } catch {
      alert("Network error — please try again");
    } finally {
      setPublishing(false);
    }
  }

  function copyLink() {
    if (!publicUrl) return;
    navigator.clipboard.writeText(publicUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="space-y-3">
      {/* Status row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={`inline-block w-2.5 h-2.5 rounded-full ${profile?.is_published ? "bg-green-500" : "bg-gray-300"}`}
          />
          <span className={`text-sm font-bold ${profile?.is_published ? "text-green-700" : "text-gray-500"}`}>
            {profile?.is_published ? "Live" : profile?.slug ? "Unpublished" : "Not set up"}
          </span>
        </div>
        {profile?.slug && (
          <button
            onClick={handleToggle}
            disabled={publishing}
            className="text-xs font-bold px-3 py-1.5 rounded-lg border transition-colors"
            style={
              profile.is_published
                ? { borderColor: "#FCA5A5", color: "#DC2626", background: "#FEF2F2" }
                : { borderColor: "#1B3A6B", color: "#1B3A6B", background: "#EFF6FF" }
            }
          >
            {publishing ? "…" : profile.is_published ? "Unpublish" : "Publish"}
          </button>
        )}
      </div>

      {/* URL */}
      {publicUrl ? (
        <p className="text-xs text-gray-400 break-all font-mono">{publicUrl}</p>
      ) : (
        <p className="text-xs text-gray-400">No public URL yet — edit your public profile to get started.</p>
      )}

      {/* Actions */}
      <div className="grid grid-cols-2 gap-2">
        {publicUrl ? (
          <a
            href={publicUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-center text-xs font-semibold rounded-xl py-2.5 border border-gray-200 text-slate-700 bg-gray-50"
          >
            View Page ↗
          </a>
        ) : (
          <div className="text-center text-xs font-semibold rounded-xl py-2.5 border border-gray-100 text-gray-300 bg-gray-50 cursor-not-allowed">
            View Page ↗
          </div>
        )}
        <button
          onClick={copyLink}
          disabled={!publicUrl}
          className="text-xs font-semibold rounded-xl py-2.5 border transition-colors disabled:opacity-40"
          style={
            copied
              ? { borderColor: "#22C55E", color: "#16A34A", background: "#F0FDF4" }
              : { borderColor: "#E5E7EB", color: "#374151", background: "#F9FAFB" }
          }
        >
          {copied ? "✓ Copied!" : "Copy Link"}
        </button>
      </div>

      {/* Edit CTA */}
      <Link
        href="/app/profile/public-profile"
        className="flex items-center justify-between w-full rounded-xl px-4 py-3 text-sm font-semibold text-white active:opacity-80 transition-opacity"
        style={{ backgroundColor: "#1B3A6B" }}
      >
        {profile?.slug ? "Edit Public Profile" : "Set Up Public Profile"}
        <span className="text-base leading-none">›</span>
      </Link>
    </div>
  );
}
