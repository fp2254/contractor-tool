import { requirePlatformAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import ReviewsAdminClient from "./ReviewsAdminClient";

export const dynamic = "force-dynamic";

export default async function AdminReviewsPage() {
  await requirePlatformAdmin();
  const admin = createAdminClient();

  let rows: any[] = [];
  try {
    const { data: reviews } = await (admin as any)
      .from("profile_reviews")
      .select("*")
      .order("created_at", { ascending: false });

    if (reviews?.length) {
      const orgIds = [...new Set((reviews as any[]).map((r) => r.org_id))];
      const { data: orgs } = await admin.from("orgs").select("id, name").in("id", orgIds);
      const { data: profiles } = await (admin as any)
        .from("public_profiles")
        .select("org_id, slug")
        .in("org_id", orgIds);

      const orgMap: Record<string, string> = {};
      (orgs ?? []).forEach((o: any) => { orgMap[o.id] = o.name; });
      const slugMap: Record<string, string> = {};
      (profiles ?? []).forEach((p: any) => { slugMap[p.org_id] = p.slug; });

      rows = (reviews as any[]).map((r) => ({
        ...r,
        org_name: orgMap[r.org_id] ?? r.org_id,
        slug: slugMap[r.org_id] ?? null,
      }));
    }
  } catch {
    // Table may not exist yet
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between mt-2">
        <h1 className="text-lg font-bold text-slate-800">Reviews</h1>
        <div className="flex gap-2">
          <span className="text-xs bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded-full">
            {rows.filter((r) => r.approved).length} approved
          </span>
          <span className="text-xs bg-yellow-100 text-yellow-700 font-bold px-2 py-0.5 rounded-full">
            {rows.filter((r) => !r.approved).length} pending
          </span>
        </div>
      </div>
      {rows.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700">
          <p className="font-semibold mb-1">No reviews yet — or table not set up</p>
          <p className="text-xs">Run <code className="bg-amber-100 px-1 rounded">scripts/profile-reviews-setup.sql</code> in Supabase Studio to create the table.</p>
        </div>
      )}
      <ReviewsAdminClient initialRows={rows} />
    </div>
  );
}
