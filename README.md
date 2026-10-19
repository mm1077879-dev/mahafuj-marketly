# Marketly — Luxury E-Commerce

Marketly is a React/Vite storefront served by an Express API. The production Express process serves the Vite build and API from the same origin; MongoDB is the required production persistence layer.

## Local development

**Prerequisites:** Node.js 20.19+ (Node 22 LTS recommended) and npm.

1. Install dependencies with `npm ci`.
2. Copy `.env.example` to `.env` and set the values for the services you want to use.
3. Start the full-stack development server with `npm run dev`.
4. Run checks with `npm test`, `npm run lint`, and `npm run build`.

Development may use the in-memory preview store when MongoDB is unavailable. This fallback and the sample catalog are disabled in production.

## Render deployment

Create a **Node Web Service** from the project root and use:

- **Build command:** `npm ci --include=dev && npm run build`
- **Start command:** `npm start`
- **Health-check path:** `/api/health`
- **Runtime:** Node.js 22 LTS

The build command includes development dependencies because Vite compiles the frontend and `tsx` runs the TypeScript Express entry point. Render supplies `PORT`; the server binds to `0.0.0.0` and serves both `/api` and the SPA routes from the same service. No separate static-site service or frontend API URL is required.

Set these server-side environment variables in Render:

| Variable | Purpose |
| --- | --- |
| `NODE_ENV` | Set to `production`; disables in-memory data and sample seeding. |
| `MONGODB_URI` | Persistent MongoDB connection string; required for startup. |
| `AUTH_SECRET` | Private JWT signing secret of at least 32 characters. |
| `ADMIN_EMAIL` | Bootstrap administrator email. |
| `ADMIN_PASSWORD` | Private bootstrap password of at least 12 characters. |
| `APP_URL` | Public HTTPS origin used for OAuth/payment callbacks. |

Optional integrations, also configured only on the server:

- **Email verification and password reset:** `RESEND_API_KEY`, and optionally `EMAIL_FROM`. Without a working Resend configuration, production email requests fail explicitly; no development outbox is reported as delivery.
- **Google sign-in:** `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`. Register `${APP_URL}/auth/callback/google`.
- **Facebook sign-in:** `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET`. Register `${APP_URL}/auth/callback/facebook`.
- **Persistent image uploads:** `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`. Render's local filesystem is not used as durable upload storage.
- **Gemini features:** `GEMINI_API_KEY`.
- **bKash hosted checkout:** `BKASH_APP_KEY`, `BKASH_APP_SECRET`, `BKASH_USERNAME`, `BKASH_PASSWORD`, and `BKASH_SANDBOX`. Keep sandbox mode enabled for testing; set it to `false` only with production merchant credentials. `APP_URL` must be the public HTTPS origin.

Do not use `VITE_*` variables for secrets. The `.env.example` file contains placeholders only. Production startup fails if MongoDB, `AUTH_SECRET`, or a strong `ADMIN_PASSWORD` is unavailable. Sample catalog data is not inserted into production; populate the production catalog using the admin tools after connecting the database.

## Authentication and social sign-in

Social sign-in uses server-side OAuth authorization-code flows. Both the provider client ID/app ID and secret must be valid. Provider availability also depends on each provider's app review, consent configuration, permissions, and the callback URLs above.

## Payment behavior

- Cash on Delivery remains unpaid until authorized staff record collection after delivery.
- bKash uses hosted checkout and server-side provider verification. Product and order prices are stored in USD; the existing display conversion is fixed at 120 BDT per USD. Confirm the settlement rate and business pricing policy before live use.
- Nagad and card checkout remain unavailable until verified merchant integrations exist.
- Provider timeouts or incomplete callbacks leave payment pending for reconciliation. Do not retry as a new charge before resolving the existing attempt.

The deployment instructions prepare a Render service; they do not indicate that a live deployment has been performed.
