import Link from "next/link";

const REPORTS = [
  {
    label: "Revenue Report",
    desc: "View total income and outstanding balances",
    icon: "💰",
    color: "#16A34A",
    href: "#",
  },
  {
    label: "Jobs Report",
    desc: "Analyze jobs and their statuses",
    icon: "💼",
    color: "#F97316",
    href: "#",
  },
  {
    label: "Lead Report",
    desc: "Review new leads and conversion rates",
    icon: "👤",
    color: "#1B3A6B",
    href: "#",
  },
  {
    label: "Expense Report",
    desc: "Track business expenses and purchases",
    icon: "🧾",
    color: "#EF4444",
    href: "#",
  },
];

export default function ReportsPage() {
  return (
    <div className="p-4 space-y-3">
      <h1 className="text-xl font-bold text-slate-800">Reports</h1>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden divide-y divide-gray-100">
        {REPORTS.map((report) => (
          <Link key={report.label} href={report.href}
            className="flex items-center gap-4 px-4 py-4">
            <div className="h-10 w-10 rounded-full flex items-center justify-center text-xl text-white shrink-0"
              style={{ backgroundColor: report.color }}>
              {report.icon}
            </div>
            <div className="flex-1">
              <p className="font-semibold text-slate-800 text-sm">{report.label}</p>
              <p className="text-xs text-gray-500">{report.desc}</p>
            </div>
            <span className="text-gray-300 text-lg">›</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
