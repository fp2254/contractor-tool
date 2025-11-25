# TradeBase - Invoice & Billing App

## Overview
TradeBase is a comprehensive, full-stack web application designed for tradespeople, offering client management, invoice and estimate creation, job photo tracking, cost calculation with markup, and a referral program. It aims to streamline business operations through multi-language support, customizable invoice templates, and robust financial tracking capabilities. The project's ambition is to provide a robust solution for managing business operations.

## User Preferences
None currently documented.

## System Architecture
TradeBase is a full-stack web application using Node.js and Express.js for the backend, and Vanilla JavaScript for a Single-Page Application (SPA) frontend. Supabase (PostgreSQL) handles the database, authentication, and file storage, while Stripe is integrated for payment processing.

**UI/UX Decisions:**
- Features a light/dark mode toggle with preference persistence.
- Responsive design targets mobile breakpoints at 600px.
- Invoice and quote previews on the pricing page show logo placement and footer customization.
- Payment status badges are color-coded (🟢 Paid / 🔴 Unpaid / 🟡 Pending).
- Language picker is prominently displayed on login/signup and in the dashboard header.
- Demo mode showcases all 4 invoice template styles.

**Technical Implementations & System Design:**
- **Authentication**: Supabase Authentication with email/password and server-side JWT validation.
- **Subscription Flow**: Multi-tier subscription paywall (Monthly, Yearly, Lifetime) with a 7-day free trial, managed via `trial_ends_at` and a `requireSubscription` middleware. Stripe webhooks handle subscription events.
- **Payment Collection Workflow**: Integration with Stripe Payment Links for invoice payments, automatic status updates via webhooks, and manual payment controls.
- **Multi-Language System**: UI translation in 5 languages (English, Spanish, French, German, Portuguese) using `data-i18n` attributes and a dynamic `applyLanguage()` function. User language preference is stored in `profiles.preferred_language`.
- **Invoice Template System**: 4 distinct, professional invoice templates (`Basic Clean`, `Modern Pro`, `Color Accent Header`, `Big Total`) defined in `templates.js`. The `renderInvoiceTemplate()` function generates HTML based on the user's `preferred_template`.
- **Offline PWA**: Progressive Web App with an offline-first architecture using Service Worker (v5) for caching and IndexedDB for local data storage. Supports iOS home screen installation.
- **Database Schema**: Utilizes `profiles`, `clients`, `invoices`, `invoice_items`, `invoice_attachments`, `quotes`, `quote_items`, `inventory_items`, and `referral_earnings` tables.
- **File Storage**: Supabase Storage for `logos` and `invoice-photos`.
- **API Endpoints**: RESTful APIs for managing profiles, clients, invoices, quotes, payments, inventory, and referrals.
- **Inventory Management**: Comprehensive system to add, edit, and delete inventory items, track quantity, unit price, category, low stock alerts, and calculate total inventory value.

## External Dependencies
- **Supabase**: PostgreSQL Database, Authentication, and File Storage.
- **Stripe**: Payment processing for subscriptions and one-time invoice payments via Payment Links and webhooks.
- **Resend (Email Service)**: For sending transactional emails (invoices) via a Replit connector.
- **Node.js + Express.js**: Backend framework.
- **html2canvas**: JavaScript library for generating downloadable PNG images of invoices and quotes.