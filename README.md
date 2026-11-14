# MediFlow — Hospital ERP + CRM (Phase 1 + Admission & Beds)

Next.js + MongoDB hospital operations platform. Vercel-deployable single-hospital foundation covering auth/RBAC, patients, appointments/queue, basic EMR, billing, audit, and dashboards.

## Stack

- **Next.js 16** (App Router) + TypeScript + Tailwind CSS
- **MongoDB** via Mongoose (use [MongoDB Atlas](https://www.mongodb.com/atlas) for Vercel)
- **Auth.js (NextAuth v5)** credentials + JWT sessions
- Role-based access: Admin, Receptionist, Doctor, Nurse, Accountant, Auditor

## Local setup

1. Install dependencies:

```bash
npm install
```

2. Copy env and set MongoDB URI:

```bash
cp .env.example .env.local
```

3. Start MongoDB locally **or** point `MONGODB_URI` at Atlas.

4. Seed demo data:

```bash
npm run seed
```

5. Run the app:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Demo users

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@mediflow.local` | `Admin@12345` |
| Doctor | `dr.mehta@mediflow.local` | `Doctor@12345` |
| Reception | `reception@mediflow.local` | `Reception@12345` |
| Accounts | `accounts@mediflow.local` | `Accounts@12345` |

## Phase 1 scope

- Secure login + RBAC + audit foundation
- Patient registration with UHID, search, profile
- Departments, doctors/staff, schedules
- Appointment booking, check-in, token queue
- Encounter notes, diagnosis, signed prescriptions
- Service catalogue, invoices, payments/receipts
- Operational dashboard + MTD reports
- Phase 2: Admission & Beds (wards, bed board, admit / transfer / discharge)
- Later-phase modules (lab, pharmacy, insurance, nursing) shown as navigation shells only

## Vercel deployment

1. Create a MongoDB Atlas cluster and database user; whitelist `0.0.0.0/0` (or Vercel IPs).
2. Push this repo to GitHub and import the project in Vercel.
3. Set environment variables for **Production** (and Preview if needed):

| Variable | Value |
|----------|-------|
| `MONGODB_URI` | Atlas connection string |
| `AUTH_SECRET` | `openssl rand -base64 32` (required) |
| `AUTH_TRUST_HOST` | `true` |
| `AUTH_URL` | **Optional.** If set, must be exactly your live URL (e.g. `https://mediflow.vercel.app`). Never leave it as `http://localhost:3000` on Vercel. |

4. In Vercel project settings, keep **System Environment Variables** enabled (so `VERCEL` is available).
5. Deploy. After first deploy, seed Atlas once (users will not exist until you do):

```bash
MONGODB_URI="your-atlas-uri" npm run seed
```

6. Sanity check: open `https://your-app.vercel.app/api/health` — should show `ok: true` and `activeUsers` > 0.

## Scripts

- `npm run dev` — development server
- `npm run build` — production build
- `npm run start` — start production server
- `npm run seed` — seed hospital, users, departments, services, wards/beds
- `npm run seed:admissions` — idempotent wards/beds/nurse seed (keeps existing data)
- `npm run lint` — ESLint
- `npm run test:rbac` — live RBAC matrix (dev server required)
- `npm run test:ui` — UI smoke (Playwright; browsers on `PLAYWRIGHT_BROWSERS_PATH`)

## Vercel env checklist

After connecting this repo in Vercel, set:

- `MONGODB_URI`
- `AUTH_SECRET`
- `AUTH_URL` (production domain, e.g. `https://your-app.vercel.app`)

Optional seed vars: `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`.

Then run `npm run seed` once locally against the same Atlas URI so demo users exist.

## Project layout

```
src/
  app/(app)/          # Authenticated pages
  app/api/            # REST API routes
  components/         # UI + layout
  lib/                # db, auth, permissions, audit
  models/             # Mongoose schemas
scripts/seed.ts       # Demo data seeder
```
