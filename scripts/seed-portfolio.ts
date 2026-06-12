/**
 * Seed portfolio projects for a given public profile slug.
 * Run: npx tsx scripts/seed-portfolio.ts maine-radon
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const slug = process.argv[2] ?? "maine-radon";

async function run() {
  // 1. Get org_id from public_profiles
  const { data: pub, error: pe } = await admin
    .from("public_profiles")
    .select("org_id")
    .eq("slug", slug)
    .maybeSingle();

  if (pe || !pub) {
    console.error("No public profile found for slug:", slug, pe?.message);
    process.exit(1);
  }
  const orgId = pub.org_id;
  console.log("org_id:", orgId);

  // 2. Pull real photo URLs from the photos table for this org
  const { data: existingPhotos } = await admin
    .from("photos")
    .select("url")
    .eq("org_id", orgId)
    .limit(20);

  const photoUrls = (existingPhotos ?? []).map((p: any) => p.url).filter(Boolean);
  console.log("Found", photoUrls.length, "existing photos");

  // 3. Check if projects already exist
  const { count } = await admin
    .from("projects")
    .select("id", { count: "exact", head: true })
    .eq("org_id", orgId);

  if ((count ?? 0) > 0) {
    console.log("Projects already exist for this org. Delete them first if you want to re-seed.");
    process.exit(0);
  }

  // 4. Build photo arrays — use real photos if available, otherwise empty
  const photos1 = photoUrls.slice(0, 4).map((url: string, i: number) => ({
    url,
    caption: i === 0 ? "Radon mitigation system installed" : i === 1 ? "Fan installation" : i === 2 ? "Pipe routing" : "Final inspection",
  }));

  const photos2 = photoUrls.slice(4, 8).map((url: string, i: number) => ({
    url,
    caption: i === 0 ? "Water treatment system" : i === 1 ? "Filter installation" : i === 2 ? "Before" : "After",
  }));

  const photos3 = photoUrls.slice(2, 5).map((url: string, i: number) => ({
    url,
    caption: i === 0 ? "New system" : i === 1 ? "Pipe connections" : "Test results",
  }));

  const now = new Date();
  const d = (monthsAgo: number) => {
    const dt = new Date(now);
    dt.setMonth(dt.getMonth() - monthsAgo);
    return dt.toISOString().slice(0, 10);
  };

  const projects = [
    {
      org_id: orgId,
      title: "Radon Mitigation System",
      description: "Installed sub-slab depressurization radon mitigation system. Post-installation testing confirmed levels reduced from 8.2 pCi/L to below 2 pCi/L.",
      status: "completed",
      location: "Portland, ME",
      completed_at: d(0),
      cost: 1800,
      tags: ["Radon", "Mitigation"],
      photos: photos1,
    },
    {
      org_id: orgId,
      title: "Water Treatment System",
      description: "Installed whole-house water filtration and softener system. Addressed high iron and hardness levels. Water quality tested and certified post-installation.",
      status: "completed",
      location: "Auburn, ME",
      completed_at: d(2),
      cost: 3200,
      tags: ["Water", "Filtration"],
      photos: photos2,
    },
    {
      org_id: orgId,
      title: "Radon Re-Test & Fan Replacement",
      description: "Annual follow-up visit. Replaced aging mitigation fan, updated pipe sealing, and confirmed ongoing radon levels within safe range.",
      status: "completed",
      location: "Lewiston, ME",
      completed_at: d(4),
      cost: 650,
      tags: ["Radon", "Maintenance"],
      photos: photos3,
    },
  ];

  const { data, error } = await admin.from("projects").insert(projects).select("id, title");
  if (error) {
    console.error("Insert failed:", error.message);
    process.exit(1);
  }

  console.log("Inserted", data?.length, "projects:");
  data?.forEach((p: any) => console.log(" -", p.id, p.title));
  console.log("Done! Visit /showcase/" + slug);
}

run().catch(console.error);
