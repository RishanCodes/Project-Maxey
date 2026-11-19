# BLACK FLASH — Personal Performance OS

A private, mobile-first web app for one person: today's focus, tasks, habits, routines, training, recovery, goals, focus timer, journal, rule-based coaching and honest progression. **Local First**: everything works offline with no account and no API key. Optional: cloud sign-in and sync, a Claude-powered coach, and reminders when the app is closed.

## Prerequisites
- Node.js 20.9+ (tested on Node 22) and npm.

## Run it
```sh
npm install
npm run dev          # http://localhost:3000 (development)
npm run build && npm start   # production build on http://localhost:3000
```
To preview on a phone on the same Wi-Fi: `npm start -- -H 0.0.0.0`, then visit `http://<computer-ip>:3000`. That works for looking around, but installing it properly on the Home Screen (offline use, notifications) needs an HTTPS deployment. See "Put it on your iPhone Home Screen".

## Scripts
| Command | What it does |
| --- | --- |
| `npm run typecheck` | TypeScript, no emit |
| `npm run lint` | ESLint (Next.js core-web-vitals + TypeScript rules) |
| `npm test` | Vitest unit tests (dates/timezones, recurrence, streaks, XP idempotence and cap, focus timer, onboarding branching and dedupe, backups, insights) |
| `npm run test:e2e` | Playwright journeys on an iPhone viewport against `next start` (run `npm run build` first; install a browser with `npx playwright install chromium` if you don't have one) |
| `npm run check` | typecheck + lint + unit tests + build |
| `npm run icons` | Re-render PNG icons from `public/icons/icon.svg` |
| `npm run test:cloud` | Cloud end-to-end tests against a local Supabase-compatible stack (needs Docker) |
| `npm run vapid` | Generate Web Push keys |

## Architecture
- `src/lib/schema.ts` — Zod schemas for every record (also used to validate backups). Schema version 1.
- `src/lib/db.ts` — Dexie (IndexedDB) storage. Add a new `version(n)` with an upgrade for schema changes.
- `src/lib/repo.ts` — the only write path: tasks, habits, routines, goals, training, check-ins, meals, focus timer, journal. Keeps XP and achievements consistent.
- `src/lib/recurrence.ts`, `dates.ts` — local-date math, recurring tasks, habit schedules, flexible streaks.
- `src/lib/stats.ts`, `insights.ts` — every displayed metric, derived from records (never stored totals).
- `src/lib/onboarding.ts`, `approval.ts` — adaptive question bank and deterministic plan drafting; approval is deduplicated by seed keys.
- `src/lib/backup.ts` — export / validated import (merge or replace).
- `src/app/api/coach/route.ts` + `src/lib/server/coach-policy.ts` — optional server-side AI coach.
- `src/lib/sync/*`, `src/lib/cloud/*` — change capture (outbox), sync engine (push/pull, last-write-wins, XP reconciliation), Supabase client and sign-in.
- `src/lib/schedule.ts` — "Suggest times": free slots around fixed commitments, applied only after approval.
- `src/lib/push/*`, `src/app/api/push/*` — reminder selection, subscription storage, reminder job.
- `supabase/migrations` — database schema with row-level security and allowlist.
- `src/app/*` — screens: Today, Plan, Coach, Growth, Training, Recovery, Goals, Focus, Journal, Settings, Data, Onboarding.

## Data, backup and privacy
- Data lives in this browser's IndexedDB on this device. It survives reloads and offline use. Without sign-in it does not sync between devices and is lost if site data is cleared; with sign-in it is mirrored to your private Supabase project. The Data screen can ask the browser to mark storage persistent.
- **Export** writes a versioned JSON file with every record and id. **Import** validates the file first, then either merges (adds missing records, never duplicates completions) or replaces everything after confirmation.
- The journal is private and excluded from any AI context unless you enable it in Settings.

## XP rules (editable in `src/lib/config.ts`)
Task occurrence +10 · habit check +10 · training session +15 · check-in or planned rest day +10 · focus session +10 · goal milestone +30 · at most 120 XP per day. Each action has a stable key; one active award per key; undo appends a reversal of exactly what was awarded. XP is engagement, not ability.

## Put it on your iPhone Home Screen

A Home Screen app needs an **HTTPS** address. On a plain `http://192.168.x.x` address iPhone won't run the offline worker or notifications, so deploy first (free on Vercel, below).

1. **Deploy** (see Deployment) and open your `https://…vercel.app` address in **Safari** on the iPhone.
2. **Add it before you set anything up.** On iPhone, Safari and a Home Screen app keep **separate storage**. Anything you enter in a Safari tab won't appear in the installed app unless you sign in to sync or export/import a backup.
3. Tap **Share** (square with an arrow; in newer iOS it's in the **⋯** menu) → scroll down → **Add to Home Screen**. If you see **Open as Web App**, leave it on. Tap **Add**.
4. Open BLACK FLASH **from the new icon**. It opens full screen with no Safari bar. Do onboarding here.
5. Optional, recommended: **Settings → Account & sync** → enter your email → type the **6-digit code** from the email into the app. Don't tap the link in the email, because that signs in Safari, not the app.
6. Optional: **Settings → Reminders when the app is closed → Turn on → Allow** (iOS 16.4 or later; only works when opened from the Home Screen icon). Use **Send a test** to check.
7. **Data → Ask the browser to keep my data**, and export a backup now and then (or use sync).

Updates to the deployed app reach the installed app automatically the next time it opens online. Android: open the address in Chrome → ⋮ → **Install app**.

## Deployment (Vercel)
1. Push this repo to GitHub, then on vercel.com: **Add New → Project →** import the repo, set **Root Directory** to `black-flash`, and deploy. That alone gives a working Local First app.
2. Add environment variables (Project → Settings → Environment Variables) for the optional features below, then **Redeploy**. (`NEXT_PUBLIC_*` values are built into the page, so changing them needs a redeploy.)

## Cloud sign-in and sync (Supabase)
1. Create a free project at supabase.com.
2. **SQL Editor →** paste and run `supabase/migrations/20261117000000_black_flash.sql`, then run
   `insert into public.bf_allowlist(email) values ('you@example.com');` (lower-case).
   Already set up before the 90-day program was added? Run the migration file again (it's safe to re-run) so the new program tables can sync.
3. **Authentication → Users → Add user → Create new user** with your email (tick auto-confirm).
4. **Authentication → Sign In / Providers →** turn off **Allow new users to sign up**. Strangers are blocked by the allowlist anyway; this keeps them from creating accounts at all.
5. **Authentication → Emails → Magic Link** template: make sure the email shows the code, e.g. add `<p>Your code: {{ .Token }}</p>`. The app signs in with that code.
6. **Authentication → URL Configuration → Site URL**: your deployed address.
7. **Project Settings → API**: copy the Project URL and the anon/publishable key into `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`; set `ALLOWED_EMAILS` to your email. Redeploy.

How sync works: every change is recorded locally (in the same database transaction) and uploaded; changes from other devices are downloaded on open, every minute while open, and a few seconds after you edit. If two devices change the same item, the newest change wins (also enforced by the database). Completions and XP use deterministic ids, so the same check-off made offline on two phones counts once. First sign-in merges what's on the device with the cloud copy without deleting anything. Signing out keeps local data. **Data → Delete all data** lets you choose this device only or everywhere.

Supabase's built-in email sender is rate-limited (a few emails per hour), which is fine for one person; connect your own SMTP in Supabase if you need more.

## Optional AI coach (Claude)
Without configuration the Coach runs **Insights Mode** (rule-based, offline, no AI).

The live coach calls the Anthropic API from the server only (`@anthropic-ai/sdk`, streaming, default model `claude-opus-5-5`, server-side refusal fallback enabled). It answers only when `ANTHROPIC_API_KEY` is set **and** the request comes from a verified Supabase session whose email is in `ALLOWED_EMAILS`. For local development you can instead set `COACH_DEV_LOCALHOST=true` with `npm run dev` on localhost. Every other request gets 403, so a deployment is never an open proxy for your key. Choose which data categories it may see in Settings (all off by default), pick them per conversation, and preview the exact text before sending. Suggested tasks or habits need your confirmation. Requests are size-limited and rate-limited.

## Reminders when the app is closed (Web Push)
Needs cloud sync (the server must know your reminder times) plus:
1. `npm run vapid`, then set `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT=mailto:you@…`.
2. `SUPABASE_SERVICE_ROLE_KEY` (Supabase → Project Settings → API → service_role; server-only) and a random `CRON_SECRET`.
3. A scheduler that calls `GET https://<your-app>/api/push/dispatch` with header `Authorization: Bearer <CRON_SECRET>` **every 5–10 minutes**. A free option is cron-job.org (add the header under Advanced). Vercel Cron also works on paid plans; the Hobby plan only allows daily jobs, which is too infrequent for reminders.

The job sends habit reminder times and task due times (in your timezone) that fell in the last 15 minutes, once each, and drops subscriptions the browser has expired. Delivery timing is up to Apple/Google and can be a few minutes late.

## Testing the cloud features locally
`npm run test:cloud` starts a local Supabase-compatible stack in Docker (Supabase Postgres, Supabase Auth/GoTrue, PostgREST, a mail catcher; see `scripts/cloud-stack/`) and runs real sign-in, two-device sync, allowlist refusal and push-subscription tests against it. It needs Docker and a gateway: run `node scripts/cloud-stack/gateway.mjs &` first. `scripts/cloud-stack/down.sh` removes the containers. `supabase/tests/` holds SQL checks for the row-level-security policies.

## PWA
`public/manifest.webmanifest`, original icons, and `public/sw.js` (production only) cache the app shell and static assets for offline use. API requests are never cached. Browsers can't block other apps, guarantee background notifications, or integrate with Screen Time, and this app doesn't claim to.
