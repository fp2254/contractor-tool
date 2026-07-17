-- Page text customization for the public contractor profile
-- Also (re)applies about_photo + about_heading, which may be missing in Supabase.
-- Run in Supabase Studio SQL Editor.

ALTER TABLE public_profiles ADD COLUMN IF NOT EXISTS about_photo TEXT;
ALTER TABLE public_profiles ADD COLUMN IF NOT EXISTS about_heading TEXT;
ALTER TABLE public_profiles ADD COLUMN IF NOT EXISTS page_text JSONB DEFAULT '{}'::jsonb;

-- Seed existing profiles with the previous wording so live pages look unchanged
-- until the contractor edits or clears the fields.
UPDATE public_profiles SET page_text = jsonb_build_object(
  'quote_button', 'REQUEST A FREE QUOTE →',
  'services_heading', 'Our Services',
  'services_subtitle', 'Professional solutions for your home or business.',
  'about_label', 'ABOUT US',
  'learn_more_button', 'GET IN TOUCH →',
  'projects_heading', 'Recent Projects',
  'projects_subtitle', 'See our work across the region.',
  'cta_heading', 'Ready to get started?',
  'cta_subtitle', 'Let''s talk about your project. Fast, easy, and hassle-free.',
  'footer_line', 'Proudly serving our community with reliable, top-quality service.'
) WHERE page_text IS NULL OR page_text = '{}'::jsonb;
