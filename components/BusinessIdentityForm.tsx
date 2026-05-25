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

const inputCls = "w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white";
const labelCls = "block text-xs font-semibold text-gray-500 uppercase mb-1";
const gridCls = "grid grid-cols-2 gap-3";

export function BusinessIdentityForm({ initial }: { initial: BusinessIdentityData }) {
  const [data, setData] = useState<BusinessIdentityData>(initial);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [geocoded, setGeocoded] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

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
    } catch (err: any) {
      setErrorMsg(err.message ?? "Logo upload failed");
      setStatus("error");
      setData((prev) => ({ ...prev, logo_url: initial.logo_url }));
    } finally {
      setUploadingLogo(false);
    }
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
    } catch (err: any) {
      setErrorMsg(err.message ?? "Could not save — please try again");
      setStatus("error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">

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
