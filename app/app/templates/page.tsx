import Link from "next/link";

export default function TemplatesPage() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-8 text-center">
      <div className="text-5xl mb-4">🗂️</div>
      <h1 className="text-2xl font-bold text-slate-800 mb-2">Job Templates</h1>
      <p className="text-gray-500 text-sm leading-relaxed max-w-xs mb-6">
        Build reusable checklists, field forms, photo requirements, and invoice line items — and attach them to any job. Coming soon.
      </p>
      <div className="inline-flex items-center gap-2 bg-[#1B3A6B] text-white text-xs font-bold rounded-full px-4 py-2 mb-8">
        <span className="animate-pulse w-2 h-2 rounded-full bg-white opacity-80" />
        In Development
      </div>
      <Link href="/app/more" className="text-sm text-gray-400 underline underline-offset-2">
        ← Back to More
      </Link>
    </div>
  );
}
