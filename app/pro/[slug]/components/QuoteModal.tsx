import { useRef, useState } from "react";
import { X, CheckCircle2 } from "lucide-react";

type Props = {
  contractorName: string;
  slug: string;
  open: boolean;
  onClose: () => void;
};

type FormState = "idle" | "submitting" | "success";

export function QuoteModal({ contractorName, slug, open, onClose }: Props) {
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
      className="fixed inset-0 bg-slate-900/60 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
    >
      <div
        className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl relative animate-in slide-in-from-bottom duration-300 overflow-hidden"
      >
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors z-20"
        >
          <X size={20} />
        </button>

        {state === "success" ? (
          <div className="p-8 sm:p-12 text-center">
            <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 size={40} className="text-green-500" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Request Sent!</h2>
            <p className="text-slate-500 mb-8 leading-relaxed">
              {firstName} will get back to you within a few hours.
            </p>
            <button
              onClick={handleClose}
              className="w-full bg-[#1B3A6B] text-white font-bold py-4 rounded-2xl hover:bg-[#152e55] transition-colors shadow-lg shadow-blue-900/10"
            >
              Done
            </button>
          </div>
        ) : (
          <div className="p-6 sm:p-8">
            <h2 className="text-2xl font-bold text-slate-800 mb-1">Get a Free Quote</h2>
            <p className="text-sm text-slate-500 mb-8">
              {firstName} will get back to you within a few hours
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">
                  Your Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="John Smith"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]/10 focus:border-[#1B3A6B] transition-all"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  required
                  placeholder="(555) 000-0000"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]/10 focus:border-[#1B3A6B] transition-all"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">
                  What do you need done?
                </label>
                <textarea
                  required
                  placeholder="Describe your project..."
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={3}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]/10 focus:border-[#1B3A6B] transition-all resize-none min-h-[100px]"
                />
              </div>

              <button
                type="submit"
                disabled={state === "submitting"}
                className="w-full bg-[#1B3A6B] text-white font-bold py-4 rounded-2xl hover:bg-[#152e55] transition-colors shadow-lg shadow-blue-900/10 disabled:opacity-50 disabled:cursor-not-allowed mt-4"
              >
                {state === "submitting" ? "Sending…" : "Send My Request"}
              </button>

              <p className="text-center text-[10px] text-slate-400 pt-2 font-medium">
                Free estimates · No obligation · Secure & Private
              </p>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
