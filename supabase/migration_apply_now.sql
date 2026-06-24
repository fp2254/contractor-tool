-- ============================================================
-- TradeBase — Apply Now (all missing migrations)
-- Safe to re-run: all use IF NOT EXISTS / IF EXISTS
-- Paste this entire block into Supabase Studio → SQL Editor
-- https://supabase.com/dashboard/project/lrtrbocvcqgfnklknlnu/sql
-- ============================================================

-- ── 1. Team Assignments (assigned_to on quotes / invoices / jobs) ──

ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE quotes
  ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS jobs_assigned_to_idx     ON jobs     (assigned_to);
CREATE INDEX IF NOT EXISTS quotes_assigned_to_idx   ON quotes   (assigned_to);
CREATE INDEX IF NOT EXISTS invoices_assigned_to_idx ON invoices (assigned_to);

-- ── 2. Public Profile: selected_template ──

ALTER TABLE public_profiles
  ADD COLUMN IF NOT EXISTS selected_template TEXT NOT NULL DEFAULT 'classic';

-- ── 3. Public Profile: sections_config + trust_highlights ──

ALTER TABLE public_profiles
  ADD COLUMN IF NOT EXISTS sections_config  JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS trust_highlights JSONB NOT NULL DEFAULT '[]';

-- ── 4. Public Profile: custom_blocks ──

ALTER TABLE public_profiles
  ADD COLUMN IF NOT EXISTS custom_blocks JSONB NOT NULL DEFAULT '[]';

-- ── 5. AI Assistant per-org config ──

CREATE TABLE IF NOT EXISTS org_ai_assistant_config (
  org_id                    uuid PRIMARY KEY REFERENCES orgs(id) ON DELETE CASCADE,
  enabled                   boolean NOT NULL DEFAULT false,
  auto_reply                boolean NOT NULL DEFAULT false,
  ai_schedules              boolean NOT NULL DEFAULT false,
  voicemail_only            boolean NOT NULL DEFAULT false,
  full_conversation         boolean NOT NULL DEFAULT false,
  require_booking_approval  boolean NOT NULL DEFAULT true,
  show_pricing              boolean NOT NULL DEFAULT false,
  transcribe_voicemail      boolean NOT NULL DEFAULT false,
  greeting_name             text,
  tone                      text NOT NULL DEFAULT 'casual' CHECK (tone IN ('casual','professional')),
  business_hours            jsonb NOT NULL DEFAULT '{"days":["mon","tue","wed","thu","fri"],"open":"07:00","close":"17:00"}'::jsonb,
  service_area              text,
  disabled_service_ids      jsonb NOT NULL DEFAULT '[]'::jsonb,
  handoff_phrase            text,
  updated_at                timestamptz DEFAULT now()
);

ALTER TABLE org_ai_assistant_config ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'org_ai_assistant_config' AND policyname = 'org_ai_assistant_config_rw'
  ) THEN
    CREATE POLICY "org_ai_assistant_config_rw" ON org_ai_assistant_config
      FOR ALL USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid()));
  END IF;
END $$;

-- ── 6. SMS Bot conversations + messages ──

CREATE TABLE IF NOT EXISTS sms_conversations (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                  uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  lead_id                 uuid REFERENCES leads(id) ON DELETE SET NULL,
  from_number             text NOT NULL,
  to_number               text NOT NULL,
  status                  text NOT NULL DEFAULT 'active'
                            CHECK (status IN ('active','handed_off','opted_out','exhausted')),
  followup_attempts       int NOT NULL DEFAULT 0,
  last_customer_reply_at  timestamptz,
  created_at              timestamptz DEFAULT now(),
  updated_at              timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sms_conversations_org_idx ON sms_conversations (org_id, created_at DESC);

ALTER TABLE sms_conversations ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'sms_conversations' AND policyname = 'sms_conversations_rw'
  ) THEN
    CREATE POLICY "sms_conversations_rw" ON sms_conversations
      FOR ALL USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid()));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS sms_messages (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id  uuid NOT NULL REFERENCES sms_conversations(id) ON DELETE CASCADE,
  org_id           uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  direction        text NOT NULL CHECK (direction IN ('inbound','outbound')),
  body             text NOT NULL,
  twilio_sid       text,
  sent_by          text NOT NULL DEFAULT 'ai' CHECK (sent_by IN ('ai','contractor','customer')),
  created_at       timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sms_messages_conv_idx ON sms_messages (conversation_id, created_at);

ALTER TABLE sms_messages ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'sms_messages' AND policyname = 'sms_messages_rw'
  ) THEN
    CREATE POLICY "sms_messages_rw" ON sms_messages
      FOR ALL USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid()));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS opted_out_numbers (
  e164_number  text PRIMARY KEY,
  opted_out_at timestamptz DEFAULT now()
);
