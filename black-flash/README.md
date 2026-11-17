# BLACK FLASH — Personal Performance OS

A private, mobile-first web app for one person: today's focus, tasks, habits, routines, training, recovery, goals, focus timer, journal, rule-based coaching and honest progression. **Local First**: everything works offline with no account and no API key.

## Prerequisites
- Node.js 20.9+ (tested on Node 22) and npm.

## Run it
```sh
npm install
npm run dev          # http://localhost:3000 (development)
npm run build && npm start   # production build on http://localhost:3000
```
Open on an iPhone on the same network with `npm start -- -H 0.0.0.0` and visit `http://<computer-ip>:3000`. Add to Home Screen from Safari's share menu to install it as an app.

## Scripts
| Command | What it does |
| --- | --- |
| `npm run typecheck` | TypeScript, no emit |
| `npm run lint` | ESLint (Next.js core-web-vitals + TypeScript rules) |
| `npm test` | Vitest unit tests (dates/timezones, recurrence, streaks, XP idempotence and cap, focus timer, onboarding branching and dedupe, backups, insights) |
| `npm run test:e2e` | Playwright journeys on an iPhone viewport against `next start` (run `npm run build` first; install a browser with `npx playwright install chromium` if you don't have one) |
| `npm run check` | typecheck + lint + unit tests + build |
| `npm run icons` | Re-render PNG icons from `public/icons/icon.svg` |

## Architecture
- `src/lib/schema.ts` — Zod schemas for every record (also used to validate backups). Schema version 1.
- `src/lib/db.ts` — Dexie (IndexedDB) storage. Add a new `version(n)` with an upgrade for schema changes.
- `src/lib/repo.ts` — the only write path: tasks, habits, routines, goals, training, check-ins, meals, focus timer, journal. Keeps XP and achievements consistent.
- `src/lib/recurrence.ts`, `dates.ts` — local-date math, recurring tasks, habit schedules, flexible streaks.
- `src/lib/stats.ts`, `insights.ts` — every displayed metric, derived from records (never stored totals).
- `src/lib/onboarding.ts`, `approval.ts` — adaptive question bank and deterministic plan drafting; approval is deduplicated by seed keys.
- `src/lib/backup.ts` — export / validated import (merge or replace).
- `src/app/api/coach/route.ts` + `src/lib/server/coach-policy.ts` — optional server-side AI coach.
- `src/app/*` — screens: Today, Plan, Coach, Growth, Training, Recovery, Goals, Focus, Journal, Settings, Data, Onboarding.

## Data, backup and privacy
- Data lives in this browser's IndexedDB on this device. It survives reloads and offline use; it does **not** sync between devices, and it is lost if site data is cleared. The Data screen can ask the browser to mark storage persistent.
- **Export** writes a versioned JSON file with every record and id. **Import** validates the file first, then either merges (adds missing records, never duplicates completions) or replaces everything after confirmation.
- The journal is private and excluded from any AI context unless you enable it in Settings.

## XP rules (editable in `src/lib/config.ts`)
Task occurrence +10 · habit check +10 · training session +15 · check-in or planned rest day +10 · focus session +10 · goal milestone +30 · at most 120 XP per day. Each action has a stable key; one active award per key; undo appends a reversal of exactly what was awarded. XP is engagement, not ability.

## Optional AI coach (Claude)
Without configuration the Coach runs **Insights Mode** (rule-based, offline, no AI).

The live coach calls the Anthropic API from the server only (`@anthropic-ai/sdk`, streaming, default model `claude-opus-5-5`, server-side refusal fallback enabled). Because this build has **no user authentication**, the endpoint refuses every request unless all of these are true, so a deployment can never become an open proxy for your key:
1. `ANTHROPIC_API_KEY` is set on the server,
2. the app runs with `npm run dev`,
3. `COACH_DEV_LOCALHOST=true`,
4. the request's host is `localhost` / `127.0.0.1`.

```sh
cp .env.example .env.local   # then fill ANTHROPIC_API_KEY and set COACH_DEV_LOCALHOST=true
npm run dev
```
Then choose which categories the coach may see (Settings → AI coach, all off by default), pick them per conversation, and preview the exact text before sending. Suggestions to add tasks or habits require confirmation. Requests are size-limited and rate-limited (12/min per server process).

Enabling AI on a public deployment requires adding real authentication (for example Supabase Auth with a single allow-listed account) and changing `coach-policy.ts` to verify the session server-side. That is not implemented here.

## Deployment
Any Node host that runs `next start` (or Vercel). With no environment variables the deployed app is fully functional in Local First mode, and the AI endpoint stays disabled.

## PWA
`public/manifest.webmanifest`, original icons, and `public/sw.js` (production only) cache the app shell and static assets for offline use. API requests are never cached. Browsers can't block other apps, guarantee background notifications, or integrate with Screen Time, and this app doesn't claim to.
