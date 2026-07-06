-- ================================================================
-- TradeBase — Row Level Security (RLS)
-- Run once in Supabase Studio → SQL Editor
-- Safe: skips any table that doesn't exist in your database yet.
-- All app code uses the service role key which bypasses RLS.
-- ================================================================

-- ----------------------------------------------------------------
-- HELPER FUNCTION
-- SECURITY DEFINER breaks the recursive cycle when org_members
-- queries itself. Runs as postgres, bypassing RLS on the inner query.
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION user_org_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT org_id FROM org_members WHERE user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION match_email_to_org(p_email text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pp.org_id
  FROM auth.users u
  JOIN org_members om ON om.user_id = u.id
  JOIN public_profiles pp ON pp.org_id = om.org_id
  WHERE lower(u.email) = lower(trim(p_email))
    AND pp.is_published = true
  ORDER BY om.created_at ASC
  LIMIT 1;
$$;

-- ================================================================
-- CORE TABLES (always exist)
-- ================================================================

-- 1. ORGS
ALTER TABLE orgs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "orgs: members can select" ON orgs;
DROP POLICY IF EXISTS "orgs: members can update" ON orgs;
CREATE POLICY "orgs: members can select" ON orgs FOR SELECT USING (id IN (SELECT user_org_ids()));
CREATE POLICY "orgs: members can update" ON orgs FOR UPDATE USING (id IN (SELECT user_org_ids())) WITH CHECK (id IN (SELECT user_org_ids()));

-- 2. ORG_MEMBERS
ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org_members: members can select" ON org_members;
CREATE POLICY "org_members: members can select" ON org_members FOR SELECT USING (org_id IN (SELECT user_org_ids()));

-- 3. CUSTOMERS
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "customers: org access" ON customers;
DROP POLICY IF EXISTS "customers: org insert" ON customers;
DROP POLICY IF EXISTS "customers: org update" ON customers;
DROP POLICY IF EXISTS "customers: org delete" ON customers;
CREATE POLICY "customers: org access" ON customers FOR SELECT USING (org_id IN (SELECT user_org_ids()));
CREATE POLICY "customers: org insert" ON customers FOR INSERT WITH CHECK (org_id IN (SELECT user_org_ids()));
CREATE POLICY "customers: org update" ON customers FOR UPDATE USING (org_id IN (SELECT user_org_ids())) WITH CHECK (org_id IN (SELECT user_org_ids()));
CREATE POLICY "customers: org delete" ON customers FOR DELETE USING (org_id IN (SELECT user_org_ids()));

-- 4. LEADS
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "leads: org access" ON leads;
DROP POLICY IF EXISTS "leads: org insert" ON leads;
DROP POLICY IF EXISTS "leads: org update" ON leads;
DROP POLICY IF EXISTS "leads: org delete" ON leads;
CREATE POLICY "leads: org access" ON leads FOR SELECT USING (org_id IN (SELECT user_org_ids()));
CREATE POLICY "leads: org insert" ON leads FOR INSERT WITH CHECK (org_id IN (SELECT user_org_ids()));
CREATE POLICY "leads: org update" ON leads FOR UPDATE USING (org_id IN (SELECT user_org_ids())) WITH CHECK (org_id IN (SELECT user_org_ids()));
CREATE POLICY "leads: org delete" ON leads FOR DELETE USING (org_id IN (SELECT user_org_ids()));

-- 5. JOBS
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "jobs: org access" ON jobs;
DROP POLICY IF EXISTS "jobs: org insert" ON jobs;
DROP POLICY IF EXISTS "jobs: org update" ON jobs;
DROP POLICY IF EXISTS "jobs: org delete" ON jobs;
CREATE POLICY "jobs: org access" ON jobs FOR SELECT USING (org_id IN (SELECT user_org_ids()));
CREATE POLICY "jobs: org insert" ON jobs FOR INSERT WITH CHECK (org_id IN (SELECT user_org_ids()));
CREATE POLICY "jobs: org update" ON jobs FOR UPDATE USING (org_id IN (SELECT user_org_ids())) WITH CHECK (org_id IN (SELECT user_org_ids()));
CREATE POLICY "jobs: org delete" ON jobs FOR DELETE USING (org_id IN (SELECT user_org_ids()));

-- 6. QUOTES
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "quotes: org access" ON quotes;
DROP POLICY IF EXISTS "quotes: org insert" ON quotes;
DROP POLICY IF EXISTS "quotes: org update" ON quotes;
DROP POLICY IF EXISTS "quotes: org delete" ON quotes;
CREATE POLICY "quotes: org access" ON quotes FOR SELECT USING (org_id IN (SELECT user_org_ids()));
CREATE POLICY "quotes: org insert" ON quotes FOR INSERT WITH CHECK (org_id IN (SELECT user_org_ids()));
CREATE POLICY "quotes: org update" ON quotes FOR UPDATE USING (org_id IN (SELECT user_org_ids())) WITH CHECK (org_id IN (SELECT user_org_ids()));
CREATE POLICY "quotes: org delete" ON quotes FOR DELETE USING (org_id IN (SELECT user_org_ids()));

-- 7. QUOTE_ITEMS
ALTER TABLE quote_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "quote_items: org access" ON quote_items;
DROP POLICY IF EXISTS "quote_items: org insert" ON quote_items;
DROP POLICY IF EXISTS "quote_items: org update" ON quote_items;
DROP POLICY IF EXISTS "quote_items: org delete" ON quote_items;
CREATE POLICY "quote_items: org access" ON quote_items FOR SELECT USING (org_id IN (SELECT user_org_ids()));
CREATE POLICY "quote_items: org insert" ON quote_items FOR INSERT WITH CHECK (org_id IN (SELECT user_org_ids()));
CREATE POLICY "quote_items: org update" ON quote_items FOR UPDATE USING (org_id IN (SELECT user_org_ids())) WITH CHECK (org_id IN (SELECT user_org_ids()));
CREATE POLICY "quote_items: org delete" ON quote_items FOR DELETE USING (org_id IN (SELECT user_org_ids()));

-- 8. INVOICES
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "invoices: org access" ON invoices;
DROP POLICY IF EXISTS "invoices: org insert" ON invoices;
DROP POLICY IF EXISTS "invoices: org update" ON invoices;
DROP POLICY IF EXISTS "invoices: org delete" ON invoices;
CREATE POLICY "invoices: org access" ON invoices FOR SELECT USING (org_id IN (SELECT user_org_ids()));
CREATE POLICY "invoices: org insert" ON invoices FOR INSERT WITH CHECK (org_id IN (SELECT user_org_ids()));
CREATE POLICY "invoices: org update" ON invoices FOR UPDATE USING (org_id IN (SELECT user_org_ids())) WITH CHECK (org_id IN (SELECT user_org_ids()));
CREATE POLICY "invoices: org delete" ON invoices FOR DELETE USING (org_id IN (SELECT user_org_ids()));

-- 9. INVOICE_ITEMS
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "invoice_items: org access" ON invoice_items;
DROP POLICY IF EXISTS "invoice_items: org insert" ON invoice_items;
DROP POLICY IF EXISTS "invoice_items: org update" ON invoice_items;
DROP POLICY IF EXISTS "invoice_items: org delete" ON invoice_items;
CREATE POLICY "invoice_items: org access" ON invoice_items FOR SELECT USING (org_id IN (SELECT user_org_ids()));
CREATE POLICY "invoice_items: org insert" ON invoice_items FOR INSERT WITH CHECK (org_id IN (SELECT user_org_ids()));
CREATE POLICY "invoice_items: org update" ON invoice_items FOR UPDATE USING (org_id IN (SELECT user_org_ids())) WITH CHECK (org_id IN (SELECT user_org_ids()));
CREATE POLICY "invoice_items: org delete" ON invoice_items FOR DELETE USING (org_id IN (SELECT user_org_ids()));

-- 10. MESSAGE_TEMPLATES
ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "message_templates: org access" ON message_templates;
DROP POLICY IF EXISTS "message_templates: org insert" ON message_templates;
DROP POLICY IF EXISTS "message_templates: org update" ON message_templates;
DROP POLICY IF EXISTS "message_templates: org delete" ON message_templates;
CREATE POLICY "message_templates: org access" ON message_templates FOR SELECT USING (org_id IN (SELECT user_org_ids()));
CREATE POLICY "message_templates: org insert" ON message_templates FOR INSERT WITH CHECK (org_id IN (SELECT user_org_ids()));
CREATE POLICY "message_templates: org update" ON message_templates FOR UPDATE USING (org_id IN (SELECT user_org_ids())) WITH CHECK (org_id IN (SELECT user_org_ids()));
CREATE POLICY "message_templates: org delete" ON message_templates FOR DELETE USING (org_id IN (SELECT user_org_ids()));

-- 11. FOLLOWUPS
ALTER TABLE followups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "followups: org access" ON followups;
DROP POLICY IF EXISTS "followups: org insert" ON followups;
DROP POLICY IF EXISTS "followups: org update" ON followups;
DROP POLICY IF EXISTS "followups: org delete" ON followups;
CREATE POLICY "followups: org access" ON followups FOR SELECT USING (org_id IN (SELECT user_org_ids()));
CREATE POLICY "followups: org insert" ON followups FOR INSERT WITH CHECK (org_id IN (SELECT user_org_ids()));
CREATE POLICY "followups: org update" ON followups FOR UPDATE USING (org_id IN (SELECT user_org_ids())) WITH CHECK (org_id IN (SELECT user_org_ids()));
CREATE POLICY "followups: org delete" ON followups FOR DELETE USING (org_id IN (SELECT user_org_ids()));

-- ================================================================
-- OPTIONAL TABLES (wrapped in safety checks — skipped if not created yet)
-- ================================================================

DO $$
DECLARE t text;
BEGIN

  -- payments
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='payments') THEN
    ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "payments: org access" ON payments;
    DROP POLICY IF EXISTS "payments: org insert" ON payments;
    DROP POLICY IF EXISTS "payments: org update" ON payments;
    DROP POLICY IF EXISTS "payments: org delete" ON payments;
    CREATE POLICY "payments: org access" ON payments FOR SELECT USING (org_id IN (SELECT user_org_ids()));
    CREATE POLICY "payments: org insert" ON payments FOR INSERT WITH CHECK (org_id IN (SELECT user_org_ids()));
    CREATE POLICY "payments: org update" ON payments FOR UPDATE USING (org_id IN (SELECT user_org_ids())) WITH CHECK (org_id IN (SELECT user_org_ids()));
    CREATE POLICY "payments: org delete" ON payments FOR DELETE USING (org_id IN (SELECT user_org_ids()));
  END IF;

  -- photos
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='photos') THEN
    ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "photos: org access" ON photos;
    DROP POLICY IF EXISTS "photos: org insert" ON photos;
    DROP POLICY IF EXISTS "photos: org update" ON photos;
    DROP POLICY IF EXISTS "photos: org delete" ON photos;
    CREATE POLICY "photos: org access" ON photos FOR SELECT USING (org_id IN (SELECT user_org_ids()));
    CREATE POLICY "photos: org insert" ON photos FOR INSERT WITH CHECK (org_id IN (SELECT user_org_ids()));
    CREATE POLICY "photos: org update" ON photos FOR UPDATE USING (org_id IN (SELECT user_org_ids())) WITH CHECK (org_id IN (SELECT user_org_ids()));
    CREATE POLICY "photos: org delete" ON photos FOR DELETE USING (org_id IN (SELECT user_org_ids()));
  END IF;

  -- notes
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='notes') THEN
    ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "notes: org access" ON notes;
    DROP POLICY IF EXISTS "notes: org insert" ON notes;
    DROP POLICY IF EXISTS "notes: org update" ON notes;
    DROP POLICY IF EXISTS "notes: org delete" ON notes;
    CREATE POLICY "notes: org access" ON notes FOR SELECT USING (org_id IN (SELECT user_org_ids()));
    CREATE POLICY "notes: org insert" ON notes FOR INSERT WITH CHECK (org_id IN (SELECT user_org_ids()));
    CREATE POLICY "notes: org update" ON notes FOR UPDATE USING (org_id IN (SELECT user_org_ids())) WITH CHECK (org_id IN (SELECT user_org_ids()));
    CREATE POLICY "notes: org delete" ON notes FOR DELETE USING (org_id IN (SELECT user_org_ids()));
  END IF;

  -- service_presets
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='service_presets') THEN
    ALTER TABLE service_presets ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "service_presets: org access" ON service_presets;
    DROP POLICY IF EXISTS "service_presets: org insert" ON service_presets;
    DROP POLICY IF EXISTS "service_presets: org update" ON service_presets;
    DROP POLICY IF EXISTS "service_presets: org delete" ON service_presets;
    CREATE POLICY "service_presets: org access" ON service_presets FOR SELECT USING (org_id IN (SELECT user_org_ids()));
    CREATE POLICY "service_presets: org insert" ON service_presets FOR INSERT WITH CHECK (org_id IN (SELECT user_org_ids()));
    CREATE POLICY "service_presets: org update" ON service_presets FOR UPDATE USING (org_id IN (SELECT user_org_ids())) WITH CHECK (org_id IN (SELECT user_org_ids()));
    CREATE POLICY "service_presets: org delete" ON service_presets FOR DELETE USING (org_id IN (SELECT user_org_ids()));
  END IF;

  -- org_settings
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='org_settings') THEN
    ALTER TABLE org_settings ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "org_settings: org access" ON org_settings;
    DROP POLICY IF EXISTS "org_settings: org insert" ON org_settings;
    DROP POLICY IF EXISTS "org_settings: org update" ON org_settings;
    CREATE POLICY "org_settings: org access" ON org_settings FOR SELECT USING (org_id IN (SELECT user_org_ids()));
    CREATE POLICY "org_settings: org insert" ON org_settings FOR INSERT WITH CHECK (org_id IN (SELECT user_org_ids()));
    CREATE POLICY "org_settings: org update" ON org_settings FOR UPDATE USING (org_id IN (SELECT user_org_ids())) WITH CHECK (org_id IN (SELECT user_org_ids()));
  END IF;

  -- inventory_items
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='inventory_items') THEN
    ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "inventory_items: org access" ON inventory_items;
    DROP POLICY IF EXISTS "inventory_items: org insert" ON inventory_items;
    DROP POLICY IF EXISTS "inventory_items: org update" ON inventory_items;
    DROP POLICY IF EXISTS "inventory_items: org delete" ON inventory_items;
    CREATE POLICY "inventory_items: org access" ON inventory_items FOR SELECT USING (org_id IN (SELECT user_org_ids()));
    CREATE POLICY "inventory_items: org insert" ON inventory_items FOR INSERT WITH CHECK (org_id IN (SELECT user_org_ids()));
    CREATE POLICY "inventory_items: org update" ON inventory_items FOR UPDATE USING (org_id IN (SELECT user_org_ids())) WITH CHECK (org_id IN (SELECT user_org_ids()));
    CREATE POLICY "inventory_items: org delete" ON inventory_items FOR DELETE USING (org_id IN (SELECT user_org_ids()));
  END IF;

  -- trade_contacts
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='trade_contacts') THEN
    ALTER TABLE trade_contacts ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "trade_contacts: org access" ON trade_contacts;
    DROP POLICY IF EXISTS "trade_contacts: org insert" ON trade_contacts;
    DROP POLICY IF EXISTS "trade_contacts: org update" ON trade_contacts;
    DROP POLICY IF EXISTS "trade_contacts: org delete" ON trade_contacts;
    CREATE POLICY "trade_contacts: org access" ON trade_contacts FOR SELECT USING (org_id IN (SELECT user_org_ids()));
    CREATE POLICY "trade_contacts: org insert" ON trade_contacts FOR INSERT WITH CHECK (org_id IN (SELECT user_org_ids()));
    CREATE POLICY "trade_contacts: org update" ON trade_contacts FOR UPDATE USING (org_id IN (SELECT user_org_ids())) WITH CHECK (org_id IN (SELECT user_org_ids()));
    CREATE POLICY "trade_contacts: org delete" ON trade_contacts FOR DELETE USING (org_id IN (SELECT user_org_ids()));
  END IF;

  -- expenses
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='expenses') THEN
    ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "expenses: org access" ON expenses;
    DROP POLICY IF EXISTS "expenses: org insert" ON expenses;
    DROP POLICY IF EXISTS "expenses: org update" ON expenses;
    DROP POLICY IF EXISTS "expenses: org delete" ON expenses;
    CREATE POLICY "expenses: org access" ON expenses FOR SELECT USING (org_id IN (SELECT user_org_ids()));
    CREATE POLICY "expenses: org insert" ON expenses FOR INSERT WITH CHECK (org_id IN (SELECT user_org_ids()));
    CREATE POLICY "expenses: org update" ON expenses FOR UPDATE USING (org_id IN (SELECT user_org_ids())) WITH CHECK (org_id IN (SELECT user_org_ids()));
    CREATE POLICY "expenses: org delete" ON expenses FOR DELETE USING (org_id IN (SELECT user_org_ids()));
  END IF;

  -- customer_portal_tokens — fully locked, no user-key access
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='customer_portal_tokens') THEN
    ALTER TABLE customer_portal_tokens ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "portal_tokens: deny all" ON customer_portal_tokens;
    -- No policies = service role only
  END IF;

  -- ai_runs
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='ai_runs') THEN
    ALTER TABLE ai_runs ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "ai_runs: org access" ON ai_runs;
    CREATE POLICY "ai_runs: org access" ON ai_runs FOR SELECT USING (org_id IN (SELECT user_org_ids()));
  END IF;

  -- ai_attachments
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='ai_attachments') THEN
    ALTER TABLE ai_attachments ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "ai_attachments: org access" ON ai_attachments;
    DROP POLICY IF EXISTS "ai_attachments: org insert" ON ai_attachments;
    DROP POLICY IF EXISTS "ai_attachments: org update" ON ai_attachments;
    DROP POLICY IF EXISTS "ai_attachments: org delete" ON ai_attachments;
    CREATE POLICY "ai_attachments: org access" ON ai_attachments FOR SELECT USING (org_id IN (SELECT user_org_ids()));
    CREATE POLICY "ai_attachments: org insert" ON ai_attachments FOR INSERT WITH CHECK (org_id IN (SELECT user_org_ids()));
    CREATE POLICY "ai_attachments: org update" ON ai_attachments FOR UPDATE USING (org_id IN (SELECT user_org_ids())) WITH CHECK (org_id IN (SELECT user_org_ids()));
    CREATE POLICY "ai_attachments: org delete" ON ai_attachments FOR DELETE USING (org_id IN (SELECT user_org_ids()));
  END IF;

  -- org_ai_limits
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='org_ai_limits') THEN
    ALTER TABLE org_ai_limits ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "org_ai_limits: org access" ON org_ai_limits;
    CREATE POLICY "org_ai_limits: org access" ON org_ai_limits FOR SELECT USING (org_id IN (SELECT user_org_ids()));
  END IF;

  -- subscriptions
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='subscriptions') THEN
    ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "subscriptions: org access" ON subscriptions;
    CREATE POLICY "subscriptions: org access" ON subscriptions FOR SELECT USING (org_id IN (SELECT user_org_ids()));
  END IF;

  -- referral_codes
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='referral_codes') THEN
    ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "referral_codes: org access" ON referral_codes;
    DROP POLICY IF EXISTS "referral_codes: org insert" ON referral_codes;
    CREATE POLICY "referral_codes: org access" ON referral_codes FOR SELECT USING (org_id IN (SELECT user_org_ids()));
    CREATE POLICY "referral_codes: org insert" ON referral_codes FOR INSERT WITH CHECK (org_id IN (SELECT user_org_ids()));
  END IF;

  -- referrals
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='referrals') THEN
    ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "referrals: org access" ON referrals;
    CREATE POLICY "referrals: org access" ON referrals FOR SELECT USING (referrer_org_id IN (SELECT user_org_ids()));
  END IF;

  -- referral_payouts
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='referral_payouts') THEN
    ALTER TABLE referral_payouts ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "referral_payouts: org access" ON referral_payouts;
    CREATE POLICY "referral_payouts: org access" ON referral_payouts FOR SELECT USING (referrer_org_id IN (SELECT user_org_ids()));
  END IF;

  -- public_profiles
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='public_profiles') THEN
    ALTER TABLE public_profiles ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "public_profiles: public read published" ON public_profiles;
    DROP POLICY IF EXISTS "public_profiles: org insert" ON public_profiles;
    DROP POLICY IF EXISTS "public_profiles: org update" ON public_profiles;
    DROP POLICY IF EXISTS "public_profiles: org delete" ON public_profiles;
    CREATE POLICY "public_profiles: public read published" ON public_profiles FOR SELECT USING (is_published = true OR org_id IN (SELECT user_org_ids()));
    CREATE POLICY "public_profiles: org insert" ON public_profiles FOR INSERT WITH CHECK (org_id IN (SELECT user_org_ids()));
    CREATE POLICY "public_profiles: org update" ON public_profiles FOR UPDATE USING (org_id IN (SELECT user_org_ids())) WITH CHECK (org_id IN (SELECT user_org_ids()));
    CREATE POLICY "public_profiles: org delete" ON public_profiles FOR DELETE USING (org_id IN (SELECT user_org_ids()));
  END IF;

  -- realtor_profiles
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='realtor_profiles') THEN
    ALTER TABLE realtor_profiles ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "realtor_own_profile" ON realtor_profiles;
    DROP POLICY IF EXISTS "realtor_public_profile_read" ON realtor_profiles;
    CREATE POLICY "realtor_own_profile" ON realtor_profiles FOR ALL USING (user_id = auth.uid());
    CREATE POLICY "realtor_public_profile_read" ON realtor_profiles FOR SELECT USING (is_published = true);
  END IF;

  -- profile_reviews
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='profile_reviews') THEN
    ALTER TABLE profile_reviews ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "profile_reviews: public read approved" ON profile_reviews;
    DROP POLICY IF EXISTS "profile_reviews: public insert" ON profile_reviews;
    CREATE POLICY "profile_reviews: public read approved" ON profile_reviews FOR SELECT USING (approved = true OR org_id IN (SELECT user_org_ids()));
    CREATE POLICY "profile_reviews: public insert" ON profile_reviews FOR INSERT WITH CHECK (true);
  END IF;

  -- support_tickets
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='support_tickets') THEN
    ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "support_tickets: auth insert" ON support_tickets;
    CREATE POLICY "support_tickets: auth insert" ON support_tickets FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
  END IF;

  -- waitlist
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='waitlist') THEN
    ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "waitlist: public insert" ON waitlist;
    CREATE POLICY "waitlist: public insert" ON waitlist FOR INSERT WITH CHECK (true);
  END IF;

  -- payment_notifications — service role only
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='payment_notifications') THEN
    ALTER TABLE payment_notifications ENABLE ROW LEVEL SECURITY;
  END IF;

  -- org_memberships — admin only
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='org_memberships') THEN
    ALTER TABLE org_memberships ENABLE ROW LEVEL SECURITY;
  END IF;

  -- membership_events — admin only
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='membership_events') THEN
    ALTER TABLE membership_events ENABLE ROW LEVEL SECURITY;
  END IF;

  -- activity_log
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='activity_log') THEN
    ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='activity_log' AND column_name='org_id') THEN
      DROP POLICY IF EXISTS "activity_log: org access" ON activity_log;
      CREATE POLICY "activity_log: org access" ON activity_log FOR SELECT USING (org_id IN (SELECT user_org_ids()));
    END IF;
  END IF;

END $$;

-- ================================================================
-- STORAGE
-- profile-photos + logos MUST stay public — shown on public contractor profile pages.
-- tradebase-photos + support-uploads stay private — accessed via signed URLs only.
-- ================================================================
UPDATE storage.buckets SET public = false WHERE id IN ('tradebase-photos', 'support-uploads');
UPDATE storage.buckets SET public = true  WHERE id IN ('profile-photos', 'logos');

-- ================================================================
-- VERIFY — confirms which tables have RLS enabled
-- ================================================================
SELECT tablename, rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
