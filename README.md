# ShigeOS

ShigeOS is a compact personal operations dashboard for quickly capturing tasks, journal notes, and expenses into Supabase, then reviewing the minimum daily information needed to act on them.

## Project Purpose

This MVP is designed for single-user daily use with a mobile-first, one-screen flow:

- capture anything quickly from one inbox input
- review unprocessed tasks and journals
- track this month's expenses
- maintain monthly budget settings
- see a daily safe-spending number

The product goal is speed and low friction, not deep workflow customization.

## Tech Stack

- React
- TypeScript
- Vite
- Tailwind CSS
- Supabase (PostgreSQL)

## Environment Variables

Create a `.env` file from `.env.example` and set:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## How To Run Locally

```bash
npm install
npm run dev
```

For a production build:

```bash
npm run build
npm run preview
```

## How To Apply The Supabase Schema

1. Open your Supabase project dashboard.
2. Go to the SQL Editor.
3. Copy the contents of `supabase-schema.sql`.
4. Run the SQL once against your project database.

This schema creates:

- `tasks`
- `journals`
- `expenses`
- `monthly_settings`

The MVP keeps RLS disabled by design for a simple single-user setup.

## What The MVP Currently Does

### Frictionless Inbox

- one text input with three capture buttons: Task, Journal, Expense
- task capture saves directly to `tasks`
- journal capture saves directly to `journals`
- expense capture saves directly to `expenses`
- expense amount uses simple regex extraction, so inputs like `120`, `1,200`, `lunch 120`, `coffee 45`, and `entry 120` work

### Dashboard

- shows safe spending amount for the current Bangkok month
- safe spending uses:
  - monthly income
  - fixed cost
  - savings target
  - current month's variable expenses
  - remaining days in month including today
- shows unprocessed tasks
- shows unprocessed journals needing tags or mood
- shows top 3 processed tasks ranked by `importance * 2 + urgency`

### Journal Workflow

- lists journal entries
- filters by tag text
- allows editing tags
- allows editing mood score from 1 to 5
- unprocessed journals can also be completed directly from the dashboard

### Expense Workflow

- stores quick expense captures with today's Bangkok date
- allows editing amount, category, and expense date
- recalculates safe spending after updates

### Monthly Settings

- stores `income`, `fixed_cost`, and `savings_target` by `month_key`
- uses the current Bangkok month key

## Intentionally Out Of Scope

To keep the MVP focused, this project intentionally does not include:

- authentication
- role-based access or RLS policies
- multi-user support
- routing-heavy flows or multiple major screens
- notifications
- AI/NLP parsing
- charts and analytics dashboards
- advanced budgeting categories or rules engines
- state management libraries
- offline sync

## Notes

- timezone-sensitive budget logic uses `Asia/Bangkok`
- currency display is Thai Baht (THB)
- the UI is intentionally compact and optimized around quick daily capture rather than deep editing flows
