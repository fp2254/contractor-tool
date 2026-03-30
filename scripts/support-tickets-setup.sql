-- Support tickets table
-- Run this once in Supabase Studio SQL Editor

CREATE TABLE IF NOT EXISTS support_tickets (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email   text,
  type         text        NOT NULL CHECK (type IN ('bug', 'feature', 'feedback')),
  title        text        NOT NULL,
  description  text        NOT NULL,
  screenshot_url text,
  status       text        NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'closed')),
  priority     text        NOT NULL DEFAULT 'low' CHECK (priority IN ('low', 'medium', 'high')),
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- Index for fast admin queries
CREATE INDEX IF NOT EXISTS support_tickets_status_idx  ON support_tickets(status);
CREATE INDEX IF NOT EXISTS support_tickets_type_idx    ON support_tickets(type);
CREATE INDEX IF NOT EXISTS support_tickets_created_idx ON support_tickets(created_at DESC);

-- Disable RLS — admin client bypasses it anyway, and users submit via API
ALTER TABLE support_tickets DISABLE ROW LEVEL SECURITY;
