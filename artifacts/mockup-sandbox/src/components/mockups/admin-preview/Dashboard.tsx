import { useState } from "react";
import {
  AlertTriangle, CheckCircle, ChevronDown, ChevronUp,
  Users, Zap, TrendingUp, Activity, DollarSign,
  Building2, RefreshCw, X, FileText, Camera, Briefcase,
  Shield, Ticket
} from "lucide-react";

const ORGS = [
  {
    id: "1", name: "Sullivan Roofing", ownerEmail: "mike@sullivanroofing.com",
    ownerName: "Mike Sullivan", city: "Boston", state: "MA",
    createdAt: "2024-01-15", isNew: false, lastActive: new Date(Date.now() - 1*86400000).toISOString(),
    daysSinceActive: 1, memberCount: 3, quoteCount: 48, jobCount: 61, invoiceCount: 55,
    customerCount: 34, leadCount: 12, photoCount: 210, revenue: 142800,
    aiToday: 43, aiMonth: 380, aiLimit: 50, aiPct: 86,
    aiFeatures: { capture: 180, permit: 95, scope: 60, "note-summary": 45 },
    plan: "pro", planStatus: "active", health: "amber" as const,
    tickets: [],
  },
  {
    id: "2", name: "Parker Electric", ownerEmail: "j.parker@parkerelectric.net",
    ownerName: "James Parker", city: "Worcester", state: "MA",
    createdAt: "2024-03-22", isNew: false, lastActive: new Date(Date.now() - 2*86400000).toISOString(),
    daysSinceActive: 2, memberCount: 1, quoteCount: 22, jobCount: 29, invoiceCount: 28,
    customerCount: 18, leadCount: 5, photoCount: 84, revenue: 54200,
    aiToday: 8, aiMonth: 120, aiLimit: 50, aiPct: 16,
    aiFeatures: { capture: 55, permit: 40, "receipt-scan": 25 },
    plan: "free", planStatus: "active", health: "green" as const,
    tickets: [],
  },
  {
    id: "3", name: "Westside HVAC", ownerEmail: "tony@westsidehvac.com",
    ownerName: "Tony Reyes", city: "Springfield", state: "MA",
    createdAt: "2026-05-30", isNew: true, lastActive: new Date(Date.now() - 0*86400000).toISOString(),
    daysSinceActive: 0, memberCount: 2, quoteCount: 4, jobCount: 2, invoiceCount: 1,
    customerCount: 3, leadCount: 8, photoCount: 12, revenue: 3100,
    aiToday: 51, aiMonth: 51, aiLimit: 50, aiPct: 102,
    aiFeatures: { capture: 30, permit: 21 },
    plan: "free", planStatus: "active", health: "red" as const,
    tickets: [{ id: "t1", subject: "Can't upload photos", body: "Getting an error when trying to upload job photos.", status: "open", created_at: new Date(Date.now() - 30*3600000).toISOString() }],
  },
  {
    id: "4", name: "Coastal Plumbing Co.", ownerEmail: "d.hernandez@coastalplumbing.com",
    ownerName: "Diego Hernandez", city: "Plymouth", state: "MA",
    createdAt: "2024-06-10", isNew: false, lastActive: new Date(Date.now() - 38*86400000).toISOString(),
    daysSinceActive: 38, memberCount: 1, quoteCount: 31, jobCount: 40, invoiceCount: 38,
    customerCount: 25, leadCount: 3, photoCount: 95, revenue: 88500,
    aiToday: 0, aiMonth: 15, aiLimit: 50, aiPct: 0,
    aiFeatures: { capture: 15 },
    plan: "pro", planStatus: "active", health: "amber" as const,
    tickets: [],
  },
];

const ALERTS = [
  { type: "red" as const, msg: "Westside HVAC hit AI limit (51/50 today)" },
  { type: "red" as const, msg: 'Ticket stale 24h+: "Can\'t upload photos"' },
  { type: "amber" as const, msg: "Sullivan Roofing at 86% AI limit" },
  { type: "amber" as const, msg: "Coastal Plumbing Co. inactive 38d — churn risk" },
];

function HealthDot({ health }: { health: "green" | "amber" | "red" }) {
  const colors = { green: "#16A34A", amber: "#D97706", red: "#DC2626" };
  return <span className="inline-block w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: colors[health] }} />;
}

function AiBar({ pct }: { pct: number }) {
  const color = pct >= 100 ? "#DC2626" : pct >= 80 ? "#D97706" : "#16A34A";
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: color }} />
      </div>
      <span className="text-[11px] font-mono" style={{ color }}>{pct}%</span>
    </div>
  );
}

function timeAgo(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (d === 0) return "today"; if (d === 1) return "yesterday";
  if (d < 7) return `${d}d ago`; if (d < 30) return `${Math.floor(d/7)}w ago`;
  return `${Math.floor(d/30)}mo ago`;
}

function fmtMoney(n: number) {
  return n >= 1000 ? `$${(n/1000).toFixed(1)}k` : `$${n}`;
}

function OrgRow({ org }: { org: typeof ORGS[0] }) {
  const [open, setOpen] = useState(false);
  const borderColor = org.health === "red" ? "#FCA5A5" : org.health === "amber" ? "#FCD34D" : "#D1FAE5";
  return (
    <div className="border rounded-xl overflow-hidden" style={{ borderColor }}>
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors">
        <HealthDot health={org.health} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-900 truncate">{org.name}</span>
            {org.isNew && <span className="text-[9px] font-bold uppercase tracking-wider bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">New</span>}
            <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${org.plan === "pro" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-500"}`}>{org.plan}</span>
          </div>
          <p className="text-[11px] text-gray-400 truncate">{org.ownerEmail}</p>
        </div>
        <div className="flex items-center gap-5 text-xs text-gray-500">
          <span className="flex items-center gap-1"><Users size={11} />{org.memberCount}</span>
          <span className="flex items-center gap-1"><Briefcase size={11} />{org.jobCount}</span>
          <span className="flex items-center gap-1"><FileText size={11} />{org.quoteCount}</span>
          <span className="flex items-center gap-1"><DollarSign size={11} />{fmtMoney(org.revenue)}</span>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <AiBar pct={org.aiPct} />
          <span className="text-[10px] text-gray-400">{timeAgo(org.lastActive)}</span>
        </div>
        {open ? <ChevronUp size={14} className="text-gray-400 shrink-0" /> : <ChevronDown size={14} className="text-gray-400 shrink-0" />}
      </button>
      {open && (
        <div className="border-t border-gray-100 bg-gray-50 p-4 space-y-4">
          <div className="grid grid-cols-8 gap-3">
            {[
              { label: "Customers", value: org.customerCount, icon: Users },
              { label: "Leads", value: org.leadCount, icon: TrendingUp },
              { label: "Quotes", value: org.quoteCount, icon: FileText },
              { label: "Jobs", value: org.jobCount, icon: Briefcase },
              { label: "Invoices", value: org.invoiceCount, icon: FileText },
              { label: "Photos", value: org.photoCount, icon: Camera },
              { label: "AI Today", value: org.aiToday, icon: Zap },
              { label: "AI / mo", value: org.aiMonth, icon: Activity },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="bg-white rounded-lg p-2.5 text-center shadow-sm">
                <Icon size={12} className="text-gray-400 mx-auto mb-1" />
                <p className="text-base font-bold text-gray-900">{value}</p>
                <p className="text-[9px] text-gray-400 uppercase tracking-wide">{label}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-lg p-3 shadow-sm space-y-1.5">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Account Info</p>
              {[["Owner", org.ownerName], ["Email", org.ownerEmail], ["Location", `${org.city}, ${org.state}`], ["Last Active", timeAgo(org.lastActive)], ["Revenue", `$${org.revenue.toLocaleString()}`], ["Plan", `${org.plan} / ${org.planStatus}`]].map(([k, v]) => (
                <div key={k} className="flex justify-between items-center text-xs">
                  <span className="text-gray-400">{k}</span>
                  <span className="font-mono text-gray-700 text-[11px]">{v}</span>
                </div>
              ))}
            </div>
            <div className="bg-white rounded-lg p-3 shadow-sm">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">AI Feature Usage (this month)</p>
              <div className="space-y-1">
                {Object.entries(org.aiFeatures).sort(([,a],[,b]) => b-a).map(([f, c]) => (
                  <div key={f} className="flex justify-between text-xs">
                    <span className="text-gray-600 capitalize">{f.replace(/-/g, " ")}</span>
                    <span className="font-bold text-gray-800 font-mono">{c}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function Dashboard() {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  const aiFeatureTotals: Record<string, number> = {};
  ORGS.forEach(o => Object.entries(o.aiFeatures).forEach(([f, c]) => { aiFeatureTotals[f] = (aiFeatureTotals[f] ?? 0) + c; }));
  const aiTotal = Object.values(aiFeatureTotals).reduce((a, b) => a + b, 0);

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#1B3A6B" }}>
            <Shield size={15} color="white" />
          </div>
          <div>
            <h1 className="font-bold text-gray-900 text-lg">TradeBase Admin</h1>
            <p className="text-xs text-gray-400">Fp2254@gmail.com</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 text-xs text-gray-500 border border-gray-200 rounded-lg px-3 py-1.5">
            <RefreshCw size={12} /> Refresh
          </button>
          <button className="flex items-center gap-1.5 text-xs text-red-500 border border-red-200 rounded-lg px-3 py-1.5">
            <X size={12} /> Lock
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Alerts */}
        <div className="space-y-2">
          {ALERTS.map((a, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium"
              style={{ backgroundColor: a.type === "red" ? "#FEF2F2" : "#FFFBEB", borderLeft: `4px solid ${a.type === "red" ? "#DC2626" : "#D97706"}`, color: a.type === "red" ? "#991B1B" : "#92400E" }}>
              <AlertTriangle size={15} />
              {a.msg}
            </div>
          ))}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-5 gap-3">
          {[
            { label: "Total Orgs", value: 4, sub: "all time", icon: Building2, color: "#1B3A6B" },
            { label: "Active 7d", value: 3, sub: "used app this week", icon: Activity, color: "#16A34A" },
            { label: "New Signups", value: 1, sub: "last 7 days", icon: TrendingUp, color: "#2563EB" },
            { label: "AI Today", value: 102, sub: "requests across all orgs", icon: Zap, color: "#7C3AED" },
            { label: "Open Tickets", value: 1, sub: "need response", icon: Ticket, color: "#DC2626" },
          ].map(({ label, value, sub, icon: Icon, color }) => (
            <div key={label} className="bg-white rounded-xl p-4 shadow-sm flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: color + "18" }}>
                <Icon size={16} style={{ color }} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{value}</p>
                <p className="text-[11px] font-semibold text-gray-700">{label}</p>
                <p className="text-[10px] text-gray-400">{sub}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Org table */}
          <div className="col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-gray-900">Orgs (4)</h2>
              <div className="flex gap-1">
                {["All","Red","Amber","Green"].map((f, i) => (
                  <button key={f} className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border ${i === 0 ? "text-white border-transparent" : "text-gray-500 border-gray-200"}`}
                    style={i === 0 ? { backgroundColor: "#1B3A6B" } : {}}>{f}</button>
                ))}
              </div>
            </div>
            <input placeholder="Search org name or email…" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none bg-white" />
            <div className="space-y-2">
              {ORGS.map(org => <OrgRow key={org.id} org={org} />)}
            </div>
          </div>

          {/* Right col */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-gray-900 text-sm">AI This Month</h3>
                <span className="text-xs font-mono text-gray-400">{aiTotal} total</span>
              </div>
              <div className="space-y-2">
                {Object.entries(aiFeatureTotals).sort(([,a],[,b]) => b-a).map(([f, c]) => (
                  <div key={f}>
                    <div className="flex justify-between text-xs mb-0.5">
                      <span className="text-gray-600 capitalize">{f.replace(/-/g," ")}</span>
                      <span className="font-mono font-bold text-gray-800">{c}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${Math.round(c/aiTotal*100)}%`, backgroundColor: "#1B3A6B" }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-gray-900 text-sm">Support Tickets</h3>
                <div className="flex gap-1">
                  {["open","all"].map((f, i) => (
                    <button key={f} className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${i === 0 ? "bg-gray-900 text-white" : "text-gray-400"}`}>{f}</button>
                  ))}
                </div>
              </div>
              <div className="border-b border-gray-50 pb-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-semibold text-gray-800">Can't upload photos</p>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase bg-red-50 text-red-600">open</span>
                </div>
                <p className="text-[11px] text-gray-400 mt-0.5">Getting an error when trying to upload job photos.</p>
                <p className="text-[10px] text-gray-300 mt-1">30 hours ago · Westside HVAC</p>
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 shadow-sm">
              <h3 className="font-bold text-gray-900 text-sm mb-3">Recent Activity</h3>
              <div className="space-y-2">
                {[
                  ["Sullivan Roofing", "invoice paid", "2h ago"],
                  ["Westside HVAC", "lead created", "3h ago"],
                  ["Parker Electric", "quote sent", "5h ago"],
                  ["Sullivan Roofing", "job completed", "yesterday"],
                  ["Parker Electric", "customer added", "yesterday"],
                ].map(([org, action, time], i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <div className="w-1.5 h-1.5 rounded-full bg-gray-200 shrink-0" />
                    <span className="font-semibold text-gray-600 truncate max-w-[90px]">{org}</span>
                    <span className="text-gray-400 flex-1 truncate">{action}</span>
                    <span className="text-[10px] text-gray-300 shrink-0">{time}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
