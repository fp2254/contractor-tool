-- TradeBase Subscription & Paywall Migration
-- Run this SQL in your Supabase SQL Editor

-- Add subscription fields to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS subscription_plan TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'trial',
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS subscription_ends_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT DEFAULT NULL;

-- Create index for faster subscription queries
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_status ON profiles(subscription_status);
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id ON profiles(stripe_customer_id);

-- Rename estimates table to quotes (if exists)
ALTER TABLE IF EXISTS estimates RENAME TO quotes;

-- Add quotes table if it doesn't exist
CREATE TABLE IF NOT EXISTS quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  client_name TEXT,
  quote_number TEXT,
  quote_date DATE DEFAULT CURRENT_DATE,
  due_date DATE,
  subtotal NUMERIC(10,2) DEFAULT 0,
  tax NUMERIC(10,2) DEFAULT 0,
  total NUMERIC(10,2) DEFAULT 0,
  notes TEXT,
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create quote_items table if it doesn't exist
CREATE TABLE IF NOT EXISTS quote_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity NUMERIC(10,2) DEFAULT 1,
  unit_price NUMERIC(10,2) DEFAULT 0,
  total NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add client_name to invoices table for freeform entry
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS client_name TEXT;

-- Enable Row Level Security
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for quotes
CREATE POLICY IF NOT EXISTS "Users can view their own quotes"
  ON quotes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can insert their own quotes"
  ON quotes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can update their own quotes"
  ON quotes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can delete their own quotes"
  ON quotes FOR DELETE
  USING (auth.uid() = user_id);

-- Create RLS policies for quote_items
CREATE POLICY IF NOT EXISTS "Users can view their own quote items"
  ON quote_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM quotes WHERE quotes.id = quote_items.quote_id AND quotes.user_id = auth.uid()
  ));

CREATE POLICY IF NOT EXISTS "Users can insert their own quote items"
  ON quote_items FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM quotes WHERE quotes.id = quote_items.quote_id AND quotes.user_id = auth.uid()
  ));

CREATE POLICY IF NOT EXISTS "Users can update their own quote items"
  ON quote_items FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM quotes WHERE quotes.id = quote_items.quote_id AND quotes.user_id = auth.uid()
  ));

CREATE POLICY IF NOT EXISTS "Users can delete their own quote items"
  ON quote_items FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM quotes WHERE quotes.id = quote_items.quote_id AND quotes.user_id = auth.uid()
  ));
