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
t('every tree has 4–5 full branches plus a boss', () => MX.TREES.forEach(tr => { assert.equal(tr.nodes.length, (tr.branches.length - 1) * 3 + 1); assert.equal(tr.nodes.find(n => n.boss).row, tr.branches.length - 1); }));
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
t('locked advanced quests are not recommended', () => { const s = fresh(); const r = rec(s, { key: '2026-11-09', partner: true }); const tr = MX.computeTree(s).nodes; r.all.forEach(c => { if (c.kind === 'quest' && c.q.nodes.length && !c.q.baseline) assert.ok(c.q.nodes.some(nn => tr[nn].unlocked), c.q.id); }); });
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


console.log('Contact finishing');
const legs3 = ['2026-11-01', '2026-11-03', '2026-11-05'];
t('contact branch exists inside Finishing with balance → contact → live play', () => { ['fin.e1', 'fin.e2', 'fin.e3'].forEach(id => assert.equal(MX.NODES[id].branch, 'Contact finishing')); assert.equal(MX.NODES['fin.e3'].goal, 'game'); assert.equal(MX.NODES['fin.e2'].goal, 'pressure'); });
t('contact branch unlocks from footwork, then in order', () => {
  const s = fresh(); let tr = MX.computeTree(s).nodes; assert.ok(!tr['fin.e1'].unlocked);
  legs3.forEach(d => qlog(s, 'fin-footwork', d, 18, 20)); tr = MX.computeTree(s).nodes; assert.ok(tr['fin.e1'].unlocked); assert.ok(!tr['fin.e2'].unlocked);
  legs3.forEach(d => qlog(s, 'fin-ct-balance', d, 18, 20)); tr = MX.computeTree(s).nodes; assert.equal(tr['fin.e1'].tier, 'benchmark'); assert.ok(tr['fin.e2'].unlocked); assert.ok(!tr['fin.e3'].unlocked);
  legs3.forEach(d => qlog(s, 'fin-ct-cue', d, 16, 20)); tr = MX.computeTree(s).nodes; assert.equal(tr['fin.e2'].tier, 'pressure'); assert.ok(tr['fin.e2'].mastered); assert.ok(tr['fin.e3'].unlocked);
  s.logs.push({ id: 'g1', kind: 'game', date: '2026-11-06', reports: [{ skill: 'fin', result: 'worked', node: 'fin.e3' }] }, { id: 'g2', kind: 'game', date: '2026-11-08', reports: [{ skill: 'fin', result: 'worked', node: 'fin.e3' }] });
  assert.equal(MX.computeTree(s).nodes['fin.e3'].tier, 'game');
});
t('every contact quest explains purpose and transfer, and partner versions have a solo alternative', () => {
  const cq = MX.QUESTS.filter(q => q.nodes.some(n => /^fin\.e/.test(n)));
  assert.ok(cq.length >= 6);
  cq.forEach(q => { assert.ok(q.purpose && q.transfer, q.id); if (q.partner) { assert.ok(q.alt, q.id + ' alt'); assert.equal(MX.QUEST[q.alt].partner, 0); } });
});
t('contact drills never include shoving or contact in the air', () => {
  MX.QUESTS.filter(q => q.nodes.some(n => /^fin\.e/.test(n)) && q.partner).forEach(q => { const txt = q.steps.join(' ').toLowerCase(); assert.ok(/no shoving/.test(txt) && /(never contact in the air|no contact once you leave the floor)/.test(txt), q.id); });
});
t('solo player gets contact quests, never partner contact quests', () => {
  const s = fresh(s => { s.profile.primary = 'fin'; }); legs3.forEach(d => qlog(s, 'fin-footwork', d, 18, 20)); legs3.forEach(d => qlog(s, 'fin-ct-balance', d, 18, 20));
  const r = rec(s, { key: '2026-11-09', nowMin: 15 * 60, partner: false });
  assert.ok(r.all.some(c => c.q && c.q.id === 'fin-ct-cue')); assert.ok(!r.all.some(c => c.q && (c.q.id === 'fin-contact' || c.q.id === 'fin-ct-live')));
  const r2 = rec(s, { key: '2026-11-09', nowMin: 15 * 60, partner: true }); assert.ok(r2.all.some(c => c.q && (c.q.id === 'fin-contact' || c.q.id === 'fin-ct-live')));
});

console.log('Explosiveness');
t('explosiveness branch covers acceleration, jump/land, decel and change of direction', () => { const names = ['str.c1', 'str.c2', 'str.c3', 'str.d1'].map(id => MX.NODES[id].name.toLowerCase()).join(' | '); ['accelerat', 'jump', 'landing', 'decelerat', 'change of direction'].forEach(w => assert.ok(names.includes(w), w)); });
const athKeys = () => MX.QUESTS.filter(q => q.type === 'athletic').map(q => q.id);
t('explosiveness drills have measurable benchmarks', () => { athKeys().forEach(id => { const q = MX.QUEST[id]; assert.equal(q.measure.kind, 'makes'); assert.ok(q.bench > 0 && q.measure.att > 0); assert.ok(q.prog && q.regr && q.equipText); }); });
t('fresh, free day -> explosiveness offered (baseline first)', () => { const s = fresh(s => { s.readiness['2026-11-09'] = { level: 'fresh', sore: 'none' }; }); const r = rec(s, { key: '2026-11-09', nowMin: 15 * 60 }); assert.ok(r.all.some(c => c.q && c.q.id === 'ath-land')); assert.ok(!r.all.some(c => c.q && c.q.id === 'ath-jump'), 'jumps wait for landing node'); });
t('practice day -> no explosiveness work', () => { const s = fresh(); const r = rec(s, { key: TODAY, nowMin: 18 * 60 }); r.all.forEach(c => { assert.ok(!(c.q && c.q.type === 'athletic'), c.id); assert.ok(!(c.w && c.w.explosive), c.id); }); });
t('day before a game -> no explosiveness work', () => { const s = fresh(); rec(s, { key: '2026-11-12', nowMin: 18 * 60 }).all.forEach(c => assert.ok(!(c.q && c.q.type === 'athletic'))); });
t('tired -> no explosiveness work', () => { const s = fresh(s => { s.readiness['2026-11-09'] = { level: 'tired', sore: 'none' }; }); rec(s, { key: '2026-11-09', nowMin: 15 * 60 }).all.forEach(c => assert.ok(!(c.q && c.q.type === 'athletic'))); });
t('heavy recent load -> no explosiveness work', () => { const s = fresh(); ['2026-11-07', '2026-11-08'].forEach(d => { qlog(s, 'cond-repeat', d, 5, 6); qlog(s, 'sep-first', d, 15, 20); }); rec(s, { key: '2026-11-09', nowMin: 15 * 60 }).all.forEach(c => assert.ok(!(c.q && c.q.type === 'athletic'))); });
t('landing baseline at 90%+ unlocks jump-and-land node and then approach jumps', () => {
  const s = fresh(); qlog(s, 'ath-land', '2026-11-08', 14, 15);
  assert.ok(MX.computeTree(s).nodes['str.c1'].unlocked);
  const r = rec(s, { key: '2026-11-09', nowMin: 15 * 60, minutes: 30 }); assert.ok(r.all.some(c => c.q && c.q.id === 'ath-jump'));
});
t('explosiveness drills alone can master the branch', () => {
  const s = fresh(); qlog(s, 'ath-land', '2026-10-30', 14, 15);
  legs3.forEach(d => { qlog(s, 'ath-land', d, 14, 15); qlog(s, 'ath-decel', d, 11, 12); qlog(s, 'ath-jump', d, 9, 9); });
  s.logs.push(...legs3.map((d, i) => ({ id: 'w' + i, kind: 'gym', wid: 'w-home', date: d, ts: i, ex: [{ id: 'split', done: true, tech: 'solid' }, { id: 'deadbug', done: true, tech: 'solid' }] })));
  legs3.forEach(d => qlog(s, 'ath-accel', d, 7, 8));
  const tr = MX.computeTree(s).nodes; ['str.c1', 'str.c2', 'str.c3', 'str.d1'].forEach(id => assert.ok(tr[id].mastered, id + ' ' + tr[id].tier));
});
t('moderate-leg explosive drill blocks another within 48 h', () => { const s = fresh(); qlog(s, 'ath-land', '2026-11-05', 14, 15); qlog(s, 'ath-cod', '2026-11-08', 10, 12); assert.equal(MX.lastLegStrength(s, '2026-11-09'), '2026-11-08'); rec(s, { key: '2026-11-09', nowMin: 15 * 60 }).all.forEach(c => { if (c.q && c.q.type === 'athletic') assert.ok(MX.legsRank(c.q.legs) < 2, c.q.id); }); });
t('explosiveness counts toward strength assessment and XP once per day', () => { const s = fresh(); qlog(s, 'ath-decel', TODAY, 10, 12); const st = MX.skillStats(s, TODAY, 0); assert.equal(st.str.st1.att, 12); const x = MX.progress(s, TODAY).xp; qlog(s, 'ath-decel', TODAY, 10, 12); assert.equal(MX.progress(s, TODAY).xp, x); });


console.log('Session builder');
const MON = '2026-11-09';
const sess = (s, o) => MX.buildSession(s, Object.assign({ key: MON, nowMin: 15 * 60, minutes: 60, loc: 'auto', partner: false, focus: { mode: 'balanced' } }, o));
const work = (pl) => pl.blocks.filter(b => b.kind === 'quest' || b.kind === 'gym');
const total = (pl) => pl.blocks.reduce((t, b) => t + b.dur, 0);
const bSkill = (b) => b.kind === 'gym' ? 'str' : MX.QUEST[b.ref].skill;
t('fills the available time without going over', () => { const pl = sess(fresh()); assert.ok(total(pl) <= 60 && total(pl) >= 48, 'total ' + total(pl)); assert.equal(pl.blocks[0].kind, 'warmup'); assert.equal(pl.blocks[pl.blocks.length - 1].kind, 'cooldown'); });
t('balanced session covers primary and secondary', () => { const sk = work(sess(fresh())).map(bSkill); assert.ok(sk.includes('sep') && sk.includes('sht'), sk.join(',')); });
t('single-skill focus keeps only that skill', () => { const pl = sess(fresh(), { focus: { mode: 'secondary' } }); assert.ok(work(pl).length >= 2); work(pl).forEach(b => assert.ok(MX.QUEST[b.ref].skills.sht >= 0.5, b.ref)); });
t('strength focus uses weight-room and explosiveness work', () => { const pl = sess(fresh(), { focus: { mode: 'skill', skill: 'str' }, minutes: 45 }); assert.ok(work(pl).length >= 1); work(pl).forEach(b => assert.equal(bSkill(b), 'str')); });
t('focus with nothing available says so instead of mixing', () => { const s = fresh(s => { s.profile.openSpace = false; s.profile.homeHoop = false; }); const pl = sess(s, { loc: 'home', focus: { mode: 'skill', skill: 'def' } }); assert.equal(work(pl).length, 0); assert.ok(pl.notes.some(n => /No defense work fits/.test(n))); });
t('no duplicates, at most one leg-heavy and one weight-room block', () => { for (const m of [30, 45, 60, 90]) { const pl = sess(fresh(), { minutes: m }); const refs = work(pl).map(b => b.ref); assert.equal(new Set(refs).size, refs.length); assert.ok(work(pl).filter(b => b.kind === 'gym').length <= 1); assert.ok(work(pl).filter(b => MX.legsRank(b.kind === 'gym' ? MX.WORKOUT[b.ref].legs : MX.QUEST[b.ref].legs) >= 2).length <= 1); } });
t('solo session has no partner drills', () => { work(sess(fresh(), { minutes: 90 })).forEach(b => { if (b.kind === 'quest') assert.equal(MX.QUEST[b.ref].partner, 0); }); });
t('very fatigued -> short recovery session only', () => { const s = fresh(s => { s.readiness[MON] = { level: 'very' }; }); const pl = sess(s); assert.equal(pl.kind, 'recovery'); assert.ok(total(pl) <= 25); work(pl).forEach(b => assert.ok(['recovery', 'film'].includes(MX.QUEST[b.ref].type), b.ref)); });
t('day before a game -> light and no leg-heavy work', () => { const pl = sess(fresh(), { key: '2026-11-12', nowMin: 18 * 60 }); assert.ok(total(pl) <= 35); work(pl).forEach(b => assert.ok(MX.legsRank(b.kind === 'gym' ? MX.WORKOUT[b.ref].legs : MX.QUEST[b.ref].legs) <= 1)); });
t('rebuild keeps completed blocks', () => { const s = fresh(); const pl = sess(s); const b = work(pl)[0]; s.logs.push({ id: 'x', kind: b.kind === 'gym' ? 'gym' : 'quest', qid: b.ref, wid: b.ref, date: MON, ts: 1, plan: b.id, makes: 5, att: 10, ex: [] }); const pl2 = sess(s, { keep: pl.blocks.filter(x => MX.blockDone(s, x)) }); assert.ok(pl2.blocks.some(x => x.id === b.id)); assert.ok(total(pl2) <= 60); });
t('recommendation honours a single-skill focus', () => { const r = rec(fresh(), { key: MON, nowMin: 900, focus: { mode: 'skill', skill: 'bh' } }); assert.ok(r.main.q.skills.bh >= 0.5); r.alts.forEach(c => assert.ok(MX.candSkillWeight(c, 'bh') >= 0.5)); });

console.log('Week builder');
const wk = (s, o) => MX.buildWeek(s, Object.assign({ todayKey: MON, nowMin: 8 * 60, start: MON, end: '2026-11-15', focus: { mode: 'balanced' }, partner: false }, o));
t('plans every remaining day around practices and games', () => { const w = wk(fresh()); assert.equal(w.days.length, 7); assert.equal(w.plans['2026-11-10'].kind, 'practice'); assert.equal(w.plans['2026-11-13'].kind, 'game'); assert.ok(w.plans['2026-11-10'].blocks.some(b => b.kind === 'mission')); assert.ok(w.plans['2026-11-13'].blocks.some(b => b.kind === 'mission')); });
t('includes a full rest day', () => { const w = wk(fresh()); assert.ok(Object.values(w.plans).some(p => p.kind === 'rest')); });
t('strength days are non-adjacent and never the day before a game', () => { const w = wk(fresh()); assert.ok(w.strength.length >= 1 && w.strength.length <= 2); w.strength.forEach(k => { assert.ok(!MX.eventsOn(fresh(), MX.addDays(k, 1)).some(e => e.type === 'game')); assert.ok(!w.strength.includes(MX.addDays(k, 1))); }); });
t('no explosive or leg-heavy work on practice days or the day before the game', () => { const w = wk(fresh()); ['2026-11-10', '2026-11-12', '2026-11-13', '2026-11-14'].forEach(k => w.plans[k].blocks.forEach(b => { if (b.kind === 'quest') { assert.notEqual(MX.QUEST[b.ref].type, 'athletic', k); assert.ok(MX.legsRank(MX.QUEST[b.ref].legs) <= 1, k + ' ' + b.ref); } if (b.kind === 'gym') assert.fail('gym on ' + k); })); });
t('only plans from today forward', () => { const w = wk(fresh(), { todayKey: '2026-11-12' }); assert.deepEqual(w.days, ['2026-11-12', '2026-11-13', '2026-11-14', '2026-11-15']); });
t('adds variety across the week', () => { const w = wk(fresh()); const refs = Object.values(w.plans).flatMap(p => work(p).filter(b => !b.optional).map(b => b.ref)); assert.equal(new Set(refs).size, refs.length, refs.join(',')); });
t('week focus applies to every training day', () => { const w = wk(fresh(), { focus: { mode: 'primary' } }); Object.values(w.plans).filter(p => p.kind === 'session').forEach(p => work(p).forEach(b => assert.ok(MX.candSkillWeight(b.kind === 'gym' ? { kind: 'gym' } : { kind: 'quest', q: MX.QUEST[b.ref] }, 'sep') >= 0.5, b.ref))); });
t('existing strength work today blocks strength tomorrow', () => { const s = fresh(); s.logs.push({ id: 'g', kind: 'gym', wid: 'w-home', date: MON, ts: 1, dur: 25, ex: [] }); const w = wk(s, { start: MON }); assert.ok(!w.strength.includes('2026-11-10') && !w.strength.includes(MON)); });
t('the same workout is never planned on back-to-back days', () => { const w = wk(fresh()); w.days.forEach(k => { const n = MX.addDays(k, 1); if (!w.plans[n]) return; const a = work(w.plans[k]).filter(b => b.kind === 'gym').map(b => b.ref), b2 = work(w.plans[n]).filter(b => b.kind === 'gym').map(b => b.ref); a.forEach(r => assert.ok(!b2.includes(r), k)); }); });
t('rebuilding the week keeps days with completed work', () => { const s = fresh(); const w = wk(s); s.plans = w.plans; const b = work(w.plans[MON])[0]; s.logs.push({ id: 'd', kind: 'quest', qid: b.ref, date: MON, ts: 1, plan: b.id }); const w2 = wk(s); assert.equal(w2.plans[MON].id, w.plans[MON].id); });
t('swap offers different options within focus and keeps time accounting', () => { const s = fresh(); const pl = sess(s, { focus: { mode: 'secondary' } }); const b = work(pl)[0]; const opts = MX.swapOptions(s, pl, b.id, MON, 900); assert.ok(opts.length >= 1); opts.forEach(c => { assert.ok(!pl.blocks.some(x => x.ref === c.id)); assert.ok(MX.candSkillWeight(c, 'sht') >= 0.5); }); const before = total(pl) + pl.unused; MX.applySwap(pl, b.id, opts[0]); assert.equal(total(pl) + pl.unused, before); });
t('plans never change XP or progress by themselves', () => { const s = fresh(); qlog(s, 'sht-form', MON, 20, 30); const x = MX.progress(s, MON).xp; s.plans = wk(s).plans; assert.equal(MX.progress(s, MON).xp, x); });
t('older saves get empty plans and a default focus', () => { const fx = require('./fixtures/v1-save.json'); const m = MX.migrate(JSON.parse(JSON.stringify(fx.state))); assert.deepEqual(m.plans, {}); assert.equal(m.prefs.focus.mode, 'balanced'); });

console.log('Legacy saves');
t('pre-update save keeps every unlock, mastery, achievement and XP', () => {
  const fx = require('./fixtures/v1-save.json'); const s = MX.migrate(JSON.parse(JSON.stringify(fx.state)));
  const p = MX.progress(s, fx.expected.asOf);
  assert.ok(p.xp >= fx.expected.xp, 'xp ' + p.xp + ' < ' + fx.expected.xp); assert.ok(p.level.level >= fx.expected.level);
  fx.expected.achieved.forEach(a => assert.ok(p.achieved.includes(a), 'lost achievement ' + a));
  assert.ok(p.prs.length >= fx.expected.prs);
  Object.keys(fx.expected.tiers).forEach(id => { const o = fx.expected.tiers[id], n2 = p.tree.nodes[id]; assert.ok(n2, 'node vanished ' + id);
    if (o.unlocked) assert.ok(n2.unlocked, 'lost unlock ' + id); if (o.mastered) assert.ok(n2.mastered, 'lost mastery ' + id); assert.ok(MX.rank(n2.tier) >= MX.rank(o.tier), 'tier dropped ' + id); });
  assert.ok(s.onboarded, 'onboarding must not repeat');
});
t('old contact-pad logs now count toward the contact branch once it unlocks', () => { const fx = require('./fixtures/v1-save.json'); const p = MX.progress(MX.migrate(fx.state), fx.expected.asOf); const e2 = p.tree.nodes['fin.e2']; assert.ok(e2.ev && e2.ev.sessions >= 5); });

console.log('Persistence model');
t('migrate fills missing fields and drops bad logs', () => { const m = MX.migrate({ profile: { name: 'A' }, logs: [{ id: 'x', date: TODAY, kind: 'rest' }, null, { foo: 1 }] }); assert.equal(m.profile.name, 'A'); assert.equal(m.logs.length, 1); assert.ok(m.schedule.events); });

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
