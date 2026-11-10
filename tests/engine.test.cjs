// Engine tests: node tests/engine.test.cjs
const assert = require('node:assert/strict');
const MX = require('./load.cjs');
let pass = 0, fail = 0;
function t(name, fn) { try { fn(); pass++; console.log('  ✓ ' + name); } catch (e) { fail++; console.log('  ✗ ' + name + '\n    ' + (e && e.message)); } }

const TODAY = '2026-11-10'; // Tuesday
function fresh(mut) { const s = MX.defaultState(); s.onboarded = true; s.profile.name = 'T'; if (mut) mut(s); return s; }
let n = 0;
function qlog(s, qid, date, makes, att, extra) { s.logs.push(Object.assign({ id: 'l' + (n++), kind: 'quest', qid, date, ts: n, makes, att, dur: MX.QUEST[qid].dur }, extra || {})); }
function rec(s, ctx) { return MX.recommend(s, Object.assign({ key: TODAY, nowMin: 8 * 60, minutes: 45, loc: 'auto', partner: false }, ctx)); }
function allRecs(r) { return [r.main].concat(r.alts).concat(r.all); }

console.log('Data integrity');
t('no integrity errors', () => assert.deepEqual(MX.integrity(), []));
t('every tree has 13 nodes incl. boss', () => MX.TREES.forEach(tr => assert.equal(tr.nodes.length, 13)));
t('targets sum to 1 and respect 45/25', () => { const tg = MX.targets(MX.defaultProfile()); const sum = Object.values(tg).reduce((a, b) => a + b, 0); assert.ok(Math.abs(sum - 1) < 1e-9); assert.equal(tg.sep, 0.45); assert.equal(tg.sht, 0.25); });

console.log('Scheduling');
t('weekly events appear on the right weekday', () => { const s = fresh(); const ev = MX.eventsOn(s, TODAY); assert.ok(ev.some(e => e.type === 'practice')); });
t('skip a single date of a weekly event', () => { const s = fresh(); const p = MX.eventsOn(s, TODAY).find(e => e.type === 'practice'); s.schedule.skips[p.id] = { [TODAY]: true }; assert.ok(!MX.eventsOn(s, TODAY).some(e => e.id === p.id)); assert.ok(MX.eventsOn(s, MX.addDays(TODAY, 7)).some(e => e.id === p.id)); });
t('one-time event only on its date', () => { const s = fresh(); s.schedule.events.push({ id: 'x', type: 'game', title: 'Tourney', date: '2026-11-15', start: '09:00', end: '10:00', repeat: 'once' }); assert.ok(MX.eventsOn(s, '2026-11-15').some(e => e.id === 'x')); assert.ok(!MX.eventsOn(s, '2026-11-22').some(e => e.id === 'x')); });

console.log('Recommendations');
t('no court today -> no court/hoop quests', () => {
  const s = fresh(s => { s.schedule.events = s.schedule.events.filter(e => e.type !== 'court'); s.profile.homeHoop = false; });
  const r = rec(s); allRecs(r).forEach(c => { if (c.kind === 'quest') assert.ok(!['court', 'hoop'].includes(c.q.space), c.q.id + ' needs a court'); });
});
t('no weight room -> no gym-only workouts', () => {
  const s = fresh(s => { s.profile.gymAccess = false; });
  const r = rec(s, { key: '2026-11-09' }); // Monday (gym window in default schedule)
  allRecs(r).forEach(c => { if (c.kind === 'gym') assert.notEqual(c.w.where, 'gym'); });
});
t('gym access window allows gym workouts', () => { const s = fresh(); const r = rec(s, { key: '2026-11-09', nowMin: 15 * 60 }); assert.ok(r.all.some(c => c.kind === 'gym' && c.w.where === 'gym')); });
t('solo -> no partner quests', () => { const s = fresh(); allRecs(rec(s, { key: '2026-11-09' })).forEach(c => { if (c.kind === 'quest') assert.equal(c.q.partner, 0, c.q.id); }); });
t('partner available -> partner quests can appear', () => { const s = fresh(); const r = rec(s, { key: '2026-11-09', partner: true }); assert.ok(r.all.some(c => c.kind === 'quest' && c.q.partner > 0)); });
t('very fatigued -> recovery main, no load', () => {
  const s = fresh(s => { s.readiness['2026-11-09'] = { level: 'very', sore: 'none' }; });
  const r = rec(s, { key: '2026-11-09' });
  const m = r.main; assert.ok(m.kind === 'mission' || m.q.load === 0, 'main ' + (m.id));
  allRecs(r).forEach(c => { if (c.kind === 'quest') assert.ok(c.q.load <= 0 || c === r.main, c.q.id); if (c.kind === 'gym') assert.fail('gym offered while very fatigued'); });
});
t('game tomorrow -> no moderate/heavy leg work', () => {
  const s = fresh(); const r = rec(s, { key: '2026-11-12', nowMin: 18 * 60 }); // Thursday, game Friday
  assert.ok(r.notes.some(x => /Game tomorrow/.test(x)));
  r.all.forEach(c => { const legs = c.kind === 'gym' ? c.w.legs : c.q.legs; assert.ok(MX.legsRank(legs) <= 1, c.id + ' legs ' + legs); });
});
t('game today -> game mission first', () => { const s = fresh(); const r = rec(s, { key: '2026-11-13', nowMin: 9 * 60 }); assert.equal(r.main.kind, 'mission'); assert.equal(r.main.q.type, 'game'); });
t('practice later today -> practice mission first, light alternatives', () => { const s = fresh(); const r = rec(s, { key: TODAY, nowMin: 9 * 60 }); assert.equal(r.main.kind, 'mission'); r.all.forEach(c => assert.ok((c.kind === 'gym' ? c.w.load : c.q.load) <= 1)); });
t('heavy recent load caps intensity', () => {
  const s = fresh(); ['2026-11-07', '2026-11-08'].forEach(d => { qlog(s, 'cond-repeat', d, 5, 6); qlog(s, 'sep-first', d, 15, 20); qlog(s, 'bh-cone', d, 15, 20); });
  const r = rec(s, { key: '2026-11-09', nowMin: 15 * 60 }); assert.ok(r.caps.maxLoad <= 1, 'cap ' + r.caps.maxLoad);
});
t('recent heavy-leg gym session blocks another', () => {
  const s = fresh(); s.logs.push({ id: 'g1', kind: 'gym', wid: 'w-foundA', date: '2026-11-08', ts: 1, dur: 40, ex: [] });
  const r = rec(s, { key: '2026-11-09', nowMin: 15 * 60 }); r.all.forEach(c => { if (c.kind === 'gym') assert.ok(MX.legsRank(c.w.legs) < 2, c.w.id); });
});
t('pain flag -> no training load', () => { const s = fresh(s => { s.readiness['2026-11-09'] = { level: 'fresh', pain: true }; }); const r = rec(s, { key: '2026-11-09' }); assert.ok(r.notes.some(x => /healthcare/.test(x))); assert.equal(r.caps.maxLoad, 0); });
t('short time window filters long quests', () => { const s = fresh(); rec(s, { key: '2026-11-09', minutes: 10 }).all.forEach(c => assert.ok((c.kind === 'gym' ? c.w.dur : c.q.dur) <= 15)); });
t('locked advanced quests are not recommended', () => { const s = fresh(); const r = rec(s, { key: '2026-11-09', partner: true }); const tr = MX.computeTree(s).nodes; r.all.forEach(c => { if (c.kind === 'quest' && c.q.nodes.length) assert.ok(c.q.nodes.some(nn => tr[nn].unlocked), c.q.id); }); });
t('primary specialization dominates a fresh recommendation', () => { const s = fresh(); const r = rec(s, { key: '2026-11-09', nowMin: 15 * 60 }); const top = r.all.slice(0, 5).map(c => c.kind === 'gym' ? 'str' : c.q.skill); assert.ok(top.includes('sep'), top.join(',')); });
t('recommendation explains itself', () => { const s = fresh(); const r = rec(s, { key: '2026-11-09', nowMin: 15 * 60 }); assert.ok(r.main.why.length > 0); });

console.log('Evidence, tiers, unlocks');
t('foundation nodes start unlocked, others locked', () => { const tr = MX.computeTree(fresh()).nodes; assert.equal(tr['sep.a1'].tier, 'available'); assert.equal(tr['sep.b1'].tier, 'locked'); });
t('benchmark needs 3 hits on 2+ days (one day is not enough)', () => {
  const s = fresh(); for (let i = 0; i < 4; i++) qlog(s, 'sep-first', TODAY, 18, 20);
  assert.equal(MX.computeTree(s).nodes['sep.a1'].tier, 'practicing');
  qlog(s, 'sep-first', '2026-11-11', 18, 20);
  assert.equal(MX.computeTree(s).nodes['sep.a1'].tier, 'benchmark');
});
t('below-benchmark sessions do not count as hits', () => { const s = fresh(); ['2026-11-01', '2026-11-03', '2026-11-05'].forEach(d => qlog(s, 'sep-first', d, 8, 20)); assert.equal(MX.computeTree(s).nodes['sep.a1'].tier, 'practicing'); });
t('benchmark on prerequisite unlocks child', () => { const s = fresh(); ['2026-11-01', '2026-11-03', '2026-11-05'].forEach(d => qlog(s, 'sep-first', d, 18, 20)); const tr = MX.computeTree(s).nodes; assert.ok(tr['sep.b1'].unlocked); assert.ok(tr['sep.b2'].unlocked); });
t('need:2 prerequisite requires both', () => { const s = fresh(); s.logs.push(...['2026-11-01', '2026-11-03', '2026-11-05'].map((d, i) => ({ id: 'g' + i, kind: 'gym', wid: 'w-home', date: d, ts: i, ex: [{ id: 'boxsquat', done: true, tech: 'solid' }] }))); const tr = MX.computeTree(s).nodes; assert.equal(tr['str.a1'].tier, 'benchmark'); assert.ok(!tr['str.b3'].unlocked); });
t('baseline test-out unlocks advanced nodes for experienced players', () => { const s = fresh(); qlog(s, 'fin-5spot', TODAY, 17, 20); const tr = MX.computeTree(s).nodes; assert.ok(tr['fin.b1'].unlocked && tr['fin.b2'].unlocked && tr['fin.c1'].unlocked); });
t('test-out does not cascade into children (no level skipping)', () => { const s = fresh(); qlog(s, 'fin-5spot', TODAY, 17, 20); const tr = MX.computeTree(s).nodes; assert.ok(tr['fin.c1'].unlocked); assert.ok(!tr['fin.d2'].unlocked && !tr['fin.d3'].unlocked); });
t('prove-it test-out requires bench+10%', () => { const s = fresh(); qlog(s, 'sep-hipline', TODAY, 15, 20, { testOut: 'sep.b1' }); assert.ok(!MX.computeTree(s).nodes['sep.b1'].unlocked); qlog(s, 'sep-hipline', TODAY, 17, 20, { testOut: 'sep.b1' }); assert.ok(MX.computeTree(s).nodes['sep.b1'].unlocked); });
t('pressure tier needs stage-2 hits', () => { const s = fresh(); qlog(s, 'fin-5spot', '2026-11-01', 17, 20); ['2026-11-02', '2026-11-04', '2026-11-06'].forEach(d => qlog(s, 'fin-angles', d, 15, 20)); assert.equal(MX.computeTree(s).nodes['fin.c1'].tier, 'pressure'); });
t('game tier only from game reports naming the node', () => {
  const s = fresh(); const tr0 = MX.computeTree(s).nodes; assert.ok(!tr0['sep.d1'].unlocked);
  s.logs.push({ id: 'r1', kind: 'game', date: '2026-11-01', reports: [{ skill: 'sep', result: 'worked', node: 'sep.d1' }] }, { id: 'r2', kind: 'game', date: '2026-11-03', reports: [{ skill: 'sep', result: 'worked', node: 'sep.d1' }] });
  assert.equal(MX.computeTree(s).nodes['sep.d1'].tier, 'locked'); // evidence held while locked
  assert.equal(MX.computeTree(s).nodes['sep.d1'].evTier, 'game');
});
t('boss locked until 2 applied nodes benchmark', () => { const s = fresh(); assert.ok(!MX.computeTree(s).nodes['fin.boss'].unlocked); assert.ok(!rec(s, { key: '2026-11-09', nowMin: 900, minutes: 60 }).all.some(c => c.q && c.q.type === 'boss')); });

console.log('XP, records, achievements');
t('same quest twice in a day earns XP once', () => { const s = fresh(); qlog(s, 'sht-form', TODAY, 20, 30); const a = MX.progress(s, TODAY).xp; qlog(s, 'sht-form', TODAY, 20, 30); assert.equal(MX.progress(s, TODAY).xp, a); });
t('daily XP cap enforced', () => { const s = fresh(); MX.QUESTS.filter(q => q.measure.kind === 'makes' && q.type !== 'boss').forEach(q => qlog(s, q.id, TODAY, 1, 10)); const p = MX.progress(s, TODAY); assert.ok(p.dayXp[TODAY] <= p.dailyCap); });
t('PR requires a previous result and full-size session', () => { const s = fresh(); qlog(s, 'sht-form', '2026-11-01', 15, 30); qlog(s, 'sht-form', '2026-11-02', 29, 30); qlog(s, 'sht-form', '2026-11-03', 6, 6); const p = MX.progress(s, TODAY); assert.equal(p.prs.length, 1); });
t('deleting a log removes its XP', () => { const s = fresh(); const x0 = MX.progress(s, TODAY).xp; qlog(s, 'sht-form', TODAY, 20, 30); s.logs.pop(); assert.equal(MX.progress(s, TODAY).xp, x0); });
t('specialization change never alters progress', () => { const s = fresh(); ['2026-11-01', '2026-11-03', '2026-11-05'].forEach(d => qlog(s, 'sep-first', d, 18, 20)); const a = MX.progress(s, TODAY); s.profile.primary = 'def'; s.profile.secondary = 'cond'; const b = MX.progress(s, TODAY); assert.equal(a.xp, b.xp); assert.deepEqual(a.achieved, b.achieved); assert.equal(a.tree.nodes['sep.a1'].tier, b.tree.nodes['sep.a1'].tier); });
t('achievement first-session awarded once', () => { const s = fresh(); qlog(s, 'sht-form', TODAY, 20, 30); qlog(s, 'bh-pound', TODAY, 8, 10); const p = MX.progress(s, TODAY); assert.equal(p.ledger.filter(x => x.label === 'Achievement: Tip-Off').length, 1); });
t('level curve monotonic', () => { for (let L = 1; L < 30; L++) assert.ok(MX.xpForLevel(L + 1) > MX.xpForLevel(L)); assert.equal(MX.levelInfo(0).level, 1); assert.equal(MX.levelInfo(100).level, 2); });
t('rest days give small XP and never penalize', () => { const s = fresh(); s.logs.push({ id: 'r', kind: 'rest', date: TODAY }); assert.equal(MX.progress(s, TODAY).xp > 0, true); });

console.log('Insights');
t('no insight from one poor session', () => { const s = fresh(); qlog(s, 'fin-weak', TODAY, 2, 24); assert.equal(MX.insights(s, TODAY).length, 0); });
t('separation good + applied finishing poor -> hypothesis', () => {
  const s = fresh(); ['2026-11-01', '2026-11-03', '2026-11-05'].forEach(d => qlog(s, 'sep-first', d, 16, 20)); ['2026-11-02', '2026-11-06'].forEach(d => qlog(s, 'fin-race', d, 5, 16));
  const i = MX.insights(s, TODAY).find(x => x.id === 'conv'); assert.ok(i); assert.equal(i.kind, 'hypothesis'); assert.ok(/Separation/.test(i.evidence));
  const r = rec(s, { key: '2026-11-09', nowMin: 15 * 60 }); assert.ok(r.all.slice(0, 4).some(c => c.q && i.quest.includes(c.q.id)), 'insight quest should rank high');
});
t('dismissed insight stays hidden until date', () => { const s = fresh(); ['2026-11-01', '2026-11-03', '2026-11-05'].forEach(d => qlog(s, 'sep-first', d, 16, 20)); ['2026-11-02', '2026-11-06'].forEach(d => qlog(s, 'fin-race', d, 5, 16)); s.insights.conv = { until: '2026-11-20' }; assert.ok(!MX.insights(s, TODAY).some(x => x.id === 'conv')); });

console.log('Weight room');
t('missing equipment swaps exercises', () => { const s = fresh(s => { s.profile.equipment = []; }); const r = MX.resolveWorkout(s, MX.WORKOUT['w-foundA']); assert.ok(r.subs.length > 0); assert.ok(r.items.every(it => MX.EXERCISE[it.id].equip.length === 0)); });
t('supervised workout blocked without supervision', () => { const s = fresh(); assert.equal(MX.resolveWorkout(s, MX.WORKOUT['w-strength']).ok, false); });
t('progression only after two solid sessions at manageable effort', () => {
  const s = fresh(); s.logs.push({ id: 'a', kind: 'gym', wid: 'w-foundA', date: '2026-11-01', rpe: 7, ex: [{ id: 'goblet', done: true, tech: 'solid' }] });
  assert.equal(MX.progressionHint(s, 'goblet').kind, 'hold');
  s.logs.push({ id: 'b', kind: 'gym', wid: 'w-foundA', date: '2026-11-04', rpe: 7, ex: [{ id: 'goblet', done: true, tech: 'solid' }] });
  assert.equal(MX.progressionHint(s, 'goblet').kind, 'up');
});

console.log('Persistence model');
t('migrate fills missing fields and drops bad logs', () => { const m = MX.migrate({ profile: { name: 'A' }, logs: [{ id: 'x', date: TODAY, kind: 'rest' }, null, { foo: 1 }] }); assert.equal(m.profile.name, 'A'); assert.equal(m.logs.length, 1); assert.ok(m.schedule.events); });

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
