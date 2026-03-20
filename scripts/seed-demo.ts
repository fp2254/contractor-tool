/**
 * TradeBase Demo Seed Script
 * Run: npx tsx scripts/seed-demo.ts
 *
 * Pre-requisites:
 * 1. Run supabase/migration_demo.sql in Supabase Studio (adds is_demo column)
 * 2. Set DEMO_USER_PASSWORD in Replit Secrets
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const DEMO_EMAIL = "demo@trade-base.biz";
const DEMO_PASSWORD = process.env.DEMO_USER_PASSWORD;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("❌  Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
if (!DEMO_PASSWORD) {
  console.error("❌  Missing DEMO_USER_PASSWORD — set it in Replit Secrets");
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Date helpers
const D = (offsetDays: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
};
const TS = (offsetDays: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString();
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = admin as any;

async function main() {
  console.log("🌱  TradeBase Demo Seed\n");

  // ────────────────────────────────────────────────
  // 1. Demo Org
  // ────────────────────────────────────────────────
  console.log("1/10  Finding or creating demo org…");
  let orgId: string;

  const { data: existingOrg } = await db
    .from("orgs")
    .select("id")
    .eq("is_demo", true)
    .maybeSingle();

  if (existingOrg) {
    orgId = existingOrg.id;
    console.log(`      ↳ Reusing org ${orgId}`);
  } else {
    const { data: newOrg, error: orgErr } = await db
      .from("orgs")
      .insert({ name: "TradeBase Demo Co", is_demo: true })
      .select("id")
      .single();
    if (orgErr) { console.error("❌  Org create failed — did you run migration_demo.sql?", orgErr); process.exit(1); }
    orgId = newOrg.id;
    console.log(`      ↳ Created org ${orgId}`);
  }

  // ────────────────────────────────────────────────
  // 2. Demo User
  // ────────────────────────────────────────────────
  console.log("2/10  Finding or creating demo user…");
  let userId: string;

  const { data: { users } } = await admin.auth.admin.listUsers();
  const existingUser = (users ?? []).find((u) => u.email === DEMO_EMAIL);

  if (existingUser) {
    userId = existingUser.id;
    await admin.auth.admin.updateUserById(userId, { password: DEMO_PASSWORD });
    console.log(`      ↳ Reusing user ${userId}`);
  } else {
    const { data: newUser, error: userErr } = await admin.auth.admin.createUser({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      email_confirm: true,
    });
    if (userErr || !newUser.user) { console.error("❌  User create failed:", userErr); process.exit(1); }
    userId = newUser.user.id;
    console.log(`      ↳ Created user ${userId}`);
  }

  // ────────────────────────────────────────────────
  // 3. Org Membership
  // ────────────────────────────────────────────────
  const { data: existingMember } = await db
    .from("org_members")
    .select("id")
    .eq("org_id", orgId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!existingMember) {
    await db.from("org_members").insert({ org_id: orgId, user_id: userId, role: "owner" });
  }

  // Org owner
  await db.from("orgs").update({ owner_user_id: userId }).eq("id", orgId);

  // ────────────────────────────────────────────────
  // 4. Wipe Existing Demo Data (FK-safe order)
  // ────────────────────────────────────────────────
  console.log("3/10  Wiping existing demo data…");
  const wipe = async (table: string) => {
    await db.from(table).delete().eq("org_id", orgId);
  };
  await wipe("payments");
  await wipe("invoice_items");
  await wipe("invoices");
  await wipe("quote_items");
  await wipe("quotes");
  await wipe("jobs");
  await wipe("leads");
  await wipe("notes");
  await wipe("trade_contacts");
  await wipe("inventory_items");
  await wipe("customers");
  await db.from("org_settings").delete().eq("org_id", orgId);
  await db.from("service_presets").delete().eq("org_id", orgId);

  // ────────────────────────────────────────────────
  // 5. Org Settings
  // ────────────────────────────────────────────────
  await db.from("org_settings").insert({
    org_id: orgId,
    business_name: "TradeBase Demo Co",
    business_phone: "(603) 555-0100",
    business_email: "demo@trade-base.biz",
    business_address: "12 Main Street, Lebanon, NH 03766",
    default_warranty_text: "||payment||labor-warranty||parts-warranty||",
    tax_rate: 0,
  });

  // ────────────────────────────────────────────────
  // 6. Service Presets
  // ────────────────────────────────────────────────
  console.log("4/10  Seeding service presets…");
  await db.from("service_presets").insert([
    { org_id: orgId, service_name: "Standard Radon Mitigation System", price_type: "flat", flat_rate: 1450, unit: "job", sort_order: 1, is_active: true },
    { org_id: orgId, service_name: "Additional Labor Units And Materials", price_type: "flat", flat_rate: 150, unit: "job", sort_order: 2, is_active: true },
    { org_id: orgId, service_name: "Radon-in-Water Aeration System", price_type: "flat", flat_rate: 2800, unit: "job", sort_order: 3, is_active: true },
    { org_id: orgId, service_name: "Fan Replacement", price_type: "flat", flat_rate: 375, unit: "job", sort_order: 4, is_active: true },
    { org_id: orgId, service_name: "Crawlspace Vapor Barrier", price_type: "flat", flat_rate: 1200, unit: "job", sort_order: 5, is_active: true },
    { org_id: orgId, service_name: "Radon Test", price_type: "flat", flat_rate: 175, unit: "test", sort_order: 6, is_active: true },
  ]);

  // ────────────────────────────────────────────────
  // 7. Customers
  // ────────────────────────────────────────────────
  console.log("5/10  Seeding customers…");
  const { data: customers } = await db.from("customers").insert([
    {
      org_id: orgId, created_by_user: userId,
      first_name: "John", last_name: "Carter",
      phone: "(603) 555-0121", email: "jcarter@email.com",
      address_line1: "542 Water Street", city: "Lebanon", state: "NH", zip: "03766",
    },
    {
      org_id: orgId, created_by_user: userId,
      first_name: "Sarah", last_name: "Whitman",
      phone: "(603) 555-0188", email: "swhitman@gmail.com",
      address_line1: "18 Maple Ridge Road", city: "Hanover", state: "NH", zip: "03755",
    },
    {
      org_id: orgId, created_by_user: userId,
      first_name: "Pine Ridge", last_name: "", company_name: "Pine Ridge Realty",
      phone: "(603) 555-0200", email: "contact@pineridgerealty.com",
      address_line1: "77 Commerce Drive", city: "West Lebanon", state: "NH", zip: "03784",
    },
    {
      org_id: orgId, created_by_user: userId,
      first_name: "Green Meadow", last_name: "", company_name: "Green Meadow Apartments",
      phone: "(603) 555-0245", email: "mgr@greenmeadow.com",
      address_line1: "200 Green Meadow Blvd", city: "Enfield", state: "NH", zip: "03748",
    },
  ]).select("id,first_name,last_name,company_name");

  const cust = (name: string) => customers!.find((c: { first_name: string; company_name?: string }) =>
    c.first_name === name || c.company_name?.startsWith(name));

  const custId = (name: string) => cust(name)!.id as string;

  const johnId = custId("John");
  const sarahId = custId("Sarah");
  const pineId = custId("Pine Ridge");
  const greenId = custId("Green Meadow");

  // ────────────────────────────────────────────────
  // 8. Leads
  // ────────────────────────────────────────────────
  console.log("6/10  Seeding leads…");
  await db.from("leads").insert([
    {
      org_id: orgId, status: "new",
      first_name: "Dave", last_name: "McAllister",
      phone: "(603) 555-0301", email: "dmcallister@outlook.com",
      address: "34 Birch Lane, Grafton, NH",
      source: "Referral",
      notes: "Friend of John Carter. Wants radon test first, possible mitigation.",
      created_at: TS(-1),
    },
    {
      org_id: orgId, status: "contacted",
      first_name: "Jen", last_name: "Colby",
      phone: "(603) 555-0315", email: "jencolby@gmail.com",
      address: "91 Prospect Street, Plymouth, NH",
      source: "Google",
      notes: "Left voicemail. Elevated radon test result, concerned about kids.",
      created_at: TS(-3),
    },
    {
      org_id: orgId, status: "quoted",
      first_name: "Tom", last_name: "Rafferty",
      phone: "(603) 555-0388", email: "trafferty@yahoo.com",
      address: "5 Old Mill Road, Claremont, NH",
      source: "Website",
      notes: "Sent quote for standard system. Waiting to hear back.",
      created_at: TS(-7),
    },
    {
      org_id: orgId, status: "scheduled",
      first_name: "Harbor View", last_name: "", company_name: "Harbor View Builders",
      phone: "(603) 555-0410", email: "info@harborview.build",
      address: "New construction site, Lyme, NH",
      source: "Referral",
      notes: "New construction sub-slab installation. Booked for next Thursday.",
      created_at: TS(-5),
    },
    {
      org_id: orgId, status: "won",
      first_name: "Mike", last_name: "Bouchard",
      phone: "(603) 555-0450", email: "mikebouchard@comcast.net",
      address: "22 Cedar Point Drive, Grantham, NH",
      source: "Facebook",
      notes: "Radon test came back at 6.2 pCi/L. Completed install last week.",
      created_at: TS(-14),
    },
    {
      org_id: orgId, status: "lost",
      first_name: "Linda", last_name: "Frost",
      phone: "(603) 555-0489", email: "lfrost@email.com",
      address: "55 Winter Hill Rd, Canaan, NH",
      source: "Google",
      notes: "Went with a competitor who was $200 cheaper. No response after follow-up.",
      created_at: TS(-10),
    },
  ]);

  // ────────────────────────────────────────────────
  // 9. Quotes + Quote Items
  // ────────────────────────────────────────────────
  console.log("7/10  Seeding quotes and jobs…");

  const { data: quotes } = await db.from("quotes").insert([
    {
      org_id: orgId, customer_id: johnId, created_by_user: userId,
      status: "draft", total_amount: 1600,
      notes: "Standard radon mitigation system with additional labor.",
      scope_items: "Install RP145 fan with PVC pipe through basement slab\nSeal all penetrations and verify with manometer\nInstall warning device per EPA guidelines",
      created_at: TS(-2),
    },
    {
      org_id: orgId, customer_id: sarahId, created_by_user: userId,
      status: "sent", total_amount: 2800,
      notes: "Radon-in-water aeration system. Sent to customer 3 days ago.",
      scope_items: "Install aeration system in utility room\nConnect to existing water supply\nPost-treatment water test included",
      created_at: TS(-3),
    },
    {
      org_id: orgId, customer_id: greenId, created_by_user: userId,
      status: "accepted", total_amount: 1200,
      notes: "Crawlspace vapor barrier for 1,100 sq ft crawlspace.",
      scope_items: "Install 20-mil poly vapor barrier\nTape all seams and seal to foundation walls",
      created_at: TS(-8),
    },
    {
      org_id: orgId, customer_id: pineId, created_by_user: userId,
      status: "declined", total_amount: 375,
      notes: "Fan replacement quote. Customer declined — going with another vendor.",
      created_at: TS(-12),
    },
  ]).select("id,customer_id,total_amount");

  const quoteByCustomer = (cId: string) => quotes!.find((q: { customer_id: string }) => q.customer_id === cId);
  const johnQuote = quoteByCustomer(johnId);
  const sarahQuote = quoteByCustomer(sarahId);
  const greenQuote = quoteByCustomer(greenId);
  const pineQuote = quoteByCustomer(pineId);

  await db.from("quote_items").insert([
    // John — draft quote
    { org_id: orgId, quote_id: johnQuote!.id, description: "Standard Radon Mitigation System", quantity: 1, unit_price: 1450, total_price: 1450 },
    { org_id: orgId, quote_id: johnQuote!.id, description: "Additional Labor Units And Materials", quantity: 1, unit_price: 150, total_price: 150 },
    // Sarah — sent quote
    { org_id: orgId, quote_id: sarahQuote!.id, description: "Radon-in-Water Aeration System", quantity: 1, unit_price: 2800, total_price: 2800 },
    // Green — accepted
    { org_id: orgId, quote_id: greenQuote!.id, description: "Crawlspace Vapor Barrier (1,100 sq ft)", quantity: 1, unit_price: 1200, total_price: 1200 },
    // Pine — declined
    { org_id: orgId, quote_id: pineQuote!.id, description: "Fan Replacement", quantity: 1, unit_price: 375, total_price: 375 },
  ]);

  // ────────────────────────────────────────────────
  // 10. Jobs
  // ────────────────────────────────────────────────
  const { data: jobs } = await db.from("jobs").insert([
    {
      org_id: orgId, customer_id: johnId, quote_id: johnQuote!.id, created_by_user: userId,
      title: "Radon Mitigation System Install", status: "scheduled",
      scheduled_date: D(1),
      notes: "Full system install. Customer will be home all day.",
    },
    {
      org_id: orgId, customer_id: sarahId, quote_id: sarahQuote!.id, created_by_user: userId,
      title: "Radon-in-Water Aeration Install", status: "in_progress",
      scheduled_date: D(0),
      notes: "Started today. System partially installed, finishing connections tomorrow.",
    },
    {
      org_id: orgId, customer_id: greenId, quote_id: greenQuote!.id, created_by_user: userId,
      title: "Crawlspace Vapor Barrier", status: "waiting_on_parts",
      scheduled_date: D(4),
      notes: "Waiting on 20-mil vapor barrier rolls from ABC Supply.",
    },
    {
      org_id: orgId, customer_id: pineId, created_by_user: userId,
      title: "Radon Fan Replacement", status: "complete",
      scheduled_date: D(-5),
      notes: "Replaced original RP145 that burned out. New fan installed and tested.",
    },
  ]).select("id,customer_id");

  const jobByCustomer = (cId: string) => jobs!.find((j: { customer_id: string }) => j.customer_id === cId);
  const pineJob = jobByCustomer(pineId);
  const greenJob = jobByCustomer(greenId);

  // ────────────────────────────────────────────────
  // 11. Invoices + Items + Payments
  // ────────────────────────────────────────────────
  console.log("8/10  Seeding invoices and payments…");
  const { data: invoices } = await db.from("invoices").insert([
    {
      org_id: orgId, customer_id: greenId, job_id: greenJob!.id, created_by_user: userId,
      status: "paid", total_amount: 1200,
      due_date: TS(-10),
      notes: "Vapor barrier complete. Paid in full.",
    },
    {
      org_id: orgId, customer_id: johnId, created_by_user: userId,
      status: "paid", total_amount: 175,
      due_date: TS(-20),
      notes: "Annual radon test — pre-install.",
    },
    {
      org_id: orgId, customer_id: johnId, quote_id: johnQuote!.id, created_by_user: userId,
      status: "unpaid", total_amount: 1600,
      due_date: TS(14),
      notes: "Full system install — due on completion.",
    },
    {
      org_id: orgId, customer_id: sarahId, quote_id: sarahQuote!.id, created_by_user: userId,
      status: "overdue", total_amount: 2800,
      due_date: TS(-5),
      notes: "Aeration system — deposit received, balance overdue.",
    },
  ]).select("id,customer_id,status");

  const invByStatus = (status: string, cId?: string) =>
    invoices!.find((i: { status: string; customer_id: string }) =>
      i.status === status && (!cId || i.customer_id === cId));

  const paidGreen = invByStatus("paid", greenId);
  const paidJohn = invByStatus("paid", johnId);
  const unpaidJohn = invByStatus("unpaid", johnId);
  const overdSarah = invByStatus("overdue", sarahId);

  await db.from("invoice_items").insert([
    { org_id: orgId, invoice_id: paidGreen!.id, description: "Crawlspace Vapor Barrier (1,100 sq ft)", quantity: 1, unit_price: 1200, total_price: 1200 },
    { org_id: orgId, invoice_id: paidJohn!.id, description: "Radon Test (2-day kit, lab results)", quantity: 1, unit_price: 175, total_price: 175 },
    { org_id: orgId, invoice_id: unpaidJohn!.id, description: "Standard Radon Mitigation System", quantity: 1, unit_price: 1450, total_price: 1450 },
    { org_id: orgId, invoice_id: unpaidJohn!.id, description: "Additional Labor Units And Materials", quantity: 1, unit_price: 150, total_price: 150 },
    { org_id: orgId, invoice_id: overdSarah!.id, description: "Radon-in-Water Aeration System", quantity: 1, unit_price: 2800, total_price: 2800 },
  ]);

  await db.from("payments").insert([
    { org_id: orgId, invoice_id: paidGreen!.id, amount: 1200, method: "check", paid_at: TS(-8), notes: "Check #1042 from Green Meadow Mgmt" },
    { org_id: orgId, invoice_id: paidJohn!.id, amount: 175, method: "venmo", paid_at: TS(-18), notes: "Venmo payment received" },
    { org_id: orgId, invoice_id: overdSarah!.id, amount: 500, method: "check", paid_at: TS(-14), notes: "Deposit check #2201" },
  ]);

  // Update paid invoices
  await db.from("invoices").update({ status: "paid" }).eq("id", paidGreen!.id);
  await db.from("invoices").update({ status: "paid" }).eq("id", paidJohn!.id);

  // ────────────────────────────────────────────────
  // 12. Trade Contacts
  // ────────────────────────────────────────────────
  console.log("9/10  Seeding trade contacts and inventory…");
  await db.from("trade_contacts").insert([
    { org_id: orgId, name: "Mike Levesque", company: "Mike's Plumbing", trade: "Plumber", phone: "(603) 555-0600", email: "mike@mikesplumbing.com", notes: "Good for emergency calls. Reliable." },
    { org_id: orgId, name: "Kevin Park", company: "Eastern Electrical", trade: "Electrician", phone: "(603) 555-0622", email: "kpark@easternelec.com", notes: "Handles fan wiring on large jobs." },
    { org_id: orgId, name: "Jim Walsh", company: "Grafton County Building", trade: "Other", phone: "(603) 555-0650", email: "jwalsh@co.grafton.nh.us", notes: "County building inspector — call before permits." },
    { org_id: orgId, name: "Dan Torres", company: "ABC Supply Co", trade: "Other", phone: "(603) 555-0680", email: "dtorres@abcsupply.com", notes: "Main supplier. Will order special sizes if needed." },
  ]);

  // ────────────────────────────────────────────────
  // 13. Inventory
  // ────────────────────────────────────────────────
  await db.from("inventory_items").insert([
    { org_id: orgId, name: "RP145 Radon Fan", sku: "RP145", category: "Equipment", quantity: 3, unit_cost: 95, description: "Standard residential radon mitigation fan." },
    { org_id: orgId, name: "3-inch PVC Pipe Fittings", sku: "PVC-3-FITTINGS", category: "Parts", quantity: 22, unit_cost: 4.50, description: "Assorted elbows and couplings for 3-inch pipe." },
    { org_id: orgId, name: "Digital Manometer", sku: "MANO-DIG", category: "Tools", quantity: 2, unit_cost: 85, description: "Magnehelic digital pressure gauge." },
    { org_id: orgId, name: "4-inch PVC Couplings", sku: "PVC-4-COUP", category: "Parts", quantity: 14, unit_cost: 6.25, description: "Standard 4-inch schedule 40 couplings." },
    { org_id: orgId, name: "Radon/CO Alarm Monitor", sku: "ALARM-CO-RN", category: "Equipment", quantity: 5, unit_cost: 55, description: "Combination radon and carbon monoxide alarm." },
    { org_id: orgId, name: "20-mil Vapor Barrier Roll", sku: "VB-20MIL", category: "Materials", quantity: 2, unit_cost: 210, description: "1,000 sq ft roll, crawlspace moisture barrier." },
  ]);

  // ────────────────────────────────────────────────
  // 14. Notes
  // ────────────────────────────────────────────────
  const safeNote = async (type: string, id: string, body: string) => {
    try {
      await db.from("notes").insert({ org_id: orgId, entity_type: type, entity_id: id, body, created_at: TS(-1) });
    } catch { /* notes table may have different schema — skip */ }
  };

  await safeNote("customer", johnId, "Homeowner very concerned about radon levels — has young kids. Test came back at 4.8 pCi/L. Wants system before winter.");
  await safeNote("customer", sarahId, "Water test confirmed 5,200 pCi/L radon-in-water. On well water. Aeration system recommended by state lab.");
  await safeNote("job", jobs!.find((j: { customer_id: string }) => j.customer_id === sarahId)?.id, "Started roughing in the system. Water pressure is good at 55 PSI. Should finish tomorrow morning.");

  console.log("10/10 Done!\n");
  console.log("✅  Demo data seeded successfully.");
  console.log(`    Org ID:  ${orgId}`);
  console.log(`    User:    ${DEMO_EMAIL}`);
  console.log(`    Demo URL: /demo\n`);
  console.log("    Dashboard will show:");
  console.log("    • 1 new lead (Dave McAllister)");
  console.log("    • 1 job today (Sarah Whitman aeration)");
  console.log("    • $4,400 unpaid/overdue");
  console.log("    • 1 sent quote (Sarah Whitman)");
}

main().catch((err) => {
  console.error("❌  Seed failed:", err);
  process.exit(1);
});
