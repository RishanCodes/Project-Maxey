# Implemented features

Status key: **Works** (implemented and exercised by tests) · **Needs configuration** (works once you set the environment variables in README) · **Limits** (things a web app can't do or that weren't verifiable here).

## Works (no configuration)
- **Local-first storage** (IndexedDB via Dexie, schema v2), validated with Zod, offline-capable.
- **Onboarding**: 5 chapters, about 25–36 adaptive questions, saved after every answer and resumed after reload, "Start with defaults", retake from Settings, approval-gated plan drafting without duplicates.
- **Today**: greeting in your timezone, one hero card (top priority, next workout, study, habits, or a **pinned goal**), explained completion bar, up to three priority rows with undo, summary line, one rule-based insight with "Why this suggestion?".
- **Plan**: Day/Week/Habits/Routines; task CRUD with repeat rules, tags, priority, goal link; search, filters, reorder; **Suggest times** (free slots around school/work hours, practices, planned training and timed tasks; keeps protected time; nothing changes until you apply; undo available).
- **Habits** (daily / weekdays / N per week, pause, archive, rest days, flexible streaks), **Routines**, **Training** (drills, shot log, load summary, chart), **Recovery** (check-ins, meal journal without calorie targets), **Goals** (milestones, linked habits/tasks, labeled manual progress, pin to Today), **Focus** timer (timestamp-based, recorded once), **Journal** (private).
- **Coach – Insights Mode**, **Growth** (ranges, overview chart with denominators, XP explainer, achievements), **XP ledger** (idempotent, reversible, daily cap), **Backup** (export, validated merge/replace import, delete), **Settings**, **PWA** (manifest, icons, offline shell), **accessibility** (skip link, labeled controls, dialog focus trap and return, reduced motion).

## Needs configuration
- **Cloud sign-in and sync (Supabase)**: email one-time code sign-in (works inside the installed iPhone app), single-account allowlist enforced by row-level security in the database and by the server, outbox-based change capture, last-write-wins merge enforced by the database, deterministic ids so offline double check-offs merge, XP reconciliation after merges, first-sign-in merge without deletion, sign-out keeps local data, delete this device vs everywhere.
  - Verified: SQL policies on Postgres 16 (owner can read and write; strangers can't read, write, update or delete; stale writes can't overwrite newer ones) and end-to-end on a local Supabase-compatible stack (Supabase Postgres + Supabase Auth + PostgREST): sign-in with an emailed code on two devices, sync both ways, XP counted once, allowlist refusal.
- **AI coach (Claude)**: works on a deployment for your verified, allow-listed session, or on localhost in development. Verified: access decisions (signed in vs anonymous vs not configured). Not verified: a real model reply, because no API key was available in the build environment.
- **Reminders when the app is closed (Web Push)**: habit reminder times and task due times, sent once each by a scheduled job; per-device subscribe/unsubscribe and a "Send a test" button. Verified: reminder timing and timezone logic, encrypted and VAPID-signed request building, expired-subscription handling, subscription storage under the signed-in user, job secret enforcement. Not verified: delivery to a physical phone (needs Apple's/Google's push service and a real device).
- **In-app habit reminders**: while the app is open, after allowing notifications.

## Limits
- A website can't block other apps, read Screen Time, or guarantee exact notification timing.
- On iPhone, Safari and the Home Screen app have separate storage: set up inside the installed app, or sign in to sync.
- Not tested on a physical iPhone; tested in an emulated iPhone viewport in Chromium.
