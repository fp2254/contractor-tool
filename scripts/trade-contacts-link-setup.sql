-- Trade Contacts → TradeBase Profile Linking
-- Run once in Supabase Studio SQL Editor

-- 1. Add linked_org_id column to trade_contacts
ALTER TABLE trade_contacts
  ADD COLUMN IF NOT EXISTS linked_org_id uuid REFERENCES orgs(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS trade_contacts_linked_org_idx ON trade_contacts (linked_org_id);

-- 2. Postgres function: given an email, return the org_id that owns a published
--    TradeBase public profile for that email's account. Returns NULL if no match.
--    SECURITY DEFINER lets it read auth.users (which is otherwise restricted).
CREATE OR REPLACE FUNCTION match_email_to_org(p_email text)
RETURNS uuid
LANGUAGE sql
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
