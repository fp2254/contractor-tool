import { createAdminClient } from "@/lib/supabase/admin";
import { ensureUserOrg } from "@/lib/auth";
import { redirect } from "next/navigation";
import ContractorProfileDashboard from "./ContractorProfileDashboard";

export const metadata = { title: "My Profile — TradeBase" };

export default async function MyProfilePage() {
  const orgId = await ensureUserOrg();
  if (!orgId) redirect("/auth/login");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const a = createAdminClient() as any;

  const [orgRes, settingsRes, pubProfileRes, reviewsRes, recentJobsRes, statsRes] = await Promise.all([
    a.from("orgs").select("name,owner_user_id").eq("id", orgId).single(),
    a.from("org_settings").select("dba_name,primary_phone,address,city,state,logo_url,service_area,license_number,owner_name,owner_title").eq("org_id", orgId).maybeSingle(),
    a.from("public_profiles").select("slug,is_published,trade,tagline,photo_url,service_area,urgency_line,years_experience,license_text,services,about_bullets,photos,selected_template").eq("org_id", orgId).maybeSingle(),
    a.from("profile_reviews").select("reviewer_name,rating,text,job_type,location,verified,created_at").eq("org_id", orgId).eq("approved", true).order("created_at", { ascending: false }).limit(20),
    a.from("jobs").select("id,title,status,scheduled_date,completed_date,customer_id,created_at").eq("org_id", orgId).order("completed_date", { ascending: false, nullsFirst: false }).limit(30),
    // Stats
    Promise.all([
      a.from("jobs").select("id", { count: "exact", head: true }).eq("org_id", orgId).eq("status", "completed"),
      a.from("customers").select("id", { count: "exact", head: true }).eq("org_id", orgId),
      a.from("invoices").select("total").eq("org_id", orgId).eq("status", "paid"),
      a.from("leads").select("id", { count: "exact", head: true }).eq("org_id", orgId).eq("lead_source", "Website"),
    ]),
  ]);

  const org = orgRes.data;
  const settings = settingsRes.data ?? {};
  const pub = pubProfileRes.data ?? null;
  const reviews = reviewsRes.data ?? [];
  const recentJobs = recentJobsRes.data ?? [];
  const [jobCountRes, customerCountRes, invoicesRes, webLeadsRes] = statsRes as any[];

  const completedJobs = jobCountRes.count ?? 0;
  const customerCount = customerCountRes.count ?? 0;
  const webLeads = webLeadsRes.count ?? 0;
  const totalRevenue = (invoicesRes.data ?? []).reduce((s: number, inv: any) => s + (parseFloat(inv.total) || 0), 0);
  const avgRating = reviews.length > 0
    ? Math.round((reviews.reduce((s: number, r: any) => s + r.rating, 0) / reviews.length) * 10) / 10
    : null;

  const businessName = settings.dba_name || org?.name || "";

  return (
    <ContractorProfileDashboard
      business={{
        name: businessName,
        phone: settings.primary_phone ?? "",
        address: [settings.address, settings.city, settings.state].filter(Boolean).join(", "),
        logoUrl: settings.logo_url ?? null,
        licenseNumber: settings.license_number ?? "",
        ownerName: settings.owner_name ?? "",
        ownerTitle: settings.owner_title ?? "",
      }}
      publicProfile={pub ? {
        slug: pub.slug,
        isPublished: pub.is_published,
        trade: pub.trade ?? "",
        tagline: pub.tagline ?? "",
        photoUrl: pub.photo_url ?? null,
        serviceArea: pub.service_area ?? settings.service_area ?? "",
        urgencyLine: pub.urgency_line ?? "",
        yearsExperience: pub.years_experience ?? 0,
        licenseText: pub.license_text ?? "",
        services: (pub.services ?? []).map((s: any) => typeof s === "string" ? s : s.name ?? ""),
        aboutBullets: pub.about_bullets ?? [],
        photos: pub.photos ?? [],
        selectedTemplate: pub.selected_template ?? "",
      } : null}
      stats={{
        completedJobs,
        customerCount,
        totalRevenue,
        avgRating,
        reviewCount: reviews.length,
        webLeads,
      }}
      reviews={reviews.map((r: any) => ({
        reviewerName: r.reviewer_name,
        rating: r.rating,
        text: r.text,
        jobType: r.job_type ?? "",
        location: r.location ?? "",
        verified: r.verified ?? false,
        createdAt: r.created_at,
      }))}
      recentJobs={recentJobs.map((j: any) => ({
        id: j.id,
        title: j.title,
        status: j.status,
        completedDate: j.completed_date,
        scheduledDate: j.scheduled_date,
        createdAt: j.created_at,
      }))}
    />
  );
}
