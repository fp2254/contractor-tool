# TradeBase - Invoice & Billing App

## Overview
TradeBase (formerly Skippy Stack) is a full-stack web application for tradespeople, offering client management, invoice/estimate creation, job photo tracking, cost calculation, and a referral program. It aims to streamline business operations through multi-language support, customizable invoice templates, and robust financial tracking. The project's ambition is to provide a comprehensive solution for managing business operations.

## User Preferences
- "Keep it stupid simple" philosophy for non-technical users
- Big buttons and one-page layouts
- 30-day free trial for all users (Phase 1 rollout)
- Referral system: Coming Soon (disabled for Phase 1)

## System Architecture
TradeBase is a full-stack web application utilizing Node.js with Express.js for the backend and Vanilla JavaScript for a Single-Page Application (SPA) frontend. Supabase provides authentication and file storage, while PostgreSQL (accessed via `pgPool`) handles all database operations. Stripe is integrated for payment processing.

**UI/UX Design (TradeBase Redesign):**
- Dark navy header (#1B3A5C) with white TradeBase logo and notification bell
- Bottom 5-tab navigation: Home, Leads, Jobs, Money, More
- White/light gray (#F5F5F5) content backgrounds for app screens
- Dark theme (:root) for auth/landing pages, light theme scoped to #app-container
- Dashboard with stat cards (New Leads, Jobs Today, Unpaid, Estimates), Needs Attention section, Quick Actions (2x2 grid)
- Leads screen with filter tabs (All/New/Contacted/Scheduled/Won/Lost) and card-based client display
- Jobs screen with filter tabs (All/Today/Scheduled/In Progress/Completed) and card-based job display
- Money screen with filter tabs (Overdue/Open/Paid/All) and card-based invoice display
- More menu with list navigation to: Trade Contacts, Inventory, Referral Program, Reports, Business Profile, Settings, Support, Log Out
- Reports, Support, and Business Profile sub-pages with back navigation to More
- Responsive design targeting mobile breakpoints
- Color-coded payment status badges (Paid, Unpaid, Pending)
- Demo mode showcasing invoice templates and AI features
- Notification center with system messages
- Multi-select for bulk actions (Delete, Archive)

**Technical Implementations & System Design:**
- **Authentication**: Supabase Authentication with email/password and server-side JWT validation.
- **Subscription Flow**: 14-day free trial, managed by Stripe webhooks, including a separate AI Add-On subscription.
- **Payment Collection**: Stripe Payment Links for invoice payments, automatic status updates, and manual payment controls.
- **Multi-Language System**: UI translation in 5 languages using `data-i18n` attributes.
- **Invoice Template System**: 4 distinct, dynamic invoice templates with "Powered by TradeBase" footer.
- **Offline PWA**: Progressive Web App with offline-first architecture using Service Worker and IndexedDB for invoice management. Invoices save locally first, then sync to the cloud.
- **Job Folders**: Automatic organization of job-related assets (invoices, quotes, photos, voice notes).
- **Notification Center**: In-app system for announcements.
- **Database Schema**: Core tables include `profiles`, `clients`, `client_addresses`, `invoices`, `invoice_items`, `quotes`, `quote_items`, `inventory_items`, `referral_earnings`, `jobs`, `voice_notes`, `system_messages`, `calendar_events`, `ai_usage_logs`, and `payment_links`.
- **Multiple Client Addresses**: Clients can have multiple property addresses (e.g., rental properties, second homes). When creating invoices, users can select from saved addresses via dropdown or enter a custom address.
- **File Storage**: Supabase Storage for `logos` and `invoice-photos`.
- **AI Add-On System**: Subscription-based AI features with usage limits, including:
    - Unified Voice Command System using OpenAI function calling for various operations.
    - Voice Form Helpers and Global Command Mic for hands-free interaction.
    - Profanity Filter for transcribed text.
    - Configurable AI models.
    - Action Preview Mode with confirmation for voice commands.
    - Activity Log and 8-second Undo/Rollback functionality.
    - Risky Action Guardrails requiring explicit confirmation.
- **Invoice & Quote Editing**: Functionality for modifying existing documents.
- **Archive System**: For managing active and archived invoices/quotes.
- **Link to Job Feature**: Bidirectional linking between job folders and invoices/quotes.
- **Public Invoice View**: Clients can view invoices via a public URL with a "Pay Now" option.
- **Calendar Feature**: Full calendar for scheduling.
- **Quick Pay Link**: Dashboard tile for sending payment requests via SMS or email using saved payment links.
- **Multiple Payment Links System**: Users can save various payment methods (Venmo, PayPal, Stripe, etc.) for flexible payment options.
- **Payment Routing System**: Simplified payment redirector generating provider-specific URLs for client payments.
- **Mobile Download Improvement**: Uses `navigator.share()` API for native sharing.

**Architecture Rules:**
- **Database Configuration**: `SUPABASE_DB_URL` takes priority, and production MUST use Supabase Connection Pooler (`.pooler.supabase.com`). A fail-fast guard ensures immediate server crash on invalid production DB host.
- **Data Flow**: All database writes follow one path: `Frontend → apiFetch() → Express API → pgPool → PostgreSQL`.
- **Supabase Usage Policy**: `sb` (frontend) for authentication only. `supabaseAdmin` (backend) for storage only. `pgPool` (backend) for ALL database operations.
- **Supabase Schema**: Production schema is discovered at startup. Server code aliases production column names to frontend names. Development uses `DATABASE_URL` with different column names. All writes are through `pgPool`.

**Phase 1 — Daily Command Center + Contractor Memory (completed):**
- **Dashboard Today's Jobs**: `#dash-today-jobs` section shows jobs scheduled for today, sorted by start_time. Each card: time, client, address, status pill, + Directions / Call / Advance-status buttons.
- **Needs Attention**: Live section checks unpaid invoices (`window._allInvoices`) and stale quotes (`window._allQuotes`, sent >3 days). Tappable rows, max 3 items.
- **Money Snapshot**: Three tiles — This Week, This Month, Outstanding — computed from `window._allInvoices`. Tap to invoices screen.
- **Recent Activity**: Fetches `/api/activity-log?limit=5` and shows last 5 entries with icon + time-ago.
- **Job Lifecycle Bar**: Dynamic button in job detail that advances status: pending/scheduled/open → arrived → in_progress → completed. Server auto-stamps `arrived_at`, `started_at`, `completed_at` on PATCH.
- **Generate Invoice Prompt**: Shown after marking a job complete. Navigates to new-invoice screen pre-filled with job data.
- **Materials Used**: Per-job materials tracking via `/api/jobs/:jobId/materials`. CRUD inline form in job detail. Shows materials total.
- **Property History**: Screen accessible from More menu. Search bar filters `allJobs` by address. Results show timeline of past jobs at that address with status and tap-to-detail.
- **Job form fields added**: `scheduled_date`, `start_time`, `client_phone` — saved and displayed in job detail.

**New DB columns (jobs table):** `scheduled_date DATE`, `start_time TEXT`, `client_phone TEXT`, `arrived_at TIMESTAMPTZ`, `started_at TIMESTAMPTZ`, `completed_at TIMESTAMPTZ` — all added via `ALTER TABLE IF NOT EXISTS`.

**New table:** `job_materials (id UUID, job_id UUID, user_id UUID, name TEXT, quantity DECIMAL, unit TEXT, unit_cost DECIMAL, created_at TIMESTAMPTZ)`.

**Modular Server Structure (v141):**
```
server.js           - Main bootstrap with invoice/quote routes
src/
  utils/
    config.js       - Build version, AI models config
    db.js           - pgPool, supabaseAdmin with write guard
    helpers.js      - Utility functions (chromium, payment URLs, profanity filter)
  middleware/
    auth.js         - Authentication middleware (requireAuth, requireSubscription, requireAdmin, requireAI)
  services/
    ai.js           - AI usage logging, voice command tools
    email.js        - Resend email service (lazy-loaded)
    pdf.js          - PDF generation with Puppeteer
  routes/
    index.js        - Route registration
    profile.js      - Profile CRUD, logo upload
    clients.js      - Client management, addresses
    payment.js      - Payment links CRUD, URL generation
    inventory.js    - Inventory management
    calendar.js     - Calendar events
    jobs.js         - Job folders with lifecycle timestamps
    job_materials.js - Materials per job (GET/POST/DELETE)
    messages.js     - System messages
    admin.js        - Admin endpoints
    trade_contacts.js - Trade contacts CRUD
```

## External Dependencies
- **Supabase**: Authentication and File Storage.
- **PostgreSQL via pgPool**: All database operations.
- **Stripe**: Payment processing for subscriptions and invoice payments.
- **Resend**: Transactional email service.
- **Node.js + Express.js**: Backend framework.
- **html2canvas**: Client-side image generation (PNG) for invoices/quotes.
- **Puppeteer-core**: Server-side PDF generation for emailed invoices/quotes.
- **OpenAI API**: Whisper for transcription, GPT-4o-mini for parsing.
- **bad-words**: Profanity filtering.
