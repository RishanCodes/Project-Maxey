# Implemented features

Status key: **Works** (implemented and exercised by tests or manual checks) · **Needs configuration** · **Not implemented / deferred**.

## Works
- **Local-first storage** (IndexedDB via Dexie), schema-validated, offline-capable.
- **Onboarding**: 5 chapters, about 25–36 questions depending on answers (sports and academic branches), one question per screen, saved after every answer, resumes after reload, "Start with defaults", retake from Settings. Results: profile summary from stated facts, 2–3 priority areas, drafted starter habits and repeating tasks with reasons, a draft weekly rhythm built around stated commitments, a next action. Nothing is created until approved; re-approving updates instead of duplicating.
- **Today**: time-of-day greeting in the user's timezone, one hero card (chosen in onboarding/settings, with fallbacks), completion bar with its explanation, up to three priority rows with complete/undo, compact summary, one rule-based insight with "Why this suggestion?", empty state.
- **Plan**: Day view (date strip, search, priority filter, show/hide completed, reorder, overdue, anytime tasks), Week view, Habits (flexible streaks, weekly progress, pause/resume/archive), Routines (ordered steps, days, one-tap completion). Task CRUD with repeat rules (once/daily/weekly days), tags, priority, goal link, duration.
- **Habits**: daily, specific weekdays, N times per week; pauses and rest marks are neutral; per-date unique completions.
- **Training**: log or plan sessions (activity, type, date/time, minutes, effort/energy/soreness, focus areas with custom tags, notes), drill/workout builder, shot log with correct percentages, copy to today, filters, weekly-minutes chart, load summary with a non-diagnostic dense-week prompt, post-log feedback.
- **Recovery**: optional daily check-in (sleep, quality, energy, mood, soreness, rest day, note), 14-day averages with sample-size notes, judgment-free meal journal (no calories or targets).
- **Goals**: milestones, optional deadline, linked habits, linked tasks, progress from milestones or clearly labeled manual progress, complete/reopen.
- **Focus**: timestamp-based timer (survives navigation, backgrounding and reload), pause/resume, stop without recording, completed sessions recorded once.
- **Journal**: dated entries with tags, search, edit, delete; private by default.
- **Coach (Insights Mode)**: rule-based insights in the format "what your logs show / what it may mean / next action / what the data can't tell", with evidence; deterministic answers to three example questions; weekly review.
- **Growth**: week/month/90-day ranges, one overview chart with stated denominators, metric rows, deeper charts behind a toggle, level/XP with categories and an explanation, achievements.
- **XP and achievements**: ledger with stable keys, idempotent awards, exact reversals on undo/delete, daily cap; achievements unlock once from real records.
- **Backup**: export, validated import with merge or replace, delete-all with typed confirmation, persistent-storage request.
- **Settings**: name, app name, timezone, week start, home card, gamification visibility, coaching tone, focus/break lengths, weekly review, reminders, AI data consent per category, onboarding retake, account/cloud status.
- **PWA**: manifest, original icons, offline shell service worker (never caches `/api`).
- **Accessibility**: skip link, labeled controls, dialogs with focus trap and focus return, visible focus, reduced motion, 44px targets.

## Needs configuration
- **Live AI Coach**: needs `ANTHROPIC_API_KEY`, `npm run dev`, `COACH_DEV_LOCALHOST=true`, and a localhost request (see README). Streaming chat, context selection, data preview, editable history, confirm-before-apply proposals. Not exercised against the real API in this build (no key was available); the disabled path is tested.
- **Habit reminders**: best-effort browser notifications while the app is open, after permission is granted.

## Not implemented / deferred
- **Cloud mode / Supabase sync and authentication**: not built. The app says so in Settings, and live AI stays disabled on deployments because of it.
- **Calendar-aware rescheduling suggestions** for existing tasks (beyond the onboarding rhythm): deferred.
- **Push notifications** when the app is closed: not possible without a push server; not built.
