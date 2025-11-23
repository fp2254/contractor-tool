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
- **Offline PWA**: Service Worker caches static assets and API responses. IndexedDB stores user data locally. Background sync ensures offline changes sync when connectivity returns. Known limitation: Editing offline records before initial sync completes may fail (<10% edge case, acceptable for MVP).
- **Database Schema**: Utilizes `profiles`, `clients`, `invoices`, `invoice_items`, `invoice_attachments`, `quotes`, `quote_items`, `inventory_items`, and `referral_earnings` tables. Profile table includes `preferred_language` and `preferred_template` fields for user preferences.
- **File Storage**: Supabase Storage is used for `logos` and `invoice-photos`.
- **API Endpoints**: Comprehensive set of RESTful APIs for managing profiles, clients, invoices, quotes, payments, inventory, referrals, and Stripe integrations. Profile endpoints support language and template preference updates.
- **Environment Variables**: Critical secrets (`STRIPE_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) are managed via Replit Secrets. Shared variables include `SUPABASE_URL`, `FRONTEND_URL`, and `PORT`.
- **Static File Serving**: The Express server serves static frontend files with cache-control headers.
- **Client Entry**: Supports both selection of saved clients and manual freeform entry.

## External Dependencies
- **Supabase**:
    - **Database**: PostgreSQL for all application data.
    - **Authentication**: User authentication and management.
    - **Storage**: Cloud storage for business logos and invoice photos.
- **Stripe**:
    - **Payments**: Processing subscriptions and one-time invoice payments via Payment Links and webhooks.
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
- `languages.js` contains all translations organized by screen/feature
- HTML elements use `data-i18n` attribute for text content and `data-i18n-placeholder` for input placeholders
- `applyLanguage()` function updates all translated elements dynamically
- Language preference is saved to user profile and persists across sessions
- Language picker is available on login/signup screen for immediate access
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