"use client";

import { useEffect, useState } from "react";

type Platform = "ios" | "android" | "other";

function detect(): { platform: Platform; standalone: boolean } {
  const ua = navigator.userAgent;
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true;
  if (/iphone|ipad|ipod/i.test(ua)) return { platform: "ios", standalone };
  if (/android/i.test(ua)) return { platform: "android", standalone };
  return { platform: "other", standalone };
}

export default function InstallPrompt() {
  const [ready, setReady] = useState(false);
  const [platform, setPlatform] = useState<Platform>("other");
  const [installed, setInstalled] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showIOS, setShowIOS] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const { platform: p, standalone } = detect();
    setPlatform(p);
    setInstalled(standalone);
    setReady(true);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler as EventListener);
    window.addEventListener("appinstalled", () => setInstalled(true));
    return () => {
      window.removeEventListener("beforeinstallprompt", handler as EventListener);
    };
  }, []);

  if (!ready || installed || dismissed) return null;

  const isAndroidReady = platform === "android" && deferredPrompt;
  const isIOS = platform === "ios";

  if (!isAndroidReady && !isIOS) return null;

  return (
    <>
      <div className="mb-4 rounded-2xl overflow-hidden shadow-sm border border-blue-100 bg-gradient-to-br from-blue-50 to-white">
        <div className="flex items-center gap-3 px-4 pt-4 pb-3">
          <div className="h-11 w-11 rounded-xl bg-[#1B3A6B] flex items-center justify-center text-2xl shrink-0 shadow-sm">
            📲
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-800 leading-tight">Add TradeBase to your home screen</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Open instantly like a real app — no browser needed</p>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="text-slate-400 text-xl leading-none px-1 shrink-0"
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>

        <div className="px-4 pb-4">
          {isAndroidReady && (
            <button
              onClick={async () => {
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                setDeferredPrompt(null);
                if (outcome === "accepted") setInstalled(true);
              }}
              className="w-full py-2.5 rounded-xl text-white text-sm font-semibold"
              style={{ backgroundColor: "#1B3A6B" }}
            >
              Add to Home Screen
            </button>
          )}

          {isIOS && !showIOS && (
            <button
              onClick={() => setShowIOS(true)}
              className="w-full py-2.5 rounded-xl text-white text-sm font-semibold"
              style={{ backgroundColor: "#1B3A6B" }}
            >
              Show me how
            </button>
          )}

          {isIOS && showIOS && (
            <ol className="space-y-2 mt-1">
              {[
                { icon: "⬆️", text: <>Tap the <strong>Share</strong> button at the bottom of Safari</> },
                { icon: "⬇️", text: <>Scroll down and tap <strong>Add to Home Screen</strong></> },
                { icon: "✅", text: <>Tap <strong>Add</strong> in the top right</> },
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="text-base shrink-0 mt-0.5">{step.icon}</span>
                  <span className="text-[12px] text-slate-600 leading-snug">{step.text}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </>
  );
}
