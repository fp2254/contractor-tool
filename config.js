// --------------------------
// SUPABASE CONFIG
// --------------------------
const SUPABASE_URL = "https://uafgyteczukkgmxfbeil.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhZmd5dGVjenVra2dteGZiZWlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyNDEyODQsImV4cCI6MjA3ODgxNzI4NH0.tiddA-ORf1b3ZnQOxGEOgq3rJW-BJe3MMD7QahvDFO4";

// --------------------------
// STRIPE CONFIG
// --------------------------
const STRIPE_PUBLISHABLE_KEY = "pk_live_51SRDaxBQnHmahVblkIfGBpeLtjSfXZn2r277Wcf7FicFPmjbbPnPgRCtle9c9j4HxX9gxZ9kTv0IepOfKmmZQ06900fSEnjjEo";


// --------------------------
// PLAN PRICE IDS
// --------------------------
const PLANS = {
  LIFETIME_EARLY: "lifetime_early",
  LIFETIME_REGULAR: "lifetime_regular",
  MONTHLY: "monthly",
  YEARLY: "yearly",
};

const ADDONS = {
  CONNECT_STRIPE: "connect_stripe",
};

const STRIPE_PRICE_IDS = {
  [PLANS.LIFETIME_EARLY]: "price_1SVkdpBQnHmahVblGACoBqoJ",
  [PLANS.LIFETIME_REGULAR]: "price_1SVkdpBQnHmahVblGACoBqoJ",
  [PLANS.MONTHLY]: "price_1SUIKEBQnHmahVblf7WGY5lW",
  [PLANS.YEARLY]: "price_1SUILYBQnHmahVblsHU8lwDE",
};

const STRIPE_ADDON_PRICE_IDS = {
  [ADDONS.CONNECT_STRIPE]: "price_1SVkebBQnHmahVblU6qXXG4Q",
};
