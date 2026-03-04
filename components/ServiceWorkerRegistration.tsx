"use client";

import { useEffect } from "react";

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then((reg) => {
          console.log("[TradeBase] Service worker registered:", reg.scope);
        })
        .catch((err) => {
          console.warn("[TradeBase] Service worker registration failed:", err);
        });
    }
  }, []);

  return null;
}
