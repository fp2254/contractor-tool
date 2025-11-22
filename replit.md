# TradeBase - Invoice & Billing App

## Overview
TradeBase is a comprehensive invoicing and billing application designed for tradespeople. It enables client management, invoice and estimate creation, job photo tracking, cost calculation with markup, and a referral program. The project aims to provide a robust, full-stack web application solution for managing business operations.

## User Preferences
None currently documented.

## System Architecture
TradeBase is a full-stack web application built with Node.js and Express.js for the backend, and Vanilla JavaScript for a Single-Page Application (SPA) frontend. Supabase (PostgreSQL) is used for the database, authentication, and file storage. Stripe is integrated for payment processing.

**Key Features:**
- **Multi-Tier Subscription Paywall**: Monthly, Yearly, and Lifetime pricing with a 7-day free trial.
- **Invoice & Quote Management**: Create, track, download, and send professional invoices and quotes with line items and payment tracking.
- **Payment Collection**: Full Stripe Payment Link integration with automatic status updates via webhooks, manual payment controls, and payment statistics.
- **Inventory Management**: Track supplies, materials, and stock with quantity, pricing, categories, low stock alerts, and total value calculations.
- **Client Database**: Store client information with flexible entry options.
- **Photo Attachments**: Attach job-related photos to invoices.
- **Cost Calculator**: Materials, labor, markup, and tax calculation.
- **Business Settings**: Manage logo, business information, and default rates.
- **Referral Program**: 20% commission for referred users.
- **Light/Dark Mode**: Theme toggle with persistence.
- **Document Download**: Export invoices and quotes as PNG images with company logo.
- **Interactive Tour**: Demo mode with sample data to showcase features.

**UI/UX Decisions:**
- The application features a light/dark mode toggle with preference persistence.
- Responsive design is implemented with a mobile breakpoint at 600px.
- Invoice and quote previews on the pricing page show logo placement and footer customization.
- Payment status badges are color-coded (🟢 Paid / 🔴 Unpaid / 🟡 Pending).

**Technical Implementations & System Design:**
- **Authentication**: Supabase Authentication with email/password. Server-side validation of Supabase JWT tokens via `Authorization: Bearer` header ensures security.
- **Subscription Flow**: New users get a 7-day free trial, managed by `trial_ends_at` in the user profile. A subscription middleware (`requireSubscription`) protects core features, redirecting expired users to the pricing page. Stripe webhooks handle subscription events (e.g., `checkout.session.completed`, `customer.subscription.deleted`, `customer.subscription.updated`).
- **Payment Collection Workflow**: Users can enable Stripe Connect. Stripe Payment Links are generated for invoices, and webhooks automatically update invoice payment statuses. Manual payment status updates are also supported.
- **Database Schema**: Utilizes `profiles`, `clients`, `invoices`, `invoice_items`, `invoice_attachments`, `quotes`, `quote_items`, `inventory_items`, and `referral_earnings` tables. Specific fields for subscription status, payment tracking, quote management, and inventory tracking are critical.
- **File Storage**: Supabase Storage is used for `logos` and `invoice-photos`.
- **API Endpoints**: Comprehensive set of RESTful APIs for managing profiles, clients, invoices, quotes, payments, inventory, referrals, and Stripe integrations.
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