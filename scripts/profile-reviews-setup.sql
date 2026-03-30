-- Profile reviews table
-- Run once in Supabase Studio SQL Editor

CREATE TABLE IF NOT EXISTS profile_reviews (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id         uuid        NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  reviewer_name  text        NOT NULL,
  reviewer_email text        NOT NULL,
  rating         smallint    NOT NULL CHECK (rating BETWEEN 1 AND 5),
  job_type       text,
  location       text,
  text           text        NOT NULL,
  verified       boolean     NOT NULL DEFAULT false,
  approved       boolean     NOT NULL DEFAULT false,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

-- Prevent duplicate reviews from the same email per contractor
CREATE UNIQUE INDEX IF NOT EXISTS profile_reviews_unique_email
  ON profile_reviews (org_id, lower(reviewer_email));

CREATE INDEX IF NOT EXISTS profile_reviews_org_idx      ON profile_reviews (org_id);
CREATE INDEX IF NOT EXISTS profile_reviews_approved_idx ON profile_reviews (approved);
CREATE INDEX IF NOT EXISTS profile_reviews_created_idx  ON profile_reviews (created_at DESC);

-- Admin client bypasses RLS; disable to keep it simple
ALTER TABLE profile_reviews DISABLE ROW LEVEL SECURITY;
