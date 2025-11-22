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
1. **Invoice Management** - Create, track, and manage invoices with line items
2. **Client Database** - Save client information for easy reuse
3. **Estimates** - Draft and track job estimates
4. **Photo Attachments** - Attach job photos to invoices
5. **Cost Calculator** - Materials, labor hours, markup, and tax calculator
6. **Business Settings** - Logo upload, business info, default tax/markup rates
7. **Referral Program** - 20% commission on referred users
8. **Stripe Integration** - Multiple subscription plans (monthly, yearly, lifetime)
9. **Light/Dark Mode** - Theme toggle with localStorage persistence
10. **Invoice Download** - Export invoices as PNG images with company logo

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
- `profiles` - User business profiles and settings
- `clients` - Client information
- `invoices` - Invoice records
- `invoice_items` - Line items for invoices
- `invoice_attachments` - Photo attachments for invoices
- `estimates` - Job estimates
- `referral_earnings` - Referral commission tracking

Storage buckets:
- `logos` - Business logo uploads
- `invoice-photos` - Job photo attachments

## Recent Changes
- **2025-11-22 (Latest)**: Security fix and feature enhancements
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

### Estimates
- `GET /api/estimates` - List all estimates

### Referrals
- `GET /api/referrals/summary` - Get referral stats and earnings

### Stripe
- `POST /api/stripe/create-checkout-session` - Create Stripe checkout session

## Authentication
The application uses Supabase Authentication with email/password. The frontend uses the Supabase client library to manage auth state, and passes JWT access tokens to the backend via the `Authorization: Bearer` header.

The server validates these JWT tokens using the Supabase Admin client (`supabaseAdmin.auth.getUser(token)`) to ensure requests are genuinely authenticated before granting access to user data. This prevents user impersonation and unauthorized data access.

## User Preferences
None currently documented.

## Notes
- The application serves static files with cache-control headers to ensure users always see the latest version
- File uploads are handled via multer and stored in Supabase Storage
- Stripe integration supports multiple subscription plans and one-time payments
- Referral codes are auto-generated from user IDs
- Theme preference is stored in localStorage and persists across sessions
- Invoice downloads use html2canvas library for rendering (loaded before main script)
- Mobile breakpoint set at 600px width for responsive design
