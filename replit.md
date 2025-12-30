# Skippy Stack - Invoice & Billing App

## Overview
Skippy Stack is a full-stack web application for tradespeople, offering client management, invoice/estimate creation, job photo tracking, cost calculation, and a referral program. It aims to streamline business operations through multi-language support, customizable invoice templates, and robust financial tracking. The project's ambition is to provide a comprehensive solution for managing business operations.

## User Preferences
- "Keep it stupid simple" philosophy for non-technical users
- Big buttons and one-page layouts
- 14-day free trial for all users
- Invite 4 friends = 60 free days bonus

## System Architecture
Skippy Stack is a full-stack web application utilizing Node.js with Express.js for the backend and Vanilla JavaScript for a Single-Page Application (SPA) frontend. Supabase provides authentication and file storage, while PostgreSQL (accessed via `pgPool`) handles all database operations. Stripe is integrated for payment processing.

**UI/UX Decisions:**
- Light/dark mode toggle with preference persistence.
- Responsive design targeting mobile breakpoints.
- Customizable invoice and quote previews.
- Color-coded payment status badges (Paid, Unpaid, Pending).
- Prominent language picker.
- Demo mode showcasing invoice templates and AI features.
- Notification center with system messages.
- Dashboard with AI Assistant, Calendar, and "Coming Soon" Trade Deals.
- Multi-select for bulk actions (Delete, Archive).

**Technical Implementations & System Design:**
- **Authentication**: Supabase Authentication with email/password and server-side JWT validation.
- **Subscription Flow**: 14-day free trial, managed by Stripe webhooks, including a separate AI Add-On subscription.
- **Payment Collection**: Stripe Payment Links for invoice payments, automatic status updates, and manual payment controls.
- **Multi-Language System**: UI translation in 5 languages using `data-i18n` attributes.
- **Invoice Template System**: 4 distinct, dynamic invoice templates with "Powered by Skippy Stack" footer.
- **Offline PWA**: Progressive Web App with offline-first architecture using Service Worker and IndexedDB for invoice management. Invoices save locally first, then sync to the cloud.
- **Job Folders**: Automatic organization of job-related assets (invoices, quotes, photos, voice notes).
- **Notification Center**: In-app system for announcements.
- **Database Schema**: Core tables include `profiles`, `clients`, `invoices`, `invoice_items`, `quotes`, `quote_items`, `inventory_items`, `referral_earnings`, `jobs`, `voice_notes`, `system_messages`, `calendar_events`, `ai_usage_logs`, and `payment_links`.
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