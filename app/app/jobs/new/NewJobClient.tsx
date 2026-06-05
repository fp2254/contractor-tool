"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type NewCustomer = { first_name: string; last_name: string; phone: string; email: string };
const EMPTY_NC: NewCustomer = { first_name: "", last_name: "", phone: "", email: "" };

const RECURRENCE_OPTIONS = [
  { value: "daily",     label: "Daily" },
  { value: "weekly",    label: "Weekly" },
  { value: "biweekly",  label: "Every 2 weeks" },
  { value: "monthly",   label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
];

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
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceRule, setRecurrenceRule] = useState("weekly");
  const [recurrenceEndDate, setRecurrenceEndDate] = useState("");
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
          is_recurring: isRecurring,
          recurrence_rule: isRecurring ? recurrenceRule : undefined,
          recurrence_end_date: isRecurring && recurrenceEndDate ? recurrenceEndDate : undefined,
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

      {/* ── Recurring toggle ── */}
      <div className={`rounded-xl border transition-colors ${isRecurring ? "border-blue-200 bg-blue-50" : "border-gray-200 bg-white"} p-4`}>
        <button
          type="button"
          onClick={() => setIsRecurring(p => !p)}
          className="flex items-center justify-between w-full"
        >
          <div className="flex items-center gap-2">
            <span className="text-base">🔁</span>
            <div className="text-left">
              <p className="text-sm font-semibold text-slate-700">Repeat this job</p>
              <p className="text-xs text-gray-400">Auto-schedule the next occurrence when completed</p>
            </div>
          </div>
          <div className={`w-10 h-6 rounded-full transition-colors flex items-center px-1 ${isRecurring ? "bg-blue-500" : "bg-gray-200"}`}>
            <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${isRecurring ? "translate-x-4" : "translate-x-0"}`} />
          </div>
        </button>

        {isRecurring && (
          <div className="mt-3 space-y-3 pt-3 border-t border-blue-100">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Frequency</label>
              <div className="grid grid-cols-2 gap-2">
                {RECURRENCE_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setRecurrenceRule(opt.value)}
                    className={`py-2 rounded-xl text-xs font-semibold border transition-colors ${
                      recurrenceRule === opt.value
                        ? "border-blue-500 bg-blue-500 text-white"
                        : "border-gray-200 bg-white text-gray-600"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Stop repeating after <span className="normal-case font-normal text-gray-400">(optional)</span></label>
              <input
                type="date"
                value={recurrenceEndDate}
                onChange={e => setRecurrenceEndDate(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white"
              />
            </div>
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-xl py-3 text-white font-semibold disabled:opacity-60"
        style={{ backgroundColor: "#1B3A6B" }}>
        {submitting ? "Scheduling…" : isRecurring ? "Schedule Recurring Job" : "Schedule Job"}
      </button>
    </form>
  );
}
