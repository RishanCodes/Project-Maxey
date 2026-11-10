# Project Maxey: Ascension

A mobile-first basketball player-development RPG that runs as a single Claude Artifact page. Scheduling, skill quests, weight-room work, evidence-based skill trees, game-transfer tracking, recovery and RPG progression all feed one system.

## Layout

| Path | What it holds |
| --- | --- |
| `src/data-trees.js` | 8 skill categories and 8 skill trees (4–5 branches × 3 nodes + 1 boss = 107 nodes), prerequisites, goals, cross-tree links |
| `src/data-quests.js` | 86 quests: skill quests, baselines, boss challenges, contact finishing, explosiveness drills, team/game missions, film study, conditioning, recovery |
| `src/data-gym.js` | 29 exercises, 6 workout templates, achievements, level titles, starter schedule, event types |
| `src/engine.js` | Pure logic: schedule, workload, evidence → node tiers, XP ledger, insights (weakness detection), recommendation engine, integrity checks |
| `src/planner.js` | Session builder (fills your time with ordered blocks), week builder, workout focus, swaps, time slots |
| `src/store.js` | Persistence: Claude account storage (`db` capability), browser storage cache, export/import |
| `src/ui-a.js`, `ui-b.js`, `ui-c.js` | UI (vanilla JS, no framework): shell, onboarding, home, logging flows, train, progress, schedule, profile |
| `src/styles.css` | Visual system |
| `build.mjs` | Bundles everything into `dist/index.html` (the published artifact) |

## Build and test

```sh
node build.mjs                 # -> dist/index.html
node tests/engine.test.cjs     # 90 engine tests (recommendations, tiers, XP, insights, gym, contact, explosiveness, session/week builder, legacy saves)
node tests/e2e.cjs [outdir]    # Playwright UI flow at phone width (needs the `playwright` package and Chromium)
```

## Design rules the code enforces

- **Progress is derived, not stored.** Node tiers, XP, personal records and achievements are recomputed from the log history every time. Rewards cannot be duplicated, and deleting a log removes exactly what it earned.
- **Evidence tiers.** Unlocked → Practicing → Benchmark (3 sessions at the quest benchmark on 2+ days) → Applied under pressure (2 benchmark sessions in stage-2 quests) → Game-applied (2 "worked" game reports naming the node, on 2+ days). XP never grants a tier.
- **No level skipping.** Baselines and "Prove it" attempts can unlock a node early for experienced players, but children still need benchmark evidence on it.
- **Drill vs game.** Technique drills, applied drills and self-reported game results are tracked and shown separately; no combined rating is invented.
- **XP limits.** One XP award per activity per day, daily cap of 250, PRs only on full-size sessions with a previous result to beat.
- **Workload.** Practices and games count as load. Very fatigued, pain, game tomorrow/today, practice later, heavy recent load and recent leg strength sessions all cap what is recommended. Rest is always available and never penalized.
- **Specialization** re-weights recommendations (about 45/25/30) and never resets progress.
- **Contact finishing** (Finishing tree): balance and body control → finishing through controlled contact → live play. Contact is only through a pad or a vertical defender, on the floor, at the gather, controlled by the partner; never shoving, never in the air. Every partner drill has a solo alternative.
- **Explosiveness** (Strength & explosiveness tree): acceleration, jumping and landing, deceleration and change of direction, scored on quality with low volume. Explosive drills are only recommended on fresh days with no practice that day, no game today or tomorrow, no heavy recent load and no leg-heavy session in the last 48 hours.
- **Session builder**: fills the chosen time with warm-up → explosiveness → skill work (technique before applied) → conditioning → strength → cool-down, using the same filters as single recommendations. At most one leg-heavy block, one weight-room block and one conditioning block; sessions are capped at 35 min the day before a game or before practice, and 25 min of recovery when very fatigued.
- **Week builder**: plans each remaining day of the week. Practice and game days get missions (plus a light optional extra on practice days), at least one full rest day when 4+ days remain, up to two non-adjacent strength/explosiveness days never the day before a game, and later days account for earlier days' planned load and variety. Days with completed work are kept on rebuild. Every day is editable (focus, length, swap, remove, rest).
- **Workout focus**: Balanced (45/25/30), Primary only, Secondary only, or any one skill. A single-skill focus keeps only work that mainly trains that skill; if nothing fits it says so rather than filling with other skills.
- **Plans don't award anything**: XP and progress come only from logs; a block is complete when a log carries its id.
- **Legacy saves**: `tests/fixtures/v1-save.json` is a save made before these additions; tests confirm it keeps every unlock, mastery, achievement and its XP.

## Saving

1. Signed-in viewers: saved privately to their Claude account (`data/users/<id>/`, one core document plus one document per month of logs).
2. Browser storage: an instant-start cache and fallback.
3. Export/import of a JSON save as a manual backup.

The Profile screen shows which of these is actually working in the current view.
