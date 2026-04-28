"use client";

import { useRef, useState } from "react";

type Props = {
  contractorName: string;
  open: boolean;
  onClose: () => void;
  accentColor?: string;
};

type FormState = "idle" | "submitting" | "success";

export function SharedQuoteModal({ contractorName, open, onClose, accentColor = "#f5a623" }: Props) {
  const firstName = contractorName.split(" ")[0] || contractorName;
  const overlayRef = useRef<HTMLDivElement>(null);
  const [form, setForm] = useState({ name: "", phone: "", description: "" });
  const [state, setState] = useState<FormState>("idle");

  function handleOverlayClick(e: React.MouseEvent) {
    if (e.target === overlayRef.current) handleClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState("submitting");
    console.log("[QuoteModal] submission:", form);
    await new Promise((r) => setTimeout(r, 600));
    setState("success");
  }

  function handleClose() {
    setState("idle");
    setForm({ name: "", phone: "", description: "" });
    onClose();
  }

  if (!open) return null;

  const inputStyle: React.CSSProperties = {
    width: "100%",
    border: "1.5px solid #e2e8f0",
    borderRadius: 8,
    padding: "13px 14px",
    fontSize: 16,
    color: "#1a2035",
    outline: "none",
    WebkitAppearance: "none",
    boxSizing: "border-box",
    fontFamily: "inherit",
  };

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
      <style>{`@keyframes sqSlideUp { from { transform: translateY(100%) } to { transform: translateY(0) } }`}</style>
      <div
        style={{
          background: "white",
          width: "100%",
          maxWidth: 480,
          borderRadius: "20px 20px 0 0",
          padding: "24px 24px 40px",
          position: "relative",
          animation: "sqSlideUp 0.28s ease",
        }}
      >
        <div style={{ width: 40, height: 4, background: "#e2e8f0", borderRadius: 2, margin: "0 auto 20px" }} />
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
            color: "#8a9ab5",
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
            <div style={{ fontWeight: 800, fontSize: 24, color: "#0f1f3d", marginBottom: 8 }}>Request Sent!</div>
            <p style={{ fontSize: 14, color: "#8a9ab5", lineHeight: 1.5, marginBottom: 24 }}>
              {firstName} will get back to you within a few hours.
            </p>
            <button
              onClick={handleClose}
              style={{
                background: accentColor,
                color: "#0f1f3d",
                fontWeight: 800,
                fontSize: 17,
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
            <div style={{ fontWeight: 800, fontSize: 24, color: "#0f1f3d", marginBottom: 4 }}>Get a Free Quote</div>
            <p style={{ fontSize: 13, color: "#8a9ab5", marginBottom: 18 }}>
              {firstName} will get back to you within a few hours
            </p>
            {[
              { label: "Your Name", key: "name", type: "text", placeholder: "John Smith" },
              { label: "Phone Number", key: "phone", type: "tel", placeholder: "(555) 000-0000" },
            ].map(({ label, key, type, placeholder }) => (
              <div key={key} style={{ marginBottom: 13 }}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#0f1f3d", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>
                  {label}
                </label>
                <input
                  type={type}
                  required
                  placeholder={placeholder}
                  value={form[key as keyof typeof form]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  style={inputStyle}
                />
              </div>
            ))}
            <div style={{ marginBottom: 13 }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#0f1f3d", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>
                What do you need done?
              </label>
              <textarea
                required
                placeholder="Describe your project..."
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={3}
                style={{ ...inputStyle, resize: "none", height: 88 }}
              />
            </div>
            <button
              type="submit"
              disabled={state === "submitting"}
              style={{
                width: "100%",
                background: state === "submitting" ? "#d4a020" : accentColor,
                color: "#0f1f3d",
                fontWeight: 800,
                fontSize: 18,
                padding: 17,
                border: "none",
                borderRadius: 10,
                cursor: state === "submitting" ? "not-allowed" : "pointer",
                marginTop: 6,
              }}
            >
              {state === "submitting" ? "Sending…" : "Send My Request"}
            </button>
            <p style={{ textAlign: "center", fontSize: 11, color: "#8a9ab5", marginTop: 9 }}>
              Free estimates · No obligation · Your info goes directly to {firstName}
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
