# Mozaik Pavers — Website, Quotation Platform & Sales CRM

A production-ready Next.js application for **Mozaik Pavers** (Malawi):

**Discover → Visualize → Estimate → Request Quote → Receive Quote → Book Site Assessment**

- Premium marketing site with an interactive **Before & After** slider and filterable project portfolio
- **Instant quotation calculator** (Malawi Kwacha) driven by a central, tested pricing engine
- Server-side recalculation, **PDF quotation**, **email delivery** with safe retry, and a **site-assessment** follow-up
- Lightweight **sales CRM**: leads, statuses, site visits, notes, activity log and CSV export
- **Admin dashboard** with KPIs, filters and a conversion funnel
- **Pricing administration** with full version history; every quotation stores a snapshot of the rates it used
- **Project management** with before/after/gallery uploads and "featured" projects

---

## Quick start (local)

Requirements: Node.js 20+ (tested on 24).

```bash
npm install
cp .env.example .env.local   # then set AUTH_SECRET and ADMIN_PASSWORD (see the file)
npm run dev                  # http://localhost:3000
```

No database server is needed for development: when `DATABASE_URL` is empty the app uses
an **embedded PostgreSQL** (PGlite) stored in `.data/pglite`. It is migrated and seeded
automatically on first request with:

- pricing version 1 (the rates supplied by Mozaik Pavers),
- the first administrator from `ADMIN_EMAIL` / `ADMIN_PASSWORD`,
- a **starter portfolio of 10 real projects** built from original Mozaik Pavers photographs (`public/portfolio`, EXIF/GPS metadata stripped), seeded once.

Sign in at **/admin/login**. In development, quotation emails are written to `.data/outbox`
(HTML + PDF attachment) instead of being sent.

| Command | Purpose |
|---|---|
| `npm run dev` | Development server |
| `npm test` | Unit + integration tests (Vitest) |
| `npm run typecheck` / `npm run lint` | TypeScript / ESLint |
| `npm run build && npm start` | Production build / server |
| `npm run db:generate` | Create a migration after editing `src/lib/db/schema.ts` |
| `npm run db:migrate` / `npm run db:seed` | Apply migrations / seed (PostgreSQL or embedded) |

---

## Before launch — checklist

1. **Contact details**: phones (+265 993 897 567 / +265 993 398 028), WhatsApp (first number), Facebook and Instagram are set. Confirm `NEXT_PUBLIC_COMPANY_EMAIL` and `NEXT_PUBLIC_COMPANY_ADDRESS` — those defaults are placeholders.
2. **Logo**: replace the wordmark in `src/components/ui/logo.tsx` and `public/brand/mark.svg`; add `public/brand/logo.png` to put the official logo on PDF quotations.
3. **Projects**: the starter projects have no recorded location, area or completion date (shown as "Malawi"). Fill these in from Admin → Projects; add new projects with before/after photos taken from the same spot.
4. **Products**: `src/config/products.ts` describes each product from the photos only — add sizes, colours and strength ratings once confirmed.
5. **Testimonials**: `src/config/content.ts` contains placeholder testimonials labelled "Sample". Replace them with genuine ones (with permission) or empty the list to hide the section.
6. **Terms**: review the quotation terms and disclaimer in `src/lib/pdf/quotation-pdf.ts`.
7. **Email**: create a Resend account, verify your sending domain, set `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_TRANSPORT=resend`, and optionally `SALES_NOTIFICATION_EMAIL`.

---

## Architecture

```
src/
  app/
    (site)/            Public pages: home, projects, project detail, products, before-after,
                       services, about, quote, contact, site-assessment
    admin/(auth)/      Admin login
    admin/(panel)/     Dashboard, leads, lead detail, projects, pricing settings
    admin/actions.ts   Server Actions (each re-checks the session)
    api/               quotations, quotation email retry, PDF, site-visits, contact, events
    media/[...key]     Serves locally stored uploads
  lib/
    pricing/           ★ Quotation engine (pure, shared by browser + server) + tests
    services/          Business logic: quotations, leads, pricing, projects, analytics, audit
    db/                Drizzle schema, connection (Postgres or embedded), seed
    validation/        Zod schemas shared by forms and the server
    pdf/ email/        PDF builder (pdf-lib) and email transport (Resend / file)
    auth/ security/    Sessions (JWT cookie), scrypt passwords, rate limiting, origin checks
    storage/           Image storage (local disk or Supabase Storage)
  components/          UI: before/after slider, quote wizard, cost table, admin UI…
  proxy.ts             Redirects anonymous /admin traffic (Next.js 16 "proxy")
drizzle/               SQL migrations
tests/                 Integration tests (real PostgreSQL via PGlite)
```

### The quotation engine

`calculateQuotation(squareMetres, pricingConfig, options)` in `src/lib/pricing/engine.ts` is the
single source of truth. It is pure and deterministic, so:

- the browser runs it for the **live estimate** (no network round-trip), and
- the server **re-runs it** with the pricing loaded from the database before saving, generating the PDF or emailing.
  Totals from the browser are never accepted.

"Per N or part thereof" quantities use `unitsRequired()` (ceil with protection against floating-point noise).
Unpriced optional services (site preparation, removal, drainage, other) appear as
**"Price subject to site assessment"** and are excluded from the total — the engine never invents a price.

Tests cover the 150 SQM reference example (**K10,397,500**) and every threshold boundary
(49/50/51, 99/100/101, 149/150/151, 199/200/201 SQM), with expected values worked out by hand.

### Pricing versions & reproducibility

- `pricing_config` holds the current rates (one row); `pricing_history` is append-only.
- Saving in **Admin → Pricing Settings** creates a new version inside a locked transaction and writes an audit entry with the before/after values.
- Each quotation stores `pricing_version`, a full `pricing_snapshot` and the computed `result`. PDFs are rebuilt from that snapshot, and the lead page proves reproducibility by recalculating from it.

### Quotation workflow (server)

`POST /api/quotations` → origin check, rate limit, honeypot + timing bot check → Zod validation →
**idempotency** (client-generated key; retries and double-submits return the original quotation) →
transaction: customer, atomic per-year number `MP-Q-YYYY-NNNNN`, quotation + items + snapshot, lead, audit →
PDF → email (attempts reserved atomically, capped at 5) → response.
The success message is shown **only** when the backend reports `delivery.status = "sent"`; otherwise the customer
can download the PDF and retry sending via `POST /api/quotations/:number/email` without creating a new quotation.

Customer links (PDF, site assessment) use an unguessable per-quotation `access_token`; database IDs are UUIDs and never exposed.

### Database

PostgreSQL tables: `customers`, `quotations`, `quotation_items`, `quote_counters`, `leads`, `site_visit_requests`,
`projects`, `project_images`, `pricing_config`, `pricing_history`, `users`, `audit_logs`, `analytics_events` —
with foreign keys, timestamps and indexes for the dashboard filters (status, date, location, project type).

### Analytics

First-party events (`/api/events`, sent with `sendBeacon`): page views, project viewed, before/after interaction,
calculator opened, SQM entered, quotation completed/emailed, WhatsApp/phone clicks, site assessment requested.
The dashboard shows the funnel as unique sessions per step.

### Security

- Admin: scrypt password hashes, HS256 JWT in an `httpOnly`, `SameSite=Lax`, `Secure` (prod) cookie, 8-hour sessions; every page/action/route re-verifies the user is active (`requireAdmin`); pricing requires the `admin` role; login rate-limited per IP and per email with constant-time checks.
- CSRF: Server Actions are origin-checked by Next.js; JSON routes require a same-origin `Origin` header.
- Validation: Zod on every input; control characters stripped; Drizzle parameterised queries (no string SQL); React escaping + HTML-escaped email templates; CSV export neutralises formula injection.
- Uploads: type detected from file signature (JPEG/PNG/WebP/AVIF), 8 MB cap, re-encoded with orientation applied and all metadata (incl. GPS) stripped, random names, path-traversal guard.
- Spam: honeypot, minimum fill time, per-IP rate limits. Security headers (HSTS, frame-deny, nosniff, referrer and permissions policies).
- Structured JSON logs with secret redaction; audit log of admin and quotation activity.

> The rate limiter is in-memory (per instance). For multiple instances, back `src/lib/security/rate-limit.ts` with Redis/Upstash.
> If the app is not behind a trusted proxy, `x-forwarded-for` can be spoofed — configure your proxy to overwrite it.

---

## Production deployment

1. **Database** — create a PostgreSQL database (e.g. Supabase). Set `DATABASE_URL` (use `DATABASE_PREPARE=false` with the Supabase transaction pooler), then:
   ```bash
   npm run db:migrate && npm run db:seed
   ```
2. **Secrets** — set `AUTH_SECRET` (48+ random bytes), `ADMIN_EMAIL`, `ADMIN_PASSWORD` (seed only), `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_TRANSPORT=resend`, `NEXT_PUBLIC_SITE_URL`.
3. **Images** — set `STORAGE_DRIVER=supabase`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET` (a **public** bucket). Uploaded images are then served from Supabase and optimised by `next/image`. With the `local` driver, `UPLOAD_DIR` must be on persistent disk.
4. **Build & run** — `npm run build && npm start` on any Node.js host (Vercel, Render, Railway, a VPS behind Nginx). With Vercel, use the Supabase storage driver (the filesystem is ephemeral).
5. Log in at `/admin/login`, change pricing if needed, replace the sample projects.

Environment variables are documented in `.env.example`. Secrets are only read on the server; nothing sensitive uses the `NEXT_PUBLIC_` prefix.
