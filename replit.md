# TradeBase - Invoice & Billing App

## Overview
TradeBase is a comprehensive, full-stack web application designed for tradespeople, offering client management, invoice and estimate creation, job photo tracking, cost calculation with markup, and a referral program. It aims to streamline business operations through multi-language support, customizable invoice templates, and robust financial tracking capabilities. The project's ambition is to provide a robust solution for managing business operations.

## User Preferences
- "Keep it stupid simple" philosophy for non-technical users
- Big buttons and one-page layouts
- 14-day free trial for all users
- Invite 4 friends = 60 free days bonus

## System Architecture
TradeBase is a full-stack web application using Node.js and Express.js for the backend, and Vanilla JavaScript for a Single-Page Application (SPA) frontend. Supabase (PostgreSQL) handles the database, authentication, and file storage, while Stripe is integrated for payment processing.

**UI/UX Decisions:**
- Features a light/dark mode toggle with preference persistence.
- Responsive design targets mobile breakpoints at 600px.
- Invoice and quote previews on the pricing page show logo placement and footer customization.
- Payment status badges are color-coded (🟢 Paid / 🔴 Unpaid / 🟡 Pending).
- Language picker is prominently displayed on login/signup and in the dashboard header.
- Demo mode showcases all 4 invoice template styles.
- Notification bell icon in header with dropdown for system messages.

**Technical Implementations & System Design:**
- **Authentication**: Supabase Authentication with email/password and server-side JWT validation.
- **Subscription Flow**: 14-day free trial managed via `trial_ends_at` and a `requireSubscription` middleware. Stripe webhooks handle subscription events.
- **Payment Collection Workflow**: Integration with Stripe Payment Links for invoice payments, automatic status updates via webhooks, and manual payment controls.
- **Multi-Language System**: UI translation in 5 languages (English, Spanish, French, German, Portuguese) using `data-i18n` attributes and a dynamic `applyLanguage()` function. User language preference is stored in `profiles.preferred_language`.
- **Invoice Template System**: 4 distinct, professional invoice templates (`Basic Clean`, `Modern Pro`, `Color Accent Header`, `Big Total`) defined in `templates.js`. The `renderInvoiceTemplate()` function generates HTML based on the user's `preferred_template`. All templates include "Powered by TradeBase" footer with signup link.
- **Offline PWA**: Progressive Web App with an offline-first architecture using Service Worker (v5) for caching and IndexedDB for local data storage. Supports iOS home screen installation.
- **Job Folders**: Automatic job folder organization by ClientName_Address_Date_JobType. Jobs can link invoices, quotes, photos, and voice notes.
- **Notification Center**: In-app notification system for system messages and announcements.
- **Database Schema**: Utilizes `profiles`, `clients`, `invoices`, `invoice_items`, `invoice_attachments`, `quotes`, `quote_items`, `inventory_items`, `referral_earnings`, `jobs`, `voice_notes`, and `system_messages` tables.
- **File Storage**: Supabase Storage for `logos` and `invoice-photos`.
- **API Endpoints**: RESTful APIs for managing profiles, clients, invoices, quotes, payments, inventory, referrals, jobs, and system messages.
- **Inventory Management**: Comprehensive system to add, edit, and delete inventory items, track quantity, unit price, category, low stock alerts, and calculate total inventory value.
- **AI Add-On System**: Separate AI subscription that is completely independent from the base TradeBase subscription. Uses `ai_enabled`, `ai_plan`, `ai_subscription_id` fields in profiles table. Stripe webhooks distinguish AI subscriptions from base subscriptions using subscription ID matching. AI features are disabled by default and only enabled via paid AI subscription - NOT included in lifetime plans.

## Recent Changes
- Added Terms of Service modal with required checkbox on signup
- Added trade type selection on signup (Electrician, Plumber, HVAC, etc.)
- Extended trial period from 7 to 14 days
- Added "Powered by TradeBase" promotional footer to all invoice templates
- Created Jobs system for automatic job folder organization
- Added System Messages API for in-app notifications
- Built notification center with bell icon in header
- Updated database migration with jobs, voice_notes, system_messages tables
- Implemented AI Add-On subscription system with separate billing from base subscription
- Added ai_enabled, ai_plan, ai_subscription_id columns and ai_usage_logs table
- Created requireAI middleware and AI subscription endpoints (/api/ai/status, /api/ai/subscribe, /api/ai/cancel)
- Fixed Stripe webhook to properly distinguish AI subscriptions from base subscriptions
- Added AI subscription section in Settings screen
- Voice recorder hidden by default, only visible when ai_enabled=true
- **NEW: AI Voice Quote Creator** - One-button voice-to-quote workflow on dashboard
- **NEW: Voice Form Helpers** - Mic buttons on quote/invoice screens for voice-assisted form filling
- **NEW: Profanity Filter** - Bad-words library filters casual language from transcripts
- **NEW: /api/ai/transcribe** - Whisper transcription endpoint for voice input
- **NEW: /api/ai/parse-quote** - GPT-4o-mini parsing endpoint for structured data extraction
- **NEW: /api/ai/create-quote-full** - Complete voice-to-quote-with-job-folder workflow
- **NEW: /api/quotes/:id/send-email** - Send quotes via email (like invoices)
- **NEW: AI Usage Logging** - All AI operations logged to ai_usage_logs table
- **NEW: Demo Mode AI Features** - Tour/demo mode now showcases all AI features with simulated interactions (voice quote creator, form helpers, voice notes)
- **NEW: AI Assistant Do-All Menu** - Prominent AI button on dashboard with dropdown for Voice Quote Creator, Voice Add to Inventory, Voice Invoice Creator, Voice Add Client
- **UPDATED: Dashboard Layout** - Create Quote button moved into main tile grid, AI Assistant tile at top with expandable menu
- **UPDATED: AI Cancellation Flow** - Requires typing "cancel" to confirm AI subscription cancellation (prevents accidental cancels)
- **UPDATED: Pricing Page** - Redesigned as professional landing page focused on 14-day free trial with feature grid, trust signals, and hidden plans modal
- **NEW: Marketing Landing Page** - Dedicated landing page at /landing with hero, features, Talk to Work AI section, pricing cards, FAQ, and footer
- **NEW: TradeBase Logo** - Added official logo to login page and landing page
- **NEW: Archive System** - Invoices and quotes can be archived to keep active lists clean. Features Active/Archived tabs, archive button in detail views, unarchive and permanent delete options for archived items
- **NEW: Voice Add to Inventory** - Speak to add inventory items with name, quantity, price, and category. Uses Whisper transcription + GPT-4o-mini parsing via /api/ai/parse-inventory endpoint
- **NEW: Voice Invoice Creator** - Speak to create invoices just like Voice Quote Creator. Extracts client, items, prices and creates invoice with job folder
- **NEW: Voice Add Client** - Speak to add new clients with name, phone, email, and address. Uses /api/ai/parse-client endpoint for structured extraction
- **NEW: Send Text Button** - Invoice detail view now has "Send Text" button that opens native SMS app with pre-filled message including invoice view link and Stripe payment link. Works on both iOS and Android.
- **NEW: Public Invoice View** - Clients can view invoices at /view/invoice/:id without login. Page shows business info, line items, totals, and includes Pay Now button if payment link exists.

## External Dependencies
- **Supabase**: PostgreSQL Database, Authentication, and File Storage.
- **Stripe**: Payment processing for subscriptions and one-time invoice payments via Payment Links and webhooks.
- **Resend (Email Service)**: For sending transactional emails (invoices and quotes) via a Replit connector. Requires `from_email` configuration.
- **Node.js + Express.js**: Backend framework.
- **html2canvas**: JavaScript library for generating downloadable PNG images of invoices and quotes.
- **Puppeteer-core**: For generating PDF attachments for emailed invoices and quotes. Uses Chromium in `/nix/store/`.
- **OpenAI API**: Whisper for voice transcription, GPT-4o-mini for quote parsing. Requires `OPENAI_API_KEY` secret.
- **bad-words**: Profanity filter library for cleaning transcribed text.

## Setup Instructions

### AI Voice Features
1. Add `OPENAI_API_KEY` as a secret in your Replit environment
2. User must have `ai_enabled=true` in their profile (requires AI subscription via Stripe)
3. AI endpoints are guarded by `requireAI` middleware and log usage to `ai_usage_logs` table

### Email Configuration
1. Set up Resend integration via Replit connectors
2. Ensure `from_email` is configured in the Resend connector settings
3. Emails include PDF attachments for both invoices and quotes

### Database Schema Changes (IMPORTANT!)
**Development and Production use SEPARATE Supabase databases.**

When making database schema changes:
1. Changes made via the development SQL tool only affect the development database
2. **You MUST also run the same changes in your Production Supabase SQL Editor**
3. After running schema changes, always run: `SELECT pg_notify('pgrst', 'reload schema');`

The complete schema is documented in `supabase_migration.sql`. Run this file in both environments to ensure they stay in sync.

Quick schema sync (run in Supabase SQL Editor for PRODUCTION):
```sql
-- Add any missing columns
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS template TEXT DEFAULT 'basic_clean';
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS template TEXT DEFAULT 'basic_clean';
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT FALSE;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT FALSE;
-- Refresh schema cache
SELECT pg_notify('pgrst', 'reload schema');
```
