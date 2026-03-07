import { ensureUserOrg } from "@/lib/auth";
import ExportClient from "./ExportClient";

export default async function ExportPage() {
  await ensureUserOrg();

  return (
    <div className="p-4 pb-24">
      <div className="flex items-center gap-3 mb-1">
        <h1 className="text-xl font-bold text-slate-800">Accounting Export</h1>
        <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-semibold">QuickBooks Ready</span>
      </div>
      <p className="text-sm text-gray-500 mb-5">Download your data as CSV files compatible with QuickBooks and other accounting software.</p>
      <ExportClient />
    </div>
  );
}
