# Skippy Stack - Invoice & Billing App

## Overview
Skippy Stack (internally codenamed "TradeBase") is a comprehensive, full-stack web application designed for tradespeople, offering client management, invoice and estimate creation, job photo tracking, cost calculation with markup, and a referral program. It aims to streamline business operations through multi-language support, customizable invoice templates, and robust financial tracking capabilities. The project's ambition is to provide a robust solution for managing business operations.

**Branding Strategy**: All user-facing elements use "Skippy Stack" branding, while internal code references (cache names, database tables, variables) retain "tradebase" naming to avoid unnecessary refactoring.

## User Preferences
- "Keep it stupid simple" philosophy for non-technical users
- Big buttons and one-page layouts
- 14-day free trial for all users
- Invite 4 friends = 60 free days bonus

## System Architecture
TradeBase is a full-stack web application using Node.js and Express.js for the backend, and Vanilla JavaScript for a Single-Page Application (SPA) frontend. Supabase (PostgreSQL) handles the database, authentication, and file storage, while Stripe is integrated for payment processing.

**UI/UX Decisions:**
- Features a light/dark mode toggle with preference persistence.
- Responsive design targeting mobile breakpoints at 600px.
- Invoice and quote previews show logo placement and footer customization.
- Payment status badges are color-coded (🟢 Paid / 🔴 Unpaid / 🟡 Pending).
- Language picker is prominently displayed.
- Demo mode showcases all 4 invoice template styles and AI features.
- Notification bell icon in header with dropdown for system messages.
- Dashboard layout includes AI Assistant, Calendar, and "Coming Soon" Trade Deals tiles.
- Multi-select mode for bulk actions (Delete, Archive) on list items.

**Technical Implementations & System Design:**
- **Authentication**: Supabase Authentication with email/password and server-side JWT validation.
- **Subscription Flow**: 14-day free trial managed with `trial_ends_at` and `requireSubscription` middleware. Stripe webhooks handle subscription events, including a separate AI Add-On subscription system.
- **Payment Collection Workflow**: Integration with Stripe Payment Links for invoice payments, automatic status updates, and manual payment controls.
- **Multi-Language System**: UI translation in 5 languages (English, Spanish, French, German, Portuguese) using `data-i18n` attributes and a dynamic `applyLanguage()` function.
- **Invoice Template System**: 4 distinct, professional invoice templates defined in `templates.js`, rendered dynamically. All templates include "Powered by Skippy Stack" footer.
- **Offline PWA**: Progressive Web App with an offline-first architecture using Service Worker and IndexedDB.
- **Job Folders**: Automatic job organization by ClientName_Address_Date_JobType, linking invoices, quotes, photos, and voice notes.
- **Notification Center**: In-app system for system messages and announcements.
- **Database Schema**: Utilizes `profiles`, `clients`, `invoices`, `invoice_items`, `quotes`, `quote_items`, `inventory_items`, `referral_earnings`, `jobs`, `voice_notes`, `system_messages`, `calendar_events`, `ai_usage_logs`, and `payment_links` tables.
- **File Storage**: Supabase Storage for `logos` and `invoice-photos`.
- **API Endpoints**: RESTful APIs for managing core entities.
- **Inventory Management**: Comprehensive system for managing inventory items, including quantity tracking and alerts.
- **AI Add-On System**: Separate subscription-based AI features with usage limits (300 actions/month), tracking, and billing. Features include:
    - **Unified Voice Command System**: Single `/api/voice-command` endpoint using OpenAI function calling for all voice operations (e.g., Voice Quote Creator, Voice Add to Inventory, Voice Invoice Creator, Voice Add Client, Voice Schedule Event). Supports chained commands.
    - **Voice Form Helpers**: Mic buttons on quote/invoice screens for voice-assisted filling.
    - **Profanity Filter**: Cleans transcribed text.
    - **Global Command Mic**: Prominent dashboard mic button for full-screen voice interaction.
    - **Config-Based AI Models**: Configurable AI models via `config.js` and environment variables.
    - **Action Preview Mode**: Voice commands show confirmation modal before execution, displaying planned actions with icons and descriptions.
    - **Activity Log**: Timeline view of all voice command actions with timestamps, grouping by action set, and undone status badges. Accessible via "View Command History" button on dashboard.
    - **Undo/Rollback**: 8-second undo window after voice commands execute, with ability to reverse created entities.
    - **Risky Action Guardrails**: When dangerous actions are detected (send, delete, charge), requires explicit checkbox confirmation before proceeding.
- **Invoice & Quote Edit Functionality**: Allows editing of existing invoices and quotes via pre-populated forms and PUT API endpoints.
- **Archive System**: Functionality to archive invoices and quotes, with active/archived views and unarchive/delete options.
- **Link to Job Feature**: Bidirectional job folder linking:
  - FROM Job Folders: "Link Invoice" and "Link Quote" buttons open picker modal showing unlinked items
  - FROM Invoice/Quote Detail: "Add to Job" button opens job folder picker to link to any open job
  - Shows linked job name in detail views with "Unlink" option
  - PATCH endpoints at `/api/invoices/:id/job` and `/api/quotes/:id/job`
- **Public Invoice View**: Clients can view invoices via a public URL, including a "Pay Now" button if a payment link exists.
- **Calendar Feature**: Full calendar for scheduling events, linked to clients, jobs, quotes, and invoices.
- **Send Text Button**: Allows sending invoices via native SMS app with pre-filled message.
- **Quick Pay Link**: Dashboard tile for sending payment requests without creating full invoices. Supports sending via SMS (opens native messaging app) or email (via Resend). Uses user's saved payment links.
- **Quick Pay Venmo**: Dedicated Venmo payment request feature on dashboard. User stores Venmo username in Settings. Generates payment URLs with amount pre-filled (format: `https://venmo.com/{username}?txn=pay&amount={amount}&note={note}`). Copies to clipboard and triggers native share sheet on mobile.
- **Multiple Payment Links System**: Users can save multiple payment methods (Venmo, PayPal, CashApp, Zelle, Stripe, Square, Other) in Settings. Each payment link has a provider, custom label, URL, and optional default flag. Payment link selector appears in Quick Pay modal and Invoice form. Selected payment link is stored per invoice and displayed on the public invoice view.
- **Mobile Download Improvement**: Uses navigator.share() API on mobile for native sharing, with data URL fallback for iOS long-press save.

## External Dependencies
- **Supabase**: PostgreSQL Database, Authentication, and File Storage.
- **Stripe**: Payment processing for subscriptions and one-time invoice payments via Payment Links and webhooks.
- **Resend (Email Service)**: For sending transactional emails with PDF attachments.
- **Node.js + Express.js**: Backend framework.
- **html2canvas**: JavaScript library for generating downloadable PNG images of invoices and quotes.
- **Puppeteer-core**: For generating PDF attachments for emailed invoices and quotes.
- **OpenAI API**: Whisper for voice transcription, GPT-4o-mini for parsing.
- **bad-words**: Profanity filter library for cleaning transcribed text.