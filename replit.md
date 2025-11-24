# TradeBase - Invoice & Billing App

## Overview
TradeBase is a comprehensive invoicing and billing application designed for tradespeople. It enables client management, invoice and estimate creation, job photo tracking, cost calculation with markup, and a referral program. The project aims to provide a robust, full-stack web application solution for managing business operations with multi-language support and customizable invoice templates.

## User Preferences
None currently documented.

## System Architecture
TradeBase is a full-stack web application built with Node.js and Express.js for the backend, and Vanilla JavaScript for a Single-Page Application (SPA) frontend. Supabase (PostgreSQL) is used for the database, authentication, and file storage. Stripe is integrated for payment processing.

**Key Features:**
- **Multi-Tier Subscription Paywall**: Monthly, Yearly, and Lifetime pricing with a 7-day free trial.
- **Multi-Language Support**: Full UI translation in 5 languages (English, Spanish, French, German, Portuguese) with language picker available immediately on login/signup screen.
- **Invoice Template System**: 4 professional invoice templates (Basic Clean, Modern Pro, Color Accent Header, Big Total) selectable in settings.
- **Invoice & Quote Management**: Create, track, download, and send professional invoices and quotes with line items and payment tracking.
- **Email Invoices**: Send invoices directly to clients via email using Resend integration (3,000 free emails/month). Professional HTML emails include invoice details, payment links, and business contact information.
- **Quote to Invoice Conversion**: One-click button to convert any quote into an invoice with all data pre-filled (client info, line items, totals).
- **Monthly Financial Dashboard**: Real-time stats cards showing total invoiced this month, paid this month, and outstanding balance with currency formatting.
- **Payment Collection**: Full Stripe Payment Link integration with automatic status updates via webhooks, manual payment controls, and payment statistics.
- **Inventory Management**: Track supplies, materials, and stock with quantity, pricing, categories, low stock alerts, and total value calculations.
- **Client Database**: Store client information with flexible entry options.
- **Photo Attachments**: Attach job-related photos to invoices.
- **Cost Calculator**: Materials, labor, markup, and tax calculation.
- **Business Settings**: Manage logo, business information, default rates, language preference, and invoice template.
- **Referral Program**: 20% commission for referred users.
- **Light/Dark Mode**: Theme toggle with persistence.
- **Document Download**: Export invoices and quotes as PNG images with company logo using selected template.
- **Interactive Tour**: Demo mode with sample data to showcase features and template variations.
- **Offline PWA**: Progressive Web App with offline-first architecture using IndexedDB and Service Worker.

**UI/UX Decisions:**
- The application features a light/dark mode toggle with preference persistence.
- Responsive design is implemented with a mobile breakpoint at 600px.
- Invoice and quote previews on the pricing page show logo placement and footer customization.
- Payment status badges are color-coded (🟢 Paid / 🔴 Unpaid / 🟡 Pending).
- Language picker is prominently displayed on the login/signup screen for immediate access.
- Demo mode showcases all 4 invoice template styles with renderTemplateShowcase() function.

**Technical Implementations & System Design:**
- **Authentication**: Supabase Authentication with email/password. Server-side validation of Supabase JWT tokens via `Authorization: Bearer` header ensures security.
- **Subscription Flow**: New users get a 7-day free trial, managed by `trial_ends_at` in the user profile. A subscription middleware (`requireSubscription`) protects core features, redirecting expired users to the pricing page. Stripe webhooks handle subscription events (e.g., `checkout.session.completed`, `customer.subscription.deleted`, `customer.subscription.updated`).
- **Payment Collection Workflow**: Users can enable Stripe Connect. Stripe Payment Links are generated for invoices, and webhooks automatically update invoice payment statuses. Manual payment status updates are also supported.
- **Multi-Language System**: Translation system uses `data-i18n` and `data-i18n-placeholder` HTML attributes. The `applyLanguage()` function in `languages.js` traverses the DOM and applies translations. User language preference is stored in `profiles.preferred_language` and persisted via API. Language selection triggers immediate UI update.
- **Invoice Template System**: 4 distinct invoice templates defined in `templates.js` with unique styling (fonts, colors, layouts). The `renderInvoiceTemplate()` function generates HTML based on selected template. User template preference is stored in `profiles.preferred_template`. Templates are showcased in demo mode via `renderTemplateShowcase()`.
- **Offline PWA**: Service Worker (v2) caches all critical static assets including `languages.js` and `templates.js` for full offline functionality. IndexedDB stores user data locally. Background sync ensures offline changes sync when connectivity returns. Users must visit the app online at least once to download all cached files before offline mode works. Cache is automatically updated when service worker version changes.
- **Database Schema**: Utilizes `profiles`, `clients`, `invoices`, `invoice_items`, `invoice_attachments`, `quotes`, `quote_items`, `inventory_items`, and `referral_earnings` tables. Profile table includes `preferred_language` and `preferred_template` fields for user preferences.
- **File Storage**: Supabase Storage is used for `logos` and `invoice-photos`.
- **API Endpoints**: Comprehensive set of RESTful APIs for managing profiles, clients, invoices, quotes, payments, inventory, referrals, and Stripe integrations. Profile endpoints support language and template preference updates.
- **Environment Variables**: Critical secrets (`STRIPE_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) are managed via Replit Secrets. Shared variables include `SUPABASE_URL`, `FRONTEND_URL`, and `PORT`. **NOTE: Add `STRIPE_WEBHOOK_SECRET` to environment variables** (get from Stripe dashboard → Webhooks → Signing secret)
- **Static File Serving**: The Express server serves static frontend files with cache-control headers.
- **Client Entry**: Supports both selection of saved clients and manual freeform entry.

## Setup Requirements

**⚠️ CRITICAL: Run Supabase Migration**
Before launching, you MUST run the database migration in your Supabase project:
1. Go to Supabase Dashboard → SQL Editor
2. Create a new query and paste the contents of `supabase_migration.sql`
3. Click "Run" to apply all migrations

This adds subscription tables, quotes system, payment tracking, and inventory management.

## External Dependencies
- **Supabase**:
    - **Database**: PostgreSQL for all application data.
    - **Authentication**: User authentication and management.
    - **Storage**: Cloud storage for business logos and invoice photos.
- **Stripe**:
    - **Payments**: Processing subscriptions and one-time invoice payments via Payment Links and webhooks.
- **Resend (Email Service)**:
    - **Integration**: Using Replit's Resend connector for seamless email sending.
    - **Free Tier**: 3,000 emails/month with 100 emails/day limit.
    - **Features**: Professional transactional emails with HTML templates, auto-filled business info, and payment links.
    - **Security**: API key and sender email managed via Replit connector integration (no manual secrets required).
    - **Implementation**: Backend endpoint POST /api/invoices/:id/send-email protected by requireSubscription middleware.
- **Node.js + Express.js**: Backend framework.
- **html2canvas**: JavaScript library for rendering HTML elements to canvas, used for generating downloadable PNG images of invoices and quotes.

## Multi-Language Support
TradeBase supports 5 languages with full UI translation:

**Supported Languages:**
- English (en) - Default
- Spanish (es) - Español
- French (fr) - Français
- German (de) - Deutsch
- Portuguese (pt) - Português

**Implementation:**
- `languages.js` contains all translations organized by screen/feature, with language initialization in DOMContentLoaded
- HTML elements use `data-i18n` attribute for text content and `data-i18n-placeholder` for input placeholders
- `applyLanguage()` function updates all translated elements dynamically
- Language preference is saved to user profile and persists across sessions via localStorage and database
- Language picker is available on both login/signup screen AND dashboard header for easy switching while using the app
- Dashboard language dropdown is positioned in header-actions next to theme toggle and logout button
- `setLanguage()` function handles language changes, localStorage persistence, and automatic UI translation
- `saveLanguagePreference()` persists language choice to user profile (sends only {preferred_language} field to prevent data loss)
- `updateLanguagePickerValue()` synchronizes dropdown value across different app states (login, dashboard, tour mode)
- Initialization sequence ensures returning users see their saved language immediately with no flash
- Translations cover: auth, navigation, dashboard, invoices, quotes, clients, inventory, payments, settings, referrals, trial banners, and tour mode

**Files:**
- `languages.js` - Translation data and application logic
- `index.html` - HTML elements with translation attributes
- `server.js` - API endpoints for saving/loading language preferences

## Invoice Template System
TradeBase offers 4 professional invoice templates for customizable document generation:

**Available Templates:**
1. **Basic Clean** (`basic_clean`) - Black and white, classic contractor PDF style
2. **Modern Pro** (`modern_pro`) - Bold headings, clean sections, professional layout
3. **Color Accent Header** (`color_accent`) - Blue/gray header for official appearance
4. **Big Total** (`big_total`) - Emphasizes the total amount prominently

**Implementation:**
- `templates.js` contains template definitions with custom HTML, CSS, and layout logic
- `renderInvoiceTemplate(template, data)` function generates styled invoice HTML
- `renderTemplateShowcase()` displays all 4 templates as clickable cards in demo mode
- `previewTemplateInModal()` function opens full-screen modal with complete invoice preview for any template
- Interactive preview: Users can click any template card to see a full invoice rendered in that style with sample data
- Logo display: Templates automatically display business logo on the left side when available (demo mode shows placeholder, real users see their uploaded logo)
- Template preference is saved to user profile and used for all invoice/quote downloads
- Each template includes custom fonts, colors, spacing, and visual hierarchy
- Templates support business logo, line items, photos, tax calculation, and footer text
- Modal preview includes close button and click-outside-to-close functionality

**Files:**
- `templates.js` - Template definitions and rendering logic
- `script.js` - Download functions, template showcase, and interactive preview modal
- `server.js` - API endpoints for saving/loading template preferences
- `index.html` - Preview modal container markup

## Inventory Management
TradeBase includes a comprehensive inventory management system for tracking supplies, materials, and stock:

**Features:**
- Add, edit, and delete inventory items
- Track quantity, unit price, and category for each item
- Set low stock thresholds with visual alerts (⚠️ Low Stock / ✓ In Stock)
- Calculate total inventory value automatically
- Support for multiple unit types (Each, Box, Sq Ft, Linear Ft, Gallon, Pound, Roll, Sheet, Bundle)
- Organize items by category (Materials, Tools, Electrical, Plumbing, Hardware, Paint, Safety, Other)

**API Endpoints:**
- `GET /api/inventory` - List all inventory items for the authenticated user
- `POST /api/inventory` - Create a new inventory item
- `PATCH /api/inventory/:id` - Update an existing inventory item
- `DELETE /api/inventory/:id` - Delete an inventory item

**Database:**
The `inventory_items` table includes fields for name, description, quantity, unit_price, category, unit_type, low_stock_threshold, and proper user isolation via RLS policies.