"use client";

import { useState } from "react";
import {
  AlertTriangle, CheckCircle, Clock, Users, Zap, TrendingUp,
  ChevronDown, ChevronUp, Ticket, Activity, DollarSign,
  Building2, RefreshCw, X, FileText, Camera, Briefcase,
  Star, Globe, Shield
} from "lucide-react";

type OrgData = {
  id: string;
  name: string;
  rawName: string;
  ownerEmail: string | null;
  ownerName: string | null;
  city: string | null;
  state: string | null;
  createdAt: string;
  isNew: boolean;
  lastActive: string;
  daysSinceActive: number;
  memberCount: number;
  quoteCount: number;
  jobCount: number;
  invoiceCount: number;
  customerCount: number;
  leadCount: number;
  photoCount: number;
  revenue: number;
  aiToday: number;
  aiMonth: number;
  aiLimit: number;
  aiPct: number;
  aiFeatures: Record<string, number>;
  plan: string;
  planStatus: string;
  health: "green" | "amber" | "red";
  tickets: any[];
};

type AdminData = {
  orgs: OrgData[];
  stats: {
    totalOrgs: number;
    activeOrgs: number;
    newSignups: number;
    totalAiToday: number;
    openTickets: number;
  };
  tickets: any[];
  openTickets: any[];
  aiFeatureTotals: Record<string, number>;
  recentActivity: any[];
};

function HealthDot({ health }: { health: "green" | "amber" | "red" }) {
  const colors = { green: "#16A34A", amber: "#D97706", red: "#DC2626" };
  return (
    <span
      className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
      style={{ backgroundColor: colors[health] }}
    />
  );
}

function AiBar({ pct }: { pct: number }) {
  const color = pct >= 100 ? "#DC2626" : pct >= 80 ? "#D97706" : "#16A34A";
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-[11px] font-mono" style={{ color }}>{pct}%</span>
    </div>
  );
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const d = Math.floor(diff / 86400000);
  if (d === 0) return "today";
  if (d === 1) return "yesterday";
  if (d < 7) return `${d}d ago`;
  if (d < 30) return `${Math.floor(d / 7)}w ago`;
  return `${Math.floor(d / 30)}mo ago`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function fmtMoney(n: number) {
  return n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n.toLocaleString()}`;
}

function OrgRow({ org }: { org: OrgData }) {
  const [expanded, setExpanded] = useState(false);
  const borderColor = org.health === "red" ? "#FCA5A5" : org.health === "amber" ? "#FCD34D" : "#D1FAE5";

  return (
    <div className="border rounded-xl overflow-hidden" style={{ borderColor }}>
      {/* Main row */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
      >
        <HealthDot health={org.health} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-900 truncate">{org.name}</span>
            {org.isNew && (
              <span className="shrink-0 text-[9px] font-bold uppercase tracking-wider bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">New</span>
            )}
            <span className={`shrink-0 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${
              org.plan === "pro" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-500"
            }`}>{org.plan}</span>
          </div>
          <p className="text-[11px] text-gray-400 truncate">{org.ownerEmail ?? "no email"}</p>
        </div>

        <div className="hidden sm:flex items-center gap-6 text-xs text-gray-500">
          <span className="flex items-center gap-1"><Users size={11} />{org.memberCount}</span>
          <span className="flex items-center gap-1"><Briefcase size={11} />{org.jobCount}</span>
          <span className="flex items-center gap-1"><FileText size={11} />{org.quoteCount}</span>
          <span className="flex items-center gap-1"><DollarSign size={11} />{fmtMoney(org.revenue)}</span>
        </div>

        <div className="flex flex-col items-end gap-1 shrink-0">
          <AiBar pct={org.aiPct} />
          <span className="text-[10px] text-gray-400">{timeAgo(org.lastActive)}</span>
        </div>

        {expanded ? <ChevronUp size={14} className="text-gray-400 shrink-0" /> : <ChevronDown size={14} className="text-gray-400 shrink-0" />}
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-gray-100 bg-gray-50 p-4 space-y-4">
          {/* Stats grid */}
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Info */}
            <div className="bg-white rounded-lg p-3 shadow-sm space-y-1.5">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Account Info</p>
              {[
                ["Org ID", org.id],
                ["Owner", org.ownerName ?? "—"],
                ["Email", org.ownerEmail ?? "—"],
                ["Location", [org.city, org.state].filter(Boolean).join(", ") || "—"],
                ["Joined", fmtDate(org.createdAt)],
                ["Last Active", fmtDate(org.lastActive)],
                ["Revenue Logged", `$${org.revenue.toLocaleString()}`],
                ["Plan", `${org.plan} / ${org.planStatus}`],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between items-center text-xs">
                  <span className="text-gray-400">{k}</span>
                  <span className="font-mono text-gray-700 text-[11px] truncate max-w-[180px]">{v}</span>
                </div>
              ))}
            </div>

            {/* AI breakdown + tickets */}
            <div className="space-y-3">
              {Object.keys(org.aiFeatures).length > 0 && (
                <div className="bg-white rounded-lg p-3 shadow-sm">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">AI Feature Usage (this month)</p>
                  <div className="space-y-1">
                    {Object.entries(org.aiFeatures)
                      .sort(([, a], [, b]) => b - a)
                      .map(([feature, count]) => (
                        <div key={feature} className="flex justify-between text-xs">
                          <span className="text-gray-600 capitalize">{feature.replace(/-/g, " ")}</span>
                          <span className="font-bold text-gray-800 font-mono">{count}</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {org.tickets.length > 0 && (
                <div className="bg-white rounded-lg p-3 shadow-sm border border-amber-100">
                  <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider mb-2">Support Tickets</p>
                  <div className="space-y-2">
                    {org.tickets.map((t: any) => (
                      <div key={t.id} className="text-xs">
                        <p className="font-semibold text-gray-800">{t.subject || "No subject"}</p>
                        <p className="text-gray-500 text-[10px]">{timeAgo(t.created_at)} · {t.status ?? "open"}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminDashboard({ data, adminEmail }: { data: AdminData; adminEmail: string }) {
  const [ticketFilter, setTicketFilter] = useState<"open" | "all">("open");
  const [orgSearch, setOrgSearch] = useState("");
  const [healthFilter, setHealthFilter] = useState<"all" | "red" | "amber" | "green">("all");

  const alerts = [
    ...data.orgs.filter(o => o.aiPct >= 100).map(o => ({ type: "red" as const, msg: `${o.name} hit AI limit (${o.aiToday}/${o.aiLimit} today)` })),
    ...data.openTickets.filter((t: any) => {
      const age = (Date.now() - new Date(t.created_at).getTime()) / 3600000;
      return age > 24;
    }).map((t: any) => ({ type: "red" as const, msg: `Ticket stale 24h+: "${t.subject || "No subject"}"` })),
    ...data.orgs.filter(o => o.aiPct >= 80 && o.aiPct < 100).map(o => ({ type: "amber" as const, msg: `${o.name} at ${o.aiPct}% AI limit` })),
    ...data.orgs.filter(o => o.daysSinceActive > 30 && o.health !== "red").map(o => ({ type: "amber" as const, msg: `${o.name} inactive ${o.daysSinceActive}d — churn risk` })),
  ];

  const filteredOrgs = data.orgs.filter(o => {
    const matchSearch = !orgSearch || o.name.toLowerCase().includes(orgSearch.toLowerCase()) || (o.ownerEmail ?? "").toLowerCase().includes(orgSearch.toLowerCase());
    const matchHealth = healthFilter === "all" || o.health === healthFilter;
    return matchSearch && matchHealth;
  });

  const displayTickets = ticketFilter === "open" ? data.openTickets : data.tickets;

  const aiTopFeatures = Object.entries(data.aiFeatureTotals)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8);
  const aiTotal = Object.values(data.aiFeatureTotals).reduce((a, b) => a + b, 0);

  return (
    <div className="min-h-screen bg-gray-50 font-['Inter']">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#1B3A6B" }}>
            <Shield size={15} className="text-white" />
          </div>
          <div>
            <h1 className="font-bold text-gray-900 text-lg">TradeBase Admin</h1>
            <p className="text-xs text-gray-400">{adminEmail}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg px-3 py-1.5"
          >
            <RefreshCw size={12} /> Refresh
          </button>
          <button
            onClick={async () => {
              await fetch("/api/admin/auth", { method: "DELETE" });
              window.location.reload();
            }}
            className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 border border-red-200 rounded-lg px-3 py-1.5"
          >
            <X size={12} /> Lock
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">

        {/* ALERTS — only shown when there are problems */}
        {alerts.length > 0 && (
          <div className="space-y-2">
            {alerts.map((a, i) => (
              <div
                key={i}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium"
                style={{
                  backgroundColor: a.type === "red" ? "#FEF2F2" : "#FFFBEB",
                  borderLeft: `4px solid ${a.type === "red" ? "#DC2626" : "#D97706"}`,
                  color: a.type === "red" ? "#991B1B" : "#92400E",
                }}
              >
                <AlertTriangle size={15} />
                {a.msg}
              </div>
            ))}
          </div>
        )}

        {/* HEALTH STRIP */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: "Total Orgs", value: data.stats.totalOrgs, sub: "all time", icon: Building2, color: "#1B3A6B" },
            { label: "Active 7d", value: data.stats.activeOrgs, sub: "used app this week", icon: Activity, color: "#16A34A" },
            { label: "New Signups", value: data.stats.newSignups, sub: "last 7 days", icon: TrendingUp, color: "#2563EB" },
            { label: "AI Today", value: data.stats.totalAiToday, sub: "requests across all orgs", icon: Zap, color: "#7C3AED" },
            { label: "Open Tickets", value: data.stats.openTickets, sub: "need response", icon: Ticket, color: data.stats.openTickets > 0 ? "#DC2626" : "#6B7280" },
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ORG TABLE — takes 2/3 */}
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-gray-900">Orgs ({filteredOrgs.length})</h2>
              <div className="flex items-center gap-2">
                {(["all", "red", "amber", "green"] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setHealthFilter(f)}
                    className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-colors ${
                      healthFilter === f ? "text-white border-transparent" : "text-gray-500 border-gray-200 hover:border-gray-300"
                    }`}
                    style={healthFilter === f ? {
                      backgroundColor: f === "red" ? "#DC2626" : f === "amber" ? "#D97706" : f === "green" ? "#16A34A" : "#1B3A6B"
                    } : {}}
                  >
                    {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <input
              type="text"
              value={orgSearch}
              onChange={e => setOrgSearch(e.target.value)}
              placeholder="Search org name or email…"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:border-blue-300 bg-white"
            />

            <div className="space-y-2">
              {filteredOrgs.map(org => (
                <OrgRow key={org.id} org={org} />
              ))}
              {filteredOrgs.length === 0 && (
                <div className="text-center py-8 text-sm text-gray-400">No orgs match your filter</div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN — 1/3 */}
          <div className="space-y-4">
            {/* AI Feature Usage */}
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-gray-900 text-sm">AI This Month</h3>
                <span className="text-xs font-mono text-gray-400">{aiTotal} total</span>
              </div>
              {aiTopFeatures.length === 0 ? (
                <p className="text-xs text-gray-400">No AI usage this month</p>
              ) : (
                <div className="space-y-2">
                  {aiTopFeatures.map(([feature, count]) => {
                    const pct = Math.round((count / aiTotal) * 100);
                    return (
                      <div key={feature}>
                        <div className="flex justify-between text-xs mb-0.5">
                          <span className="text-gray-600 capitalize">{feature.replace(/-/g, " ")}</span>
                          <span className="font-mono font-bold text-gray-800">{count}</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${pct}%`, backgroundColor: "#1B3A6B" }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Support Tickets */}
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-gray-900 text-sm">Support Tickets</h3>
                <div className="flex gap-1">
                  {(["open", "all"] as const).map(f => (
                    <button
                      key={f}
                      onClick={() => setTicketFilter(f)}
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                        ticketFilter === f ? "bg-gray-900 text-white" : "text-gray-400 hover:text-gray-600"
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>
              {displayTickets.length === 0 ? (
                <div className="flex items-center gap-2 text-sm text-green-600 py-2">
                  <CheckCircle size={14} /> All clear — no open tickets
                </div>
              ) : (
                <div className="space-y-3">
                  {displayTickets.slice(0, 10).map((t: any) => (
                    <div key={t.id} className="border-b border-gray-50 pb-3 last:border-0 last:pb-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-semibold text-gray-800 leading-tight">{t.subject || "No subject"}</p>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase shrink-0 ${
                          t.status === "resolved" ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
                        }`}>{t.status ?? "open"}</span>
                      </div>
                      {t.body && <p className="text-[11px] text-gray-400 mt-0.5 line-clamp-2">{t.body}</p>}
                      <p className="text-[10px] text-gray-300 mt-1">{timeAgo(t.created_at)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Platform Activity */}
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <h3 className="font-bold text-gray-900 text-sm mb-3">Recent Activity</h3>
              <div className="space-y-2">
                {data.recentActivity.slice(0, 12).map((a: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <div className="w-1.5 h-1.5 rounded-full bg-gray-200 shrink-0" />
                    <span className="font-semibold text-gray-600 truncate max-w-[80px]">{a.orgName}</span>
                    <span className="text-gray-400 flex-1 truncate">{a.action}</span>
                    <span className="text-[10px] text-gray-300 shrink-0">{timeAgo(a.created_at)}</span>
                  </div>
                ))}
                {data.recentActivity.length === 0 && (
                  <p className="text-xs text-gray-400">No recent activity</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
