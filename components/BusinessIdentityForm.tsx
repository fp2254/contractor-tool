"use client";

import { useRef, useState } from "react";

export interface BusinessIdentityData {
  business_name: string;
  dba_name: string;
  primary_phone: string;
  business_email: string;
  website: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  license_number: string;
  insurance_number: string;
  epa_cert_number: string;
  service_area: string;
  owner_name: string;
  owner_title: string;
  signature_footer: string;
  logo_url: string;
}

type CardScanResult = {
  name: string;
  company: string;
  phone: string;
  email: string;
  website: string;
  address: string;
  trade: string;
};

const inputCls = "w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white";
const labelCls = "block text-xs font-semibold text-gray-500 uppercase mb-1";
const gridCls = "grid grid-cols-2 gap-3";

/** Parse "123 Main St, Portland, ME 04101" into parts */
function parseAddress(raw: string): { address: string; city: string; state: string; zip: string } {
  const m = raw.match(/^(.+),\s*([^,]+),\s*([A-Z]{2})\s+(\d{5}(?:-\d{4})?)$/i);
  if (m) return { address: m[1].trim(), city: m[2].trim(), state: m[3].toUpperCase(), zip: m[4].trim() };
  // Fallback: try just "street, city, state zip"
  const parts = raw.split(",").map(s => s.trim());
  if (parts.length >= 3) {
    const last = parts[parts.length - 1];
    const stateZip = last.match(/([A-Z]{2})\s+(\d{5})/i);
    if (stateZip) {
      return {
        address: parts[0],
        city: parts[parts.length - 2],
        state: stateZip[1].toUpperCase(),
        zip: stateZip[2],
      };
    }
  }
  return { address: raw, city: "", state: "", zip: "" };
}

export function BusinessIdentityForm({ initial }: { initial: BusinessIdentityData }) {
  const [data, setData] = useState<BusinessIdentityData>(initial);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [geocoded, setGeocoded] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  /* ── Card scan state ── */
  const cardInputRef = useRef<HTMLInputElement>(null);
  const [cardPhase, setCardPhase] = useState<"idle" | "scanning" | "preview" | "error">("idle");
  const [cardResult, setCardResult] = useState<CardScanResult | null>(null);
  const [cardError, setCardError] = useState("");

  function field(name: keyof BusinessIdentityData) {
    return {
      value: data[name],
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setData((prev) => ({ ...prev, [name]: e.target.value })),
    };
  }

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const localPreview = URL.createObjectURL(file);
    setData((prev) => ({ ...prev, logo_url: localPreview }));
    setUploadingLogo(true);

    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload/logo", { method: "POST", body: fd });
      const json = await res.json() as { url?: string; error?: string };
      if (!res.ok || json.error) throw new Error(json.error ?? "Upload failed");
      setData((prev) => ({ ...prev, logo_url: json.url! }));
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Logo upload failed");
      setStatus("error");
      setData((prev) => ({ ...prev, logo_url: initial.logo_url }));
    } finally {
      setUploadingLogo(false);
    }
  }

  async function handleCardFile(file: File) {
    setCardPhase("scanning");
    setCardError("");

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => resolve(e.target!.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    try {
      const res = await fetch("/api/ai/card-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_data_url: dataUrl }),
      });
      const json = await res.json() as CardScanResult & { error?: string };
      if (!res.ok || json.error) throw new Error(json.error ?? "Scan failed");
      setCardResult(json);
      setCardPhase("preview");
    } catch (e: unknown) {
      setCardError(e instanceof Error ? e.message : "Card scan failed");
      setCardPhase("error");
    }
  }

  function applyCardResult() {
    if (!cardResult) return;
    setData(prev => {
      const next = { ...prev };
      if (cardResult.company) next.business_name = cardResult.company;
      if (cardResult.name)    next.owner_name    = cardResult.name;
      if (cardResult.phone)   next.primary_phone = cardResult.phone;
      if (cardResult.email)   next.business_email = cardResult.email;
      if (cardResult.website) next.website = cardResult.website;
      if (cardResult.address) {
        const parsed = parseAddress(cardResult.address);
        if (parsed.address) next.address = parsed.address;
        if (parsed.city)    next.city    = parsed.city;
        if (parsed.state)   next.state   = parsed.state;
        if (parsed.zip)     next.zip     = parsed.zip;
      }
      return next;
    });
    setCardPhase("idle");
    setCardResult(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setStatus("idle");
    setErrorMsg("");

    try {
      const res = await fetch("/api/profile/business-identity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json() as { success?: boolean; error?: string; geocoded?: boolean };
      if (!res.ok || json.error) throw new Error(json.error ?? "Save failed");
      setGeocoded(!!json.geocoded);
      setStatus("success");
      setTimeout(() => setStatus("idle"), 4000);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Could not save — please try again");
      setStatus("error");
    } finally {
      setSaving(false);
    }
  }

  /* Summarise what the card found (only non-empty fields) */
  const cardFields = cardResult
    ? [
        cardResult.company && { label: "Business", value: cardResult.company },
        cardResult.name    && { label: "Owner",    value: cardResult.name },
        cardResult.phone   && { label: "Phone",    value: cardResult.phone },
        cardResult.email   && { label: "Email",    value: cardResult.email },
        cardResult.website && { label: "Website",  value: cardResult.website },
        cardResult.address && { label: "Address",  value: cardResult.address },
        cardResult.trade   && { label: "Trade",    value: cardResult.trade },
      ].filter(Boolean) as { label: string; value: string }[]
    : [];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">

      {/* ── Business card scanner ── */}
      <div>
        <input
          ref={cardInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={e => {
            const f = e.target.files?.[0];
            if (f) handleCardFile(f);
            (e.target as HTMLInputElement).value = "";
          }}
        />

        {cardPhase === "idle" && (
          <button
            type="button"
            onClick={() => cardInputRef.current?.click()}
            className="w-full flex items-center justify-center gap-2.5 py-2.5 rounded-xl border-2 border-dashed border-blue-200 text-sm font-semibold text-blue-600 bg-blue-50 active:bg-blue-100 transition-colors"
          >
            <span className="text-base">🪪</span>
            Autofill from Business Card
          </button>
        )}

        {cardPhase === "scanning" && (
          <div className="flex items-center justify-center gap-3 py-3 rounded-xl bg-blue-50 border border-blue-100">
            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-semibold text-blue-700">Reading your card…</p>
          </div>
        )}

        {cardPhase === "error" && (
          <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 flex items-start gap-3">
            <span className="shrink-0 mt-0.5">⚠️</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-700">{cardError || "Scan failed"}</p>
              <button type="button" onClick={() => { setCardPhase("idle"); cardInputRef.current?.click(); }} className="text-xs text-red-500 underline mt-1">Try again</button>
            </div>
            <button type="button" onClick={() => setCardPhase("idle")} className="text-gray-400 text-lg leading-none">×</button>
          </div>
        )}

        {cardPhase === "preview" && cardResult && (
          <div className="rounded-2xl bg-white border-2 border-blue-200 shadow-sm overflow-hidden">
            <div className="flex items-center gap-2.5 px-4 py-3 bg-blue-50 border-b border-blue-100">
              <span className="text-base">🪪</span>
              <p className="text-sm font-semibold text-blue-800 flex-1">Card scanned — review fields to apply</p>
              <button type="button" onClick={() => setCardPhase("idle")} className="text-blue-400 text-lg leading-none hover:text-blue-600">×</button>
            </div>
            <div className="px-4 py-3 space-y-1.5">
              {cardFields.length === 0 ? (
                <p className="text-sm text-gray-400 italic">No fields could be read — try a clearer photo.</p>
              ) : (
                cardFields.map(f => (
                  <div key={f.label} className="flex gap-2 text-sm">
                    <span className="text-gray-400 w-16 shrink-0 text-xs font-semibold uppercase pt-0.5">{f.label}</span>
                    <span className="text-gray-800 truncate">{f.value}</span>
                  </div>
                ))
              )}
            </div>
            {cardFields.length > 0 && (
              <div className="flex gap-2 px-4 pb-4">
                <button
                  type="button"
                  onClick={applyCardResult}
                  className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold"
                  style={{ backgroundColor: "#1B3A6B" }}
                >
                  Apply to Form →
                </button>
                <button
                  type="button"
                  onClick={() => { setCardPhase("idle"); cardInputRef.current?.click(); }}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-600 bg-gray-100 active:bg-gray-200"
                >
                  Rescan
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Logo */}
      <div>
        <label className={labelCls}>Business Logo</label>
        <div className="flex items-center gap-4">
          <div
            className="w-20 h-20 rounded-2xl border-2 border-dashed border-gray-200 flex items-center justify-center bg-gray-50 overflow-hidden flex-shrink-0 cursor-pointer active:opacity-70"
            onClick={() => logoInputRef.current?.click()}>
            {data.logo_url ? (
              <img
                src={data.logo_url}
                alt="Business logo"
                className="w-full h-full object-contain p-1"
              />
            ) : (
              <div className="text-center">
                <div className="text-2xl">🏢</div>
                <p className="text-[10px] text-gray-400 mt-1 leading-tight">Tap to<br />upload</p>
              </div>
            )}
          </div>
          <div className="flex-1 space-y-2">
            <button
              type="button"
              onClick={() => logoInputRef.current?.click()}
              disabled={uploadingLogo}
              className="w-full rounded-xl border border-gray-200 py-2 text-sm font-semibold text-slate-600 bg-gray-50 active:bg-gray-100 disabled:opacity-50">
              {uploadingLogo ? "Uploading…" : data.logo_url ? "Change Logo" : "Upload Logo"}
            </button>
            {data.logo_url && !uploadingLogo && (
              <button
                type="button"
                onClick={() => setData((prev) => ({ ...prev, logo_url: "" }))}
                className="w-full rounded-xl border border-red-100 py-2 text-sm font-semibold text-red-400 bg-red-50 active:bg-red-100">
                Remove Logo
              </button>
            )}
            <p className="text-xs text-gray-400">PNG, JPG, or SVG. Appears on quotes and invoices.</p>
          </div>
        </div>
        <input
          ref={logoInputRef}
          type="file"
          accept="image/*"
          onChange={handleLogoChange}
          style={{ position: "fixed", top: -200, width: 1, height: 1, opacity: 0 }}
        />
      </div>

      {/* Business Name */}
      <div>
        <label className={labelCls}>Business Name</label>
        <input name="business_name" className={inputCls} {...field("business_name")} />
      </div>
      <div>
        <label className={labelCls}>DBA Name</label>
        <input name="dba_name" placeholder="Doing business as…" className={inputCls} {...field("dba_name")} />
      </div>

      {/* Contact */}
      <div className={gridCls}>
        <div>
          <label className={labelCls}>Primary Phone</label>
          <input name="primary_phone" type="tel" className={inputCls} {...field("primary_phone")} />
        </div>
        <div>
          <label className={labelCls}>Business Email</label>
          <input name="business_email" type="email" className={inputCls} {...field("business_email")} />
        </div>
      </div>
      <div>
        <label className={labelCls}>Website</label>
        <input name="website" placeholder="https://…" className={inputCls} {...field("website")} />
      </div>

      {/* Address */}
      <div>
        <label className={labelCls}>Address</label>
        <input name="address" className={inputCls} {...field("address")} />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className={labelCls}>City</label>
          <input name="city" className={inputCls} {...field("city")} />
        </div>
        <div>
          <label className={labelCls}>State</label>
          <input name="state" maxLength={2} className={inputCls} {...field("state")} />
        </div>
        <div>
          <label className={labelCls}>ZIP</label>
          <input name="zip" className={inputCls} {...field("zip")} />
        </div>
      </div>

      {/* Licenses */}
      <p className="text-xs font-bold text-gray-400 uppercase pt-1">Licenses &amp; Certs</p>
      <div className={gridCls}>
        <div>
          <label className={labelCls}>License #</label>
          <input name="license_number" className={inputCls} {...field("license_number")} />
        </div>
        <div>
          <label className={labelCls}>Insurance #</label>
          <input name="insurance_number" className={inputCls} {...field("insurance_number")} />
        </div>
      </div>
      <div className={gridCls}>
        <div>
          <label className={labelCls}>EPA Cert #</label>
          <input name="epa_cert_number" className={inputCls} {...field("epa_cert_number")} />
        </div>
        <div>
          <label className={labelCls}>Service Area</label>
          <input name="service_area" placeholder="e.g. Central Maine" className={inputCls} {...field("service_area")} />
        </div>
      </div>

      {/* Signature */}
      <p className="text-xs font-bold text-gray-400 uppercase pt-1">Signature Block</p>
      <div className={gridCls}>
        <div>
          <label className={labelCls}>Owner Name</label>
          <input name="owner_name" className={inputCls} {...field("owner_name")} />
        </div>
        <div>
          <label className={labelCls}>Title</label>
          <input name="owner_title" placeholder="Owner, President…" className={inputCls} {...field("owner_title")} />
        </div>
      </div>
      <div>
        <label className={labelCls}>Footer Text</label>
        <textarea
          name="signature_footer"
          rows={2}
          placeholder="Thank you for choosing our company."
          className={inputCls}
          value={data.signature_footer}
          onChange={(e) => setData((prev) => ({ ...prev, signature_footer: e.target.value }))}
        />
      </div>

      {/* Feedback */}
      {status === "error" && (
        <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">
          {errorMsg || "Something went wrong — please try again."}
        </div>
      )}
      {status === "success" && (
        <div className="rounded-xl bg-green-50 border border-green-100 px-4 py-3 text-sm text-green-700 font-semibold space-y-1">
          <div className="flex items-center gap-2"><span>✓</span> Business info saved successfully.</div>
          {geocoded && (
            <div className="flex items-center gap-2 text-blue-700 font-semibold">
              <span>📍</span> Address pinned on the Find Contractors map.
            </div>
          )}
        </div>
      )}

      <button
        type="submit"
        disabled={saving || uploadingLogo}
        className="w-full rounded-xl py-3 text-white text-sm font-semibold disabled:opacity-60 transition-opacity"
        style={{ backgroundColor: "#1B3A6B" }}>
        {saving ? "Saving…" : "Save Business Info"}
      </button>
    </form>
  );
}
