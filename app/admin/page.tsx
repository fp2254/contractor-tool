import { notFound } from "next/navigation";
import { createHash } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import AdminDashboard from "./AdminDashboard";
import AdminLogin from "./AdminLogin";

const COOKIE_NAME = "admin_token";

function makeAdminToken(password: string, adminEmail: string): string {
  return createHash("sha256")
    .update(`${password}:${adminEmail}:tradebase-admin-v1`)
    .digest("hex");
}

async function getCurrentUserEmail(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    );
    const { data: { user } } = await supabase.auth.getUser();
    return user?.email ?? null;
  } catch {
    return null;
  }
}

async function fetchAdminData() {
  const admin = createAdminClient();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const [
    orgsRes,
    orgSettingsRes,
    membersRes,
    quotesRes,
    jobsRes,
    invoicesRes,
    customersRes,
    leadsRes,
    paymentsRes,
    activityRes,
    aiRunsTodayRes,
    aiRunsMonthRes,
    aiLimitsRes,
    photosRes,
    ticketsRes,
    membershipsRes,
    usersRes,
  ] = await Promise.all([
    admin.from("orgs").select("id, name, created_at, owner_user_id"),
    admin.from("org_settings").select("org_id, dba_name, business_email, owner_name, city, state"),
    admin.from("org_members").select("org_id, user_id, role"),
    admin.from("quotes").select("org_id, status, total_amount, created_at"),
    admin.from("jobs").select("org_id, status, created_at"),
    admin.from("invoices").select("org_id, status, total_amount, created_at"),
    admin.from("customers").select("org_id, created_at"),
    admin.from("leads").select("org_id, status, created_at"),
    admin.from("payments").select("org_id, amount, created_at"),
    admin.from("activity_log").select("org_id, created_at, action, entity_type").order("created_at", { ascending: false }).limit(1000),
    (admin as any).from("ai_runs").select("org_id, feature, created_at").gte("created_at", today.toISOString()),
    (admin as any).from("ai_runs").select("org_id, feature, created_at").gte("created_at", monthStart.toISOString()),
    (admin as any).from("org_ai_limits").select("org_id, daily_limit"),
    (admin as any).from("photos").select("org_id, created_at"),
    (admin as any).from("support_tickets").select("id, org_id, subject, body, status, created_at").order("created_at", { ascending: false }),
    (admin as any).from("org_memberships").select("org_id, plan, status, created_at, expires_at"),
    admin.auth.admin.listUsers({ perPage: 1000 }),
  ]);

  const orgs = orgsRes.data ?? [];
  const orgSettings = orgSettingsRes.data ?? [];
  const members = membersRes.data ?? [];
  const quotes = quotesRes.data ?? [];
  const jobs = jobsRes.data ?? [];
  const invoices = invoicesRes.data ?? [];
  const customers = customersRes.data ?? [];
  const leads = leadsRes.data ?? [];
  const payments = paymentsRes.data ?? [];
  const activity = activityRes.data ?? [];
  const aiRunsToday = aiRunsTodayRes.data ?? [];
  const aiRunsMonth = aiRunsMonthRes.data ?? [];
  const aiLimits = aiLimitsRes.data ?? [];
  const photos = photosRes.data ?? [];
  const tickets = ticketsRes.data ?? [];
  const memberships = membershipsRes.data ?? [];
  const authUsers = usersRes.data?.users ?? [];

  const settingsMap = Object.fromEntries(orgSettings.map((s: any) => [s.org_id, s]));
  const limitsMap = Object.fromEntries(aiLimits.map((l: any) => [l.org_id, l.daily_limit ?? 50]));
  const membershipMap = Object.fromEntries(memberships.map((m: any) => [m.org_id, m]));
  const userEmailMap = Object.fromEntries(authUsers.map((u: any) => [u.id, u.email]));

  const lastActivityMap: Record<string, string> = {};
  for (const a of activity) {
    if (!lastActivityMap[a.org_id]) lastActivityMap[a.org_id] = a.created_at;
  }

  const aiTodayByOrg: Record<string, number> = {};
  for (const r of aiRunsToday) {
    aiTodayByOrg[r.org_id] = (aiTodayByOrg[r.org_id] ?? 0) + 1;
  }

  const aiMonthByOrg: Record<string, number> = {};
  const aiFeaturesByOrg: Record<string, Record<string, number>> = {};
  for (const r of aiRunsMonth) {
    aiMonthByOrg[r.org_id] = (aiMonthByOrg[r.org_id] ?? 0) + 1;
    if (!aiFeaturesByOrg[r.org_id]) aiFeaturesByOrg[r.org_id] = {};
    aiFeaturesByOrg[r.org_id][r.feature] = (aiFeaturesByOrg[r.org_id][r.feature] ?? 0) + 1;
  }

  const countByOrg = (arr: any[]) =>
    arr.reduce((acc: Record<string, number>, r: any) => {
      acc[r.org_id] = (acc[r.org_id] ?? 0) + 1;
      return acc;
    }, {});

  const quoteCounts = countByOrg(quotes);
  const jobCounts = countByOrg(jobs);
  const invoiceCounts = countByOrg(invoices);
  const customerCounts = countByOrg(customers);
  const leadCounts = countByOrg(leads);
  const photoCounts = countByOrg(photos);

  const revenueByOrg: Record<string, number> = {};
  for (const p of payments) {
    revenueByOrg[(p as any).org_id] = (revenueByOrg[(p as any).org_id] ?? 0) + ((p as any).amount ?? 0);
  }

  const memberCountByOrg = countByOrg(members);
  const openTickets = tickets.filter((t: any) => t.status === "open" || !t.status);
  const ticketsByOrg: Record<string, any[]> = {};
  for (const t of tickets) {
    if (!ticketsByOrg[t.org_id]) ticketsByOrg[t.org_id] = [];
    ticketsByOrg[t.org_id].push(t);
  }

  const enrichedOrgs = orgs.map((org) => {
    const settings = settingsMap[org.id] ?? {};
    const lastActive = lastActivityMap[org.id] ?? org.created_at;
    const daysSinceActive = Math.floor((Date.now() - new Date(lastActive).getTime()) / 86400000);
    const aiToday = aiTodayByOrg[org.id] ?? 0;
    const aiMonth = aiMonthByOrg[org.id] ?? 0;
    const aiLimit = limitsMap[org.id] ?? 50;
    const aiPct = Math.round((aiToday / aiLimit) * 100);
    const membership = membershipMap[org.id];
    const orgTickets = ticketsByOrg[org.id] ?? [];
    const hasOldTicket = orgTickets.some((t: any) => {
      const age = (Date.now() - new Date(t.created_at).getTime()) / 3600000;
      return age > 24;
    });

    let health: "green" | "amber" | "red" = "green";
    if (aiPct >= 100 || hasOldTicket) health = "red";
    else if (aiPct >= 80 || daysSinceActive > 14 || orgTickets.length > 0) health = "amber";
    if (daysSinceActive > 30 && health === "green") health = "amber";

    const isNew = new Date(org.created_at) > weekAgo;
    const ownerEmail = userEmailMap[org.owner_user_id] ?? settings.business_email ?? null;

    return {
      id: org.id,
      name: settings.dba_name || org.name,
      rawName: org.name,
      ownerEmail,
      ownerName: settings.owner_name ?? null,
      city: settings.city ?? null,
      state: settings.state ?? null,
      createdAt: org.created_at,
      isNew,
      lastActive,
      daysSinceActive,
      memberCount: memberCountByOrg[org.id] ?? 1,
      quoteCount: quoteCounts[org.id] ?? 0,
      jobCount: jobCounts[org.id] ?? 0,
      invoiceCount: invoiceCounts[org.id] ?? 0,
      customerCount: customerCounts[org.id] ?? 0,
      leadCount: leadCounts[org.id] ?? 0,
      photoCount: photoCounts[org.id] ?? 0,
      revenue: revenueByOrg[org.id] ?? 0,
      aiToday,
      aiMonth,
      aiLimit,
      aiPct,
      aiFeatures: aiFeaturesByOrg[org.id] ?? {},
      plan: membership?.plan ?? "free",
      planStatus: membership?.status ?? "active",
      health,
      tickets: orgTickets,
    };
  });

  enrichedOrgs.sort((a, b) => {
    const order = { red: 0, amber: 1, green: 2 };
    return order[a.health] - order[b.health];
  });

  const totalAiToday = aiRunsToday.length;
  const newSignups = orgs.filter((o) => new Date(o.created_at) > weekAgo).length;
  const activeOrgs = orgs.filter((o) => {
    const last = lastActivityMap[o.id];
    if (!last) return false;
    return new Date(last) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  }).length;

  const aiFeatureTotals: Record<string, number> = {};
  for (const r of aiRunsMonth) {
    aiFeatureTotals[r.feature] = (aiFeatureTotals[r.feature] ?? 0) + 1;
  }

  const recentActivity = activity.slice(0, 20).map((a) => {
    const org = orgs.find((o) => o.id === a.org_id);
    const settings = settingsMap[a.org_id];
    return {
      ...a,
      orgName: settings?.dba_name || org?.name || a.org_id,
    };
  });

  return {
    orgs: enrichedOrgs,
    stats: {
      totalOrgs: orgs.length,
      activeOrgs,
      newSignups,
      totalAiToday,
      openTickets: openTickets.length,
    },
    tickets: tickets.slice(0, 50),
    openTickets,
    aiFeatureTotals,
    recentActivity,
  };
}

export default async function AdminPage() {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || adminEmail === "REPLACE_WITH_YOUR_EMAIL") {
    notFound();
  }

  const currentEmail = await getCurrentUserEmail();
  const allowedEmails = adminEmail.split(",").map((e) => e.trim().toLowerCase());
  if (!currentEmail || !allowedEmails.includes(currentEmail.toLowerCase())) {
    notFound();
  }

  // If no password is configured yet, skip the password gate
  if (adminPassword) {
    const cookieStore = await cookies();
    const cookieToken = cookieStore.get(COOKIE_NAME)?.value;
    const expectedToken = makeAdminToken(adminPassword, adminEmail);

    if (cookieToken !== expectedToken) {
      return <AdminLogin />;
    }
  }

  const data = await fetchAdminData();
  return <AdminDashboard data={data} adminEmail={currentEmail} />;
}
