# TradeBase - Invoice & Billing App

## Overview
TradeBase is a comprehensive invoicing and billing application designed specifically for tradespeople. It provides tools to manage clients, create invoices and estimates, track job photos, calculate costs with markup, and run a referral program.

**Project Type**: Full-stack web application  
**Current State**: Successfully imported and configured for Replit  
**Last Updated**: November 22, 2025

## Tech Stack
- **Backend**: Node.js + Express.js
- **Frontend**: Vanilla JavaScript (SPA)
- **Database**: Supabase (PostgreSQL)
- **Payments**: Stripe
- **Authentication**: Supabase Auth
- **File Storage**: Supabase Storage

## Key Features
1. **Multi-Tier Subscription Paywall** - Monthly, Yearly, and Lifetime pricing options with 7-day free trial
2. **Invoice Management** - Create, track, and manage invoices with line items
3. **Quote Management** - Draft, track, download, and send professional quotes (formerly Estimates)
4. **Client Database** - Save client information with flexible manual entry or selection
5. **Photo Attachments** - Attach job photos to invoices
6. **Cost Calculator** - Materials, labor hours, markup, and tax calculator
7. **Business Settings** - Logo upload, business info, default tax/markup rates
8. **Referral Program** - 20% commission on referred users with promotional section on pricing page
9. **Light/Dark Mode** - Theme toggle with localStorage persistence
10. **Document Download** - Export invoices and quotes as PNG images with company logo
11. **Interactive Tour** - "Take a Tour" feature with demo data for previewing app before subscribing
12. **Payment Collection** - Stripe Connect integration for accepting payments ($4/mo for Monthly/Yearly, included free in Lifetime plans)

## Project Structure
```
.
├── server.js          # Express server (API + static file serving)
├── index.html         # Single-page application UI
├── script.js          # Frontend JavaScript logic
├── style.css          # Application styles
├── config.js          # Public configuration (Supabase URL, Stripe public key)
├── package.json       # Node.js dependencies
└── .gitignore         # Git ignore rules
```

## Environment Variables

### Secrets (Replit Secrets)
- `STRIPE_SECRET_KEY` - Stripe API secret key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase admin/service role key

### Shared Environment Variables
- `SUPABASE_URL` - Supabase project URL
- `FRONTEND_URL` - Application URL for Stripe redirects
- `PORT` - Server port (5000)

## Database Schema
The application uses Supabase with the following tables:
- `profiles` - User business profiles, settings, and subscription status
- `clients` - Client information
- `invoices` - Invoice records
- `invoice_items` - Line items for invoices
- `invoice_attachments` - Photo attachments for invoices
- `quotes` - Quote/estimate records (renamed from estimates)
- `quote_items` - Line items for quotes
- `referral_earnings` - Referral commission tracking

**Important**: Run `supabase_migration.sql` in your Supabase SQL Editor to add:
- Subscription fields to profiles table
- Quotes and quote_items tables with RLS policies
- client_name field to invoices for manual entry

Storage buckets:
- `logos` - Business logo uploads
- `invoice-photos` - Job photo attachments

## Recent Changes
- **2025-11-22 (Latest)**: Payment collection feature and invoice preview
  - **Payment Collection Feature**: Added prominent feature box showing Stripe Connect payment collection
  - Lifetime plans now include payment collection for FREE (no $4/mo charge)
  - Monthly/Yearly plans can add payment collection for $4/mo
  - Visual invoice preview on pricing page showing logo placement and footer customization
  - "Accept Payments Directly" feature box with clear pricing for each tier
  - Updated pricing cards to highlight payment collection as included benefit for Lifetime plans
  
- **2025-11-22**: Interactive tour mode and referral promotion section
  - **Interactive Tour**: Added "Take a Tour" button on pricing page that lets users preview the app with sample data
  - Tour mode shows demo invoices, quotes, clients, settings, and referral data
  - All forms disabled during tour to prevent data entry
  - Exit tour banner allows users to return to pricing page or continue as logged-in user
  - Tour mode isolated from normal authentication flow - doesn't interfere with real user sessions
  - **Referral Promotion**: Professional gradient banner on pricing page highlighting 20% commission program
  - Eye-catching design with icon, clear messaging, and call-to-action
  
- **2025-11-22**: Multi-tier subscription pricing with lifetime options and Stripe Connect add-on
  - **Multi-Tier Pricing**: Added 4 subscription options displayed on pricing page
    - Monthly: $9.99/mo with 7-day free trial
    - Yearly: $99/yr (save 17%)
    - Lifetime Early Bird: $149 one-time (limited to first 500 users)
    - Lifetime Regular: $199 one-time (after 500 early bird sales)
  - **Lifetime Early Bird Counter**: API endpoint tracks purchases and auto-switches to regular pricing after 500 sales
  - **Stripe Connect Add-on**: Optional $4/mo payment collection feature (available for Monthly/Yearly plans only)
  - Responsive pricing grid with badges (BEST VALUE, LIMITED OFFER)
  - Server-side validation blocks Stripe Connect add-on for lifetime plans (subscription vs payment mode)
  - Clear UI messaging: "Available for Monthly and Yearly plans only" for add-on section
  - 
  - **Previous**: Subscription paywall, Quotes, and UX improvements
  - **Subscription System**: Added 7-day free trial that auto-converts to $9.99/month subscription
  - Trial countdown banner shows days remaining in dashboard
  - Subscription middleware protects invoices, clients, and quotes routes (returns 402 for expired access)
  - Stripe checkout integration with trial_period_days parameter
  - Stripe webhook endpoint (`/api/stripe/webhook`) handles subscription events
  - 
  - **Quotes (renamed from Estimates)**: Full functionality matching invoices
  - Create quotes with line items, client info, date, and notes
  - Download quotes as PNG with company logo (same as invoices)
  - List and manage quotes with proper totals and metadata
  - Complete API endpoints: GET/POST /api/quotes, GET /api/quotes/:id
  - 
  - **Client Entry**: Flexible text input with datalist autocomplete
  - Users can select saved clients OR type new names manually
  - No requirement to create client record before invoice/quote creation
  - Both client_id (for saved clients) and client_name (manual entry) supported
  - 
  - **Previous**: Security fix and feature enhancements
  - **SECURITY**: Fixed authentication to validate Supabase JWT tokens server-side instead of trusting X-User-Id header
  - Added light/dark mode toggle with CSS variables and localStorage persistence
  - Optimized mobile layout with responsive CSS (breakpoint @600px)
  - Implemented invoice download/export as PNG with company logo
  - Added GET /api/invoices/:id endpoint for fetching invoice details
  - Fixed dark mode text visibility across all UI elements
  - Integrated html2canvas library for image generation
  
- **2025-11-22**: Initial import from GitHub
  - Configured server to bind to 0.0.0.0:5000 for Replit environment
  - Added cache control headers to prevent browser caching issues
  - Set up environment variables for Supabase and Stripe
  - Created workflow for automatic server startup
  - Configured deployment settings for Autoscale

## Running the Application

### Development
The application runs automatically via the configured workflow. To manually start:
```bash
npm start
```

The server will start on port 5000 and serve both the API endpoints and static frontend files.

### Deployment
The application is configured for Replit Autoscale deployment, which will:
- Scale automatically based on traffic
- Use production environment variables
- Run the server with `node server.js`

## API Endpoints

### Profile
- `GET /api/profile` - Get user profile
- `POST /api/profile` - Create/update profile
- `POST /api/profile/logo` - Upload business logo

### Clients
- `GET /api/clients` - List all clients
- `POST /api/clients` - Create new client

### Invoices
- `GET /api/invoices` - List all invoices
- `GET /api/invoices/:id` - Get single invoice with items and client details
- `POST /api/invoices` - Create new invoice
- `POST /api/invoices/:id/photos` - Upload invoice photos

### Quotes
- `GET /api/quotes` - List all quotes (protected by subscription)
- `GET /api/quotes/:id` - Get single quote with items and client details (protected by subscription)
- `POST /api/quotes` - Create new quote (protected by subscription)

### Referrals
- `GET /api/referrals/summary` - Get referral stats and earnings

### Stripe
- `POST /api/stripe/create-checkout-session` - Create Stripe checkout session with trial
- `POST /api/stripe/webhook` - Handle Stripe subscription events (payment confirmation, cancellation)

## Authentication
The application uses Supabase Authentication with email/password. The frontend uses the Supabase client library to manage auth state, and passes JWT access tokens to the backend via the `Authorization: Bearer` header.

The server validates these JWT tokens using the Supabase Admin client (`supabaseAdmin.auth.getUser(token)`) to ensure requests are genuinely authenticated before granting access to user data. This prevents user impersonation and unauthorized data access.

## User Preferences
None currently documented.

## Subscription Flow
1. **Signup**: New users automatically receive a 7-day free trial (trial_ends_at set on profile creation)
2. **Trial Period**: Users have full access to invoices, quotes, and clients for 7 days
3. **Trial Banner**: Dashboard shows countdown of days remaining in trial
4. **Auto-Redirect**: After trial expires, users are redirected to pricing page (402 response from API)
5. **Stripe Checkout**: Monthly plan ($9.99/month) includes 7-day trial parameter
6. **Webhook**: Stripe sends events to /api/stripe/webhook to update subscription_status
7. **Access Granted**: After payment, subscription_status becomes 'active' and access is restored

## Stripe Webhook Setup
To receive subscription events, configure your Stripe webhook:
1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://your-replit-url.repl.co/api/stripe/webhook`
3. Select events: `checkout.session.completed`, `customer.subscription.deleted`, `customer.subscription.updated`
4. Use webhook signing secret if needed (optional, not currently validated)

## Notes
- The application serves static files with cache-control headers to ensure users always see the latest version
- File uploads are handled via multer and stored in Supabase Storage
- Subscription middleware (`requireSubscription`) protects all core features (invoices, quotes, clients)
- Referral codes are auto-generated from user IDs
- Theme preference is stored in localStorage and persists across sessions
- Invoice and quote downloads use html2canvas library for rendering (loaded before main script)
- Mobile breakpoint set at 600px width for responsive design
- Client entry supports both saved selections (via datalist) and freeform manual entry
