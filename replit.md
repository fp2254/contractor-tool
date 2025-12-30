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
- **Offline-First Invoice System** (December 2024): Invoices ALWAYS save to IndexedDB first, cloud sync is secondary. Features:
  - Save flow: Local save → immediate success → background sync attempt
  - Manual Sync: "Sync" button with unsynced count badge on invoice list screen
  - Status badges: 📱 Local Only / ☁️ Synced shown on each invoice card
  - Logout guard: Warns user about unsynced invoices before allowing logout
  - Auto-sync: Triggers when coming back online via handleOnline() event
  - Invoice list merges local unsynced invoices with server data (local takes precedence)
  - PDF generation works immediately after local save (no cloud dependency)
  - tradebaseDB stores: sync_status (unsynced/synced), remote_id, sync_error, items array embedded
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
- **Multiple Payment Links System**: Users can save multiple payment methods (Venmo, PayPal, CashApp, Zelle, Stripe, Square, Other) in Settings. Each payment link has a provider, custom label, URL, and optional default flag. Payment link selector appears in Quick Pay modal.
- **Payment Routing System**: Simplified payment redirector (no OAuth, no webhooks). Contractor sets a default payment_provider (venmo/paypal/cashapp/zelle/square/stripe/custom) and payment_value (username or URL) in Settings. When creating an invoice, a payment_url is auto-generated or can be manually overridden. PaymentRouter builds provider-specific URLs:
  - Venmo: `https://venmo.com/{username}?txn=pay&amount={total}&note={invoiceNumber}`
  - PayPal: `https://paypal.me/{username}/{total}`
  - CashApp: `https://cash.app/${username}/{total}`
  - Square/Stripe/Custom: uses provided URL directly
  - Public invoice page shows "Pay Now" button redirecting to invoice.payment_url
- **Mobile Download Improvement**: Uses navigator.share() API on mobile for native sharing, with data URL fallback for iOS long-press save.

## Architecture Rules (NON-NEGOTIABLE)

### Database Configuration (December 2024)
**Single Source of Truth:**
- `SUPABASE_DB_URL` (user-controlled secret) takes priority over `DATABASE_URL` (Replit-managed)
- Production MUST use Supabase Connection Pooler (host contains `.pooler.supabase.com`)
- NEVER use `helium`, `localhost`, or direct Supabase DB host in production

**Fail-Fast Production Guard:**
- Server crashes immediately if production uses invalid DB host
- Validates pooler hostname before accepting any requests
- No silent fallbacks - misconfiguration = instant failure

**Connection String Format (Session mode, port 5432):**
```
postgresql://postgres.PROJECT_ID:PASSWORD@aws-X-us-east-2.pooler.supabase.com:5432/postgres
```

### Data Flow Architecture
All database writes follow ONE path only:
```
Frontend → apiFetch() → Express API → pgPool → PostgreSQL
```

### Supabase Usage Policy
| Component | Allowed | NOT Allowed |
|-----------|---------|-------------|
| `sb` (frontend) | Auth only (getSession, signIn, signOut) | Database reads/writes |
| `supabaseAdmin` (backend) | Storage only (file uploads) | Database writes (insert/update/delete) |
| `pgPool` (backend) | All database operations | - |

### Supabase Schema (v131 - December 2024)
**CRITICAL: Production and Development databases have DIFFERENT schemas!**

**Production Supabase `invoices` table (SUPABASE_DB_URL):**
| Supabase Column | Frontend Alias | Data Type |
|-----------------|----------------|-----------|
| `id` | `id` | bigint |
| `number` | `invoice_number` | text |
| `date` | `issue_date` | date |
| `tax` | `tax_amount` | numeric |
| `payment_link` | `payment_url` | text |
| (NO `client_name` column) | - | - |
| (NO `job_id` column) | - | - |

**Production Supabase `invoice_items` table:**
| Supabase Column | Frontend Alias | Data Type |
|-----------------|----------------|-----------|
| `id` | `id` | bigint |
| `invoice_id` | `invoice_id` | bigint |
| `description` | `description` | text |
| `qty` | `quantity` | numeric |
| `unit_price` | `unit_price` | numeric |
| `total` | `total` | numeric |

**Development Replit (DATABASE_URL):**
| Column Name | Data Type |
|-------------|-----------|
| `id` | uuid |
| `invoice_number` | text |
| `issue_date` | date |
| `tax_amount` | numeric |
| `payment_url` | text |

**Key Rules:**
- Production uses bigint IDs; Development uses UUIDs
- Server code MUST alias production columns to frontend names
- Always test against production schema (SUPABASE_DB_URL) before deploying
- The SQL tool in Replit queries DATABASE_URL, NOT SUPABASE_DB_URL

### Invoice Flow (Fully Converted to pgPool as of Dec 2024)
All invoice operations use pgPool exclusively:
- POST /api/invoices (create)
- PUT /api/invoices/:id (update)
- DELETE /api/invoices/:id
- POST /api/invoices/:id/photos
- POST /api/invoices/:id/archive
- POST /api/invoices/:id/unarchive
- POST /api/invoices/:id/payment-link
- PATCH /api/invoices/:id/payment-status
- PATCH /api/invoices/:id/job (link to job folder)
- POST /api/invoices/:id/send-email (mark as sent)
- GET /api/payments/stats (dashboard totals)
- Voice command undo (create_invoice case)
- logActivityAction() - activity logging for voice commands
- activity_logs update (mark undone)

### Hard Guard Enforcement (v116 - December 2024)
A Proxy wrapper on supabaseAdmin throws on ANY write operation (insert/update/delete/upsert).
All database writes are now routed through pgPool. Zero exceptions.

**Converted Entities (ALL use pgPool):**
- profiles (upsert, AI usage, invites, referral codes)
- clients (create, update, delete)
- invoices & invoice_items (all CRUD operations)
- quotes & quote_items (voice commands, undo)
- inventory_items (create, update, delete, smart stack)
- jobs (voice command creation)
- calendar_events (creation, undo)
- voice_notes (transcript updates)
- ai_usage_logs (usage tracking)
- system_messages (mark read)
- activity_logs (voice command logging)

**Remaining supabaseAdmin.from() Calls (READ-ONLY):**
- SELECT operations for fetching data (safe, no PostgREST writes)
- Storage operations (file uploads to buckets)

### Before Adding Features
1. Identify which fields are optional vs required
2. Identify which fields require UUIDs
3. Audit the FULL execution path (not just main route)
4. Ensure all writes go through pgPool

## External Dependencies
- **Supabase**: Authentication and File Storage ONLY (no database writes via supabaseAdmin).
- **PostgreSQL via pgPool**: ALL database operations.
- **Stripe**: Payment processing for subscriptions and one-time invoice payments via Payment Links and webhooks.
- **Resend (Email Service)**: For sending transactional emails with PDF attachments.
- **Node.js + Express.js**: Backend framework.
- **html2canvas**: JavaScript library for generating downloadable PNG images of invoices and quotes.
- **Puppeteer-core**: For generating PDF attachments for emailed invoices and quotes.
- **OpenAI API**: Whisper for voice transcription, GPT-4o-mini for parsing.
- **bad-words**: Profanity filter library for cleaning transcribed text.