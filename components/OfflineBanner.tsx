"use client";

import { useEffect, useState } from "react";

type Status = "online" | "offline" | "restored";

export function OfflineBanner() {
  const [status, setStatus] = useState<Status>("online");

  useEffect(() => {
    if (typeof navigator === "undefined") return;

    // Set initial state
    if (!navigator.onLine) setStatus("offline");

    function handleOffline() {
      setStatus("offline");
    }

    function handleOnline() {
      setStatus("restored");
      // Flash "back online" for 3 seconds then hide
      setTimeout(() => setStatus("online"), 3000);
    }

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  if (status === "online") return null;

  if (status === "restored") {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white"
        style={{ backgroundColor: "#22C55E" }}>
        <span>✓</span>
        <span>Back online</span>
      </div>
    );
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white"
      style={{ backgroundColor: "#92400E" }}>
      <span>📡</span>
      <span>You're offline — showing cached data</span>
    </div>
  );
}
