// PUBLIC CONFIG

const SUPABASE_URL = "https://uafgyteczukkgmxfbeil.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhZmd5dGVjenVra2dteGZiZWlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyNDEyODQsImV4cCI6MjA3ODgxNzI4NH0.tiddA-ORf1b3ZnQOxGEOgq3rJW-BJe3MMD7QahvDFO4";

const STRIPE_PUBLISHABLE_KEY =
  "pk_live_51SRDaxBQnHmahVblkIfGBpeLtjSfXZn2r277Wcf7FicFPmjbbPnPgRCtle9c9j4HxX9gxZ9kTv0IepOfKmmZQ06900fSEnjjEo";

// PLAN CODES

const PLANS = {
  LIFETIME_EARLY: "lifetime_early",
  LIFETIME_REGULAR: "lifetime_regular",
  MONTHLY: "monthly",
  YEARLY: "yearly",
};

const ADDONS = {
  CONNECT_STRIPE: "connect_stripe",
};

// YOUR PRICE IDS

const STRIPE_PRICE_IDS = {
  [PLANS.LIFETIME_EARLY]: "price_1SVkdpBQnHmahVblGACoBqoJ", // $149
  [PLANS.LIFETIME_REGULAR]: "price_1SVkdpBQnHmahVblGACoBqoJ", // $199 (same Stripe price for now)
  [PLANS.MONTHLY]: "price_1SUIKEBQnHmahVblf7WGY5lW", // $9.99/mo
  [PLANS.YEARLY]: "price_1SUILYBQnHmahVblsHU8lwDE", // $99/yr
};

const STRIPE_ADDON_PRICE_IDS = {
  [ADDONS.CONNECT_STRIPE]: "price_1SVkebBQnHmahVblU6qXXG4Q", // $4/mo
};

// Same-origin API (Express serves this front-end)
const API_BASE_URL = "";
