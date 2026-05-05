"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type NewCustomer = { first_name: string; last_name: string; phone: string; email: string };
const EMPTY_NC: NewCustomer = { first_name: "", last_name: "", phone: "", email: "" };

export default function NewJobClient({
  customers,
  templates = [],
  canAssignTemplate = false,
}: {
  customers: { id: string; name: string }[];
  templates?: { id: string; name: string }[];
  canAssignTemplate?: boolean;
}) {
  const router = useRouter();
  const [customerId, setCustomerId] = useState(customers[0]?.id ?? "__new__");
  const [newCustomer, setNewCustomer] = useState<NewCustomer>(EMPTY_NC);
  const [jobTitle, setJobTitle] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const isNew = customerId === "__new__";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isNew && !newCustomer.first_name.trim()) { setError("Client first name is required."); return; }
    if (!isNew && !customerId) { setError("Please select a customer."); return; }
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/app/jobs/new/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_id: isNew ? "" : customerId,
          job_title: jobTitle,
          scheduled_date: scheduledDate || undefined,
          address: address || undefined,
          notes: notes || undefined,
          template_id: templateId || undefined,
          ...(isNew ? { new_customer: newCustomer } : {}),
        }),
      });
      const json = await res.json() as { id?: string; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Failed to create job");
      router.push(`/app/jobs/${json.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create job");
      setSubmitting(false);
    }
  }

  return (
    <form className="space-y-3" onSubmit={handleSubmit}>
      {error && <p className="text-sm text-red-500">{error}</p>}

      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Customer *</label>
        <select
          value={customerId}
          onChange={e => setCustomerId(e.target.value)}
          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-100">
          <option value="__new__">+ New Client</option>
          {customers.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {isNew && (
        <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 space-y-3">
          <p className="text-sm font-semibold text-[#1B3A6B]">New Client Details</p>
          <div className="grid grid-cols-2 gap-2">
            <input
              placeholder="First name *"
              required={isNew}
              value={newCustomer.first_name}
              onChange={e => setNewCustomer(p => ({ ...p, first_name: e.target.value }))}
              className="rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white"
            />
            <input
              placeholder="Last name"
              value={newCustomer.last_name}
              onChange={e => setNewCustomer(p => ({ ...p, last_name: e.target.value }))}
              className="rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white"
            />
          </div>
          <input
            placeholder="Phone"
            type="tel"
            value={newCustomer.phone}
            onChange={e => setNewCustomer(p => ({ ...p, phone: e.target.value }))}
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white"
          />
          <input
            placeholder="Email"
            type="email"
            value={newCustomer.email}
            onChange={e => setNewCustomer(p => ({ ...p, email: e.target.value }))}
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white"
          />
        </div>
      )}

      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Job Title *</label>
        <input
          required
          placeholder="e.g. Radon Mitigation"
          value={jobTitle}
          onChange={e => setJobTitle(e.target.value)}
          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-100"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Scheduled Date</label>
        <input
          type="date"
          value={scheduledDate}
          onChange={e => setScheduledDate(e.target.value)}
          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-100"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Job Address</label>
        <input
          placeholder="Work site address"
          value={address}
          onChange={e => setAddress(e.target.value)}
          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-100"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Notes</label>
        <textarea
          rows={3}
          placeholder="Job notes…"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-100"
        />
      </div>

      {canAssignTemplate && templates.length > 0 && (
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Job Template</label>
          <select
            value={templateId}
            onChange={e => setTemplateId(e.target.value)}
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-100">
            <option value="">No template</option>
            {templates.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <p className="text-xs text-gray-400 mt-1">Assign a template to enable job detail fields on this job.</p>
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-xl py-3 text-white font-semibold disabled:opacity-60"
        style={{ backgroundColor: "#1B3A6B" }}>
        {submitting ? "Scheduling…" : "Schedule Job"}
      </button>
    </form>
  );
}
