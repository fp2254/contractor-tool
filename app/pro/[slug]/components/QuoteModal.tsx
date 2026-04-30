"use client";

import { useRef, useState } from "react";

const C = {
  navy: "#0f1f3d",
  gold: "#f5a623",
  lightGray: "#e8ecf2",
  gray: "#8a9ab5",
  blue: "#1e4a8c",
};

type Props = {
  contractorName: string;
  slug: string;
  open: boolean;
  onClose: () => void;
  condensedFont: string;
};

type FormState = "idle" | "submitting" | "success";

export function QuoteModal({ contractorName, slug, open, onClose, condensedFont }: Props) {
  const firstName = contractorName.split(" ")[0];
  const overlayRef = useRef<HTMLDivElement>(null);
  const [form, setForm] = useState({ name: "", phone: "", description: "" });
  const [state, setState] = useState<FormState>("idle");

  function handleOverlayClick(e: React.MouseEvent) {
    if (e.target === overlayRef.current) onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState("submitting");
    try {
      await fetch("/api/public/quote-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, ...form }),
      });
    } catch {
      // fail silently — still show success to the visitor
    }
    setState("success");
  }

  function handleClose() {
    setState("idle");
    setForm({ name: "", phone: "", description: "" });
    onClose();
  }

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        zIndex: 100,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          background: "white",
          width: "100%",
          maxWidth: 480,
          borderRadius: "20px 20px 0 0",
          padding: "24px 24px 36px",
          position: "relative",
          animation: "proSlideUp 0.28s ease",
        }}
      >
        <style>{`@keyframes proSlideUp { from { transform: translateY(100%) } to { transform: translateY(0) } }`}</style>

        {/* Handle */}
        <div
          style={{
            width: 40,
            height: 4,
            background: C.lightGray,
            borderRadius: 2,
            margin: "0 auto 20px",
          }}
        />

        {/* Close */}
        <button
          onClick={handleClose}
          style={{
            position: "absolute",
            top: 18,
            right: 18,
            background: "#f4f5f7",
            border: "none",
            width: 30,
            height: 30,
            borderRadius: "50%",
            fontSize: 15,
            color: C.gray,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          ✕
        </button>

        {state === "success" ? (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
            <div
              className={condensedFont}
              style={{ fontWeight: 800, fontSize: 26, color: C.navy, textTransform: "uppercase", marginBottom: 8 }}
            >
              Request Sent!
            </div>
            <p style={{ fontSize: 14, color: C.gray, lineHeight: 1.5, marginBottom: 24 }}>
              {firstName} will get back to you within a few hours.
            </p>
            <button
              onClick={handleClose}
              className={condensedFont}
              style={{
                background: C.gold,
                color: C.navy,
                fontWeight: 800,
                fontSize: 17,
                textTransform: "uppercase",
                letterSpacing: 1,
                padding: "14px 32px",
                border: "none",
                borderRadius: 10,
                cursor: "pointer",
              }}
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div
              className={condensedFont}
              style={{ fontWeight: 800, fontSize: 26, color: C.navy, textTransform: "uppercase", marginBottom: 4 }}
            >
              Get a Free Quote
            </div>
            <p style={{ fontSize: 13, color: C.gray, marginBottom: 18 }}>
              {firstName} will get back to you within a few hours
            </p>

            <div style={{ marginBottom: 13 }}>
              <label
                style={{
                  display: "block",
                  fontSize: 11,
                  fontWeight: 700,
                  color: C.navy,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  marginBottom: 6,
                }}
              >
                Your Name
              </label>
              <input
                type="text"
                required
                placeholder="John Smith"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                style={{
                  width: "100%",
                  border: `1.5px solid ${C.lightGray}`,
                  borderRadius: 8,
                  padding: "13px 14px",
                  fontSize: 16,
                  color: "#1a2035",
                  outline: "none",
                  WebkitAppearance: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div style={{ marginBottom: 13 }}>
              <label
                style={{
                  display: "block",
                  fontSize: 11,
                  fontWeight: 700,
                  color: C.navy,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  marginBottom: 6,
                }}
              >
                Phone Number
              </label>
              <input
                type="tel"
                required
                placeholder="(555) 000-0000"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                style={{
                  width: "100%",
                  border: `1.5px solid ${C.lightGray}`,
                  borderRadius: 8,
                  padding: "13px 14px",
                  fontSize: 16,
                  color: "#1a2035",
                  outline: "none",
                  WebkitAppearance: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div style={{ marginBottom: 13 }}>
              <label
                style={{
                  display: "block",
                  fontSize: 11,
                  fontWeight: 700,
                  color: C.navy,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  marginBottom: 6,
                }}
              >
                What do you need done?
              </label>
              <textarea
                required
                placeholder="Describe your project..."
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={3}
                style={{
                  width: "100%",
                  border: `1.5px solid ${C.lightGray}`,
                  borderRadius: 8,
                  padding: "13px 14px",
                  fontSize: 16,
                  color: "#1a2035",
                  outline: "none",
                  resize: "none",
                  WebkitAppearance: "none",
                  boxSizing: "border-box",
                  height: 88,
                  fontFamily: "inherit",
                }}
              />
            </div>

            <button
              type="submit"
              disabled={state === "submitting"}
              className={condensedFont}
              style={{
                width: "100%",
                background: state === "submitting" ? "#d4a020" : C.gold,
                color: C.navy,
                fontWeight: 800,
                fontSize: 19,
                textTransform: "uppercase",
                letterSpacing: 1,
                padding: 17,
                border: "none",
                borderRadius: 10,
                cursor: state === "submitting" ? "not-allowed" : "pointer",
                marginTop: 6,
              }}
            >
              {state === "submitting" ? "Sending…" : "Send My Request"}
            </button>

            <p style={{ textAlign: "center", fontSize: 11, color: C.gray, marginTop: 9 }}>
              Free estimates · No obligation · Your info goes directly to {firstName}
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
