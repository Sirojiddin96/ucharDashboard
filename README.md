# UcharTaxiBot — Admin Dashboard

A server-side rendered admin dashboard for the **UcharTaxiBot** Telegram taxi bot. Built with Next.js (App Router), Supabase, and Recharts.

## Features

- **Overview** — Key stats (total orders, completed, cancelled, reassigned, unique drivers, registered users) with a 30-day orders trend line chart and an order-status pie chart. Recent orders table with live data.
- **Orders** — Paginated, filterable table of all orders with status badges, driver info, phone numbers, and amounts.
- **Users** — Browse registered bot users (`bot_users` table).
- **Events** — View system/bot events log.
- **Authentication** — Username/password login protected by an `iron-session` cookie (8-hour session). All dashboard routes are server-side guarded.

## Tech Stack

| Layer | Library |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Database | Supabase (PostgreSQL via service-role key) |
| Auth | iron-session (encrypted HTTP-only cookie) |
| Charts | Recharts |
| Styling | Tailwind CSS v4 |
| Language | TypeScript |

## Project Structure

```
app/
  (dashboard)/        # Protected dashboard routes (layout enforces auth)
    page.tsx          # Overview page
    Charts.tsx        # Recharts line + pie chart components
    Sidebar.tsx       # Navigation sidebar
    orders/page.tsx   # Orders table
    users/page.tsx    # Users table
    events/page.tsx   # Events log
  api/auth/
    login/route.ts    # POST /api/auth/login
    logout/route.ts   # POST /api/auth/logout
  login/page.tsx      # Login form
lib/
  supabase.ts         # Supabase server-side client (service role)
  session.ts          # iron-session helper
```

## Environment Variables

Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
SUPABASE_SERVICE_KEY=<your-service-role-key>
SESSION_SECRET=<random-string-min-32-chars>
ADMIN_USERNAME=<admin-username>
ADMIN_PASSWORD=<admin-password>
```

> `SUPABASE_SERVICE_KEY` is never exposed to the browser — it is used only in server-side code.

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You will be redirected to `/login` if not authenticated.

## Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start development server (Turbopack) |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
