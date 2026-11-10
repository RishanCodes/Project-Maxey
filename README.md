# Project Maxey: Ascension

A mobile-first basketball player-development RPG that runs as a single Claude Artifact page. Scheduling, skill quests, weight-room work, evidence-based skill trees, game-transfer tracking, recovery and RPG progression all feed one system.

## Layout

| Path | What it holds |
| --- | --- |
| `src/data-trees.js` | 8 skill categories and 8 skill trees (4 branches × 3 nodes + 1 boss = 104 nodes), prerequisites, goals, cross-tree links |
| `src/data-quests.js` | 76 basketball quests: skill quests, baselines, boss challenges, team/game missions, film study, conditioning, recovery |
| `src/data-gym.js` | 29 exercises, 6 workout templates, achievements, level titles, starter schedule, event types |
| `src/engine.js` | Pure logic: schedule, workload, evidence → node tiers, XP ledger, insights (weakness detection), recommendation engine, integrity checks |
| `src/store.js` | Persistence: Claude account storage (`db` capability), browser storage cache, export/import |
| `src/ui-a.js`, `ui-b.js`, `ui-c.js` | UI (vanilla JS, no framework): shell, onboarding, home, logging flows, train, progress, schedule, profile |
| `src/styles.css` | Visual system |
| `build.mjs` | Bundles everything into `dist/index.html` (the published artifact) |

## Build and test

```sh
node build.mjs                 # -> dist/index.html
node tests/engine.test.cjs     # 48 engine tests (recommendations, tiers, XP, insights, gym)
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

## Saving

1. Signed-in viewers: saved privately to their Claude account (`data/users/<id>/`, one core document plus one document per month of logs).
2. Browser storage: an instant-start cache and fallback.
3. Export/import of a JSON save as a manual backup.

The Profile screen shows which of these is actually working in the current view.
