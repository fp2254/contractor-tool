// --------------------------
// PUBLIC CONFIG (FRONTEND)
// --------------------------

// TODO: replace with your real Supabase project URL (ends with .supabase.co)
const SUPABASE_URL = "https://YOUR-PROJECT.supabase.co";

// TODO: replace with your real Supabase anon key (safe for frontend)
const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";

// TODO: replace with your real Stripe publishable key (pk_live_... or pk_test_...)
const STRIPE_PUBLISHABLE_KEY = "pk_live_xxx_or_pk_test_xxx";

// Plan codes (used in UI + backend)
const PLANS = {
  LIFETIME_EARLY: "lifetime_early",
  LIFETIME_REGULAR: "lifetime_regular",
  MONTHLY: "monthly",
  YEARLY: "yearly",
};

const ADDONS = {
  CONNECT_STRIPE: "connect_stripe",
};

// Your actual Stripe price IDs (from your message)
const STRIPE_PRICE_IDS = {
  [PLANS.LIFETIME_EARLY]: "price_1SVkdpBQnHmahVblGACoBqoJ", // $149
  [PLANS.LIFETIME_REGULAR]: "price_1SVkdpBQnHmahVblGACoBqoJ", // $199 (same stripe price now)
  [PLANS.MONTHLY]: "price_1SUIKEBQnHmahVblf7WGY5lW", // $9.99/mo
  [PLANS.YEARLY]: "price_1SUILYBQnHmahVblsHU8lwDE", // $99/yr
};

const STRIPE_ADDON_PRICE_IDS = {
  [ADDONS.CONNECT_STRIPE]: "price_1SVkebBQnHmahVblU6qXXG4Q", // $4/mo add-on
};

// Use same origin backend (Replit fullstack) – just use relative paths in fetch
const API_BASE_URL = "";
