/* Pure logic: no DOM. Everything that counts (tiers, XP, records, achievements) is DERIVED from the
 * log history each time, so rewards cannot be duplicated and deleting a log removes exactly what it earned. */
(function (MX) {
  const TIERS = ['locked', 'available', 'practicing', 'benchmark', 'pressure', 'game'];
  const TIER_LABEL = { locked: 'Locked', available: 'Unlocked', practicing: 'Practicing', benchmark: 'Benchmark achieved', pressure: 'Applied under pressure', game: 'Game-applied' };
  MX.TIERS = TIERS; MX.TIER_LABEL = TIER_LABEL;
  const rank = function (t) { return TIERS.indexOf(t); };
  MX.rank = rank;
  const LEGS = ['none', 'light', 'moderate', 'heavy'];
  const legsRank = function (l) { return Math.max(0, LEGS.indexOf(l || 'none')); };
  MX.legsRank = legsRank;

  /* ---------- dates ---------- */
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function dkey(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function parseKey(k) { const p = k.split('-'); return new Date(+p[0], +p[1] - 1, +p[2], 12); }
  function addDays(k, n) { const d = parseKey(k); d.setDate(d.getDate() + n); return dkey(d); }
  function dow(k) { return parseKey(k).getDay(); }
  function daysBetween(a, b) { return Math.round((parseKey(b) - parseKey(a)) / 86400000); }
  function toMin(hhmm) { if (!hhmm) return 0; const p = hhmm.split(':'); return (+p[0]) * 60 + (+p[1] || 0); }
  function fmtTime(hhmm) { if (!hhmm) return ''; let m = toMin(hhmm); let h = Math.floor(m / 60), mm = m % 60; const ap = h >= 12 ? 'pm' : 'am'; h = h % 12 || 12; return h + (mm ? ':' + pad(mm) : '') + ap; }
  Object.assign(MX, { dkey: dkey, parseKey: parseKey, addDays: addDays, dow: dow, daysBetween: daysBetween, toMin: toMin, fmtTime: fmtTime });
  MX.DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  MX.uid = function () { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); };

  /* ---------- default state ---------- */
  MX.defaultProfile = function () {
    return {
      name: '', grade: 'Grade 8', level: 'club', position: 'Combo guard', role: 'Primary ball-handler and downhill scorer',
      style: ['Quick downhill guard', 'Strong first step', 'Comfortable handling', 'Aggressive rim attacker', 'Pull-up shooting'],
      inspiration: 'Tyrese Maxey: speed, change of pace, attacking decisions, pull-up shooting',
      strengths: ['bh', 'sep', 'def'], strengthNotes: 'Ball handling, first-step quickness, downhill attacking, defensive potential',
      needs: ['sep', 'sht', 'fin', 'cond', 'iq'], needNotes: 'Maintaining separation after beating a defender, consistent shooting under pressure, finishing consistency, conditioning and fatigue, decision-making under pressure',
      goals: ['Keep the advantage after my first step', 'Make pull-ups under pressure', 'Finish more consistently'], goalText: '',
      duration: 45, primary: 'sep', secondary: 'sht',
      courtAnytime: false, homeHoop: false, openSpace: true, gymAccess: true,
      equipment: ['db', 'bench', 'band', 'box', 'mb', 'mat'], strengthExp: 'little', supervision: false,
      partner: 'sometimes', limitations: '', units: 'kg'
    };
  };
  MX.defaultState = function () {
    const events = [];
    MX.DEFAULT_SCHEDULE.forEach(function (e) {
      e.days.forEach(function (d) { events.push({ id: MX.uid() + d, type: e.type, title: e.title, day: d, start: e.start, end: e.end, repeat: 'weekly' }); });
    });
    return {
      v: 1, createdAt: Date.now(), updatedAt: Date.now(), onboarded: false, obStep: 0,
      profile: MX.defaultProfile(), schedule: { events: events, skips: {} }, logs: [], readiness: {},
      insights: {}, prefs: { title: '', tree: 'sep', zoom: 1, focus: { mode: 'balanced' } }, today: null, plans: {}
    };
  };
  MX.migrate = function (s) {
    const d = MX.defaultState();
    if (!s || typeof s !== 'object') return d;
    const out = Object.assign({}, d, s);
    out.profile = Object.assign(MX.defaultProfile(), s.profile || {});
    out.schedule = Object.assign({ events: [], skips: {} }, s.schedule || {});
    out.logs = Array.isArray(s.logs) ? s.logs.filter(function (l) { return l && l.id && l.date; }) : [];
    out.readiness = s.readiness || {}; out.insights = s.insights || {}; out.prefs = Object.assign(d.prefs, s.prefs || {});
    out.plans = s.plans && typeof s.plans === 'object' && !Array.isArray(s.plans) ? s.plans : {};
    if (out.today && !out.today.focus) out.today.focus = out.prefs.focus;
    return out;
  };

  /* ---------- schedule ---------- */
  MX.eventsOn = function (state, key) {
    const wd = dow(key), skips = state.schedule.skips || {};
    return state.schedule.events.filter(function (e) {
      if (e.repeat === 'once') return e.date === key;
      return e.day === wd && !(skips[e.id] && skips[e.id][key]);
    }).sort(function (a, b) { return toMin(a.start) - toMin(b.start); });
  };
  MX.facilities = function (state, key) {
    const ev = MX.eventsOn(state, key), p = state.profile;
    const court = ev.filter(function (e) { return e.type === 'court'; });
    const gym = ev.filter(function (e) { return e.type === 'gym'; });
    return { court: court, gym: gym, hasCourt: p.courtAnytime || court.length > 0, hasGym: p.gymAccess && gym.length > 0, homeHoop: p.homeHoop };
  };
  MX.nextEvents = function (state, fromKey, nowMin, limit) {
    const out = [];
    for (let i = 0; i < 14 && out.length < limit; i++) {
      const k = addDays(fromKey, i);
      MX.eventsOn(state, k).forEach(function (e) {
        if (i === 0 && toMin(e.end) < nowMin) return;
        if (e.type === 'school' || e.type === 'free') return;
        out.push({ key: k, ev: e });
      });
    }
    return out.slice(0, limit);
  };

  /* ---------- workload ---------- */
  function logLoad(l) {
    if (l.kind === 'quest') { const q = MX.QUEST[l.qid]; if (!q) return 0; return q.load * Math.min(1.5, Math.max(0.5, (l.dur || q.dur) / 20)); }
    if (l.kind === 'gym') { const w = MX.WORKOUT[l.wid]; const ld = w ? w.load : 2; return ld * Math.min(1.5, Math.max(0.5, (l.dur || 40) / 40)); }
    if (l.kind === 'custom') return (l.load || 2) * Math.min(1.5, Math.max(0.5, (l.dur || 45) / 40));
    return 0;
  }
  function logLegs(l) {
    if (l.kind === 'quest') { const q = MX.QUEST[l.qid]; return q ? q.legs : 'none'; }
    if (l.kind === 'gym') { const w = MX.WORKOUT[l.wid]; return w ? w.legs : 'moderate'; }
    if (l.kind === 'custom') return l.legs || 'none';
    return 'none';
  }
  MX.logLoad = logLoad; MX.logLegs = logLegs;
  MX.dayLoad = function (state, key, todayKey, nowMin) {
    let total = 0, legs = 0, items = [];
    MX.eventsOn(state, key).forEach(function (e) {
      const t = MX.EVENT_TYPES[e.type] || {};
      if (!t.load) return;
      if (key === todayKey && toMin(e.start) > nowMin) return; // not happened yet
      if (key > todayKey) return;
      total += t.load; legs = Math.max(legs, legsRank(t.legs)); items.push(e.title);
    });
    state.logs.forEach(function (l) {
      if (l.date !== key) return;
      const ld = logLoad(l); if (ld) { total += ld; legs = Math.max(legs, legsRank(logLegs(l))); }
    });
    return { total: total, legs: legs, items: items };
  };
  // most recent date (within 7 days) with lower-body strength work (gym/custom moderate+)
  MX.lastLegStrength = function (state, todayKey) {
    let best = null;
    state.logs.forEach(function (l) {
      const athletic = l.kind === 'quest' && MX.QUEST[l.qid] && MX.QUEST[l.qid].type === 'athletic';
      if ((l.kind === 'gym' || l.kind === 'custom' || athletic) && legsRank(logLegs(l)) >= 2 && l.date <= todayKey) { if (!best || l.date > best) best = l.date; }
    });
    for (let i = 0; i < 4; i++) {
      const k = addDays(todayKey, -i);
      MX.eventsOn(state, k).forEach(function (e) { if (e.type === 'strength' && e.legs !== 'none' && (!best || k > best) && i > 0) best = k; });
    }
    return best;
  };

  /* ---------- scoring a log ---------- */
  MX.score = function (l) {
    const q = MX.QUEST[l.qid]; if (!q) return null;
    if (q.measure.kind === 'makes') return l.att > 0 ? Math.min(1, (l.makes || 0) / l.att) : null;
    if (q.measure.kind === 'rating') return l.rating ? l.rating / 5 : null;
    return null;
  };
  const TECH = { solid: 1, okay: 0.6, shaky: 0.3 };

  /* ---------- evidence & tiers ---------- */
  MX.evidence = function (state) {
    const ev = {};
    function E(id) { return ev[id] || (ev[id] = { sessions: 0, hits: 0, hitDays: {}, pHits: 0, worked: 0, workedDays: {}, mixed: 0, no: 0, last: null, best: null, rates: [] }); }
    const testedOut = {};
    const logs = state.logs.slice().sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : (a.ts || 0) - (b.ts || 0); });
    logs.forEach(function (l) {
      if (l.kind === 'quest') {
        const q = MX.QUEST[l.qid]; if (!q) return;
        const s = MX.score(l);
        q.nodes.forEach(function (nid) {
          const e = E(nid); e.sessions++; e.last = l.date;
          if (s != null) { e.rates.push(s); if (e.best == null || s > e.best) e.best = s; }
          const hit = q.measure.kind === 'done' ? true : (s != null && s >= q.bench);
          if (hit) { e.hits++; e.hitDays[l.date] = 1; if (q.stage >= 2) e.pHits++; }
        });
        if (q.unlocks && s != null && s >= q.unlocks.at) q.unlocks.nodes.forEach(function (n) { testedOut[n] = l.date; });
        if (l.testOut && s != null && s >= Math.min(1, q.bench + 0.1)) testedOut[l.testOut] = l.date;
      } else if (l.kind === 'gym') {
        const per = {};
        (l.ex || []).forEach(function (x) {
          const exd = MX.EXERCISE[x.id]; if (!exd || !x.done) return;
          exd.nodes.forEach(function (n) { (per[n] = per[n] || []).push(TECH[x.tech] || 0.6); });
        });
        Object.keys(per).forEach(function (n) {
          const e = E(n); e.sessions++; e.last = l.date;
          const avg = per[n].reduce(function (a, b) { return a + b; }, 0) / per[n].length;
          e.rates.push(avg); if (e.best == null || avg > e.best) e.best = avg;
          if (avg >= 0.8) { e.hits++; e.hitDays[l.date] = 1; }
        });
      } else if (l.kind === 'game') {
        (l.reports || []).forEach(function (r) {
          if (!r.node || !MX.NODES[r.node]) return;
          const e = E(r.node); e.last = l.date;
          if (r.result === 'worked') { e.worked++; e.workedDays[l.date] = 1; } else if (r.result === 'mixed') e.mixed++; else e.no++;
        });
      }
    });
    return { ev: ev, testedOut: testedOut };
  };

  function evidenceTier(n, e) {
    if (!e) return 'available';
    const benchmark = n.boss ? e.hits >= 1 : (e.hits >= 3 && Object.keys(e.hitDays).length >= 2);
    const pressure = benchmark && e.pHits >= 2;
    const game = n.goal === 'game' && e.worked >= 2 && Object.keys(e.workedDays).length >= 2;
    if (game) return 'game';
    if (pressure && n.goal !== 'benchmark') return 'pressure';
    if (benchmark) return 'benchmark';
    if (e.sessions > 0 || e.worked + e.mixed + e.no > 0) return 'practicing';
    return 'available';
  }
  function goalRank(n) { return rank(n.goal || 'benchmark'); }

  /* Returns {nodes: {id: {tier, unlocked, mastered, ev, why}}} computed to a fixpoint. */
  MX.computeTree = function (state) {
    const E = MX.evidence(state), out = {};
    const ids = Object.keys(MX.NODES);
    ids.forEach(function (id) { out[id] = { unlocked: false, tier: 'locked', mastered: false, ev: E.ev[id] || null, testedOut: !!E.testedOut[id] }; });
    // A proven-early (tested-out) node is unlocked, but its children still need benchmark evidence on it: no multi-level jumps.
    function satisfied(id) { const o = out[id]; return o.unlocked && rank(o.tier) >= rank('benchmark'); }
    let changed = true, guard = 0;
    while (changed && guard++ < 20) {
      changed = false;
      ids.forEach(function (id) {
        const n = MX.NODES[id], o = out[id];
        if (o.unlocked) return;
        const met = n.req.filter(satisfied).length;
        if (n.req.length === 0 || met >= (n.need || 1) || o.testedOut) {
          o.unlocked = true; o.tier = evidenceTier(n, o.ev); changed = true;
        }
      });
    }
    ids.forEach(function (id) {
      const n = MX.NODES[id], o = out[id];
      o.tier = o.unlocked ? evidenceTier(n, o.ev) : 'locked';
      o.evTier = evidenceTier(n, o.ev); // evidence even while locked (multi-skill quests)
      o.mastered = o.unlocked && rank(o.tier) >= goalRank(n);
      o.met = n.req.filter(satisfied).length;
    });
    return { nodes: out, testedOut: E.testedOut };
  };

  /* ---------- per-skill stats (assessment) ---------- */
  MX.skillStats = function (state, todayKey, days) {
    const from = days ? addDays(todayKey, -days) : '0000';
    const s = {};
    MX.SKILL_KEYS.forEach(function (k) { s[k] = { st1: { att: 0, mk: 0, n: 0, days: {} }, st2: { att: 0, mk: 0, n: 0, days: {} }, rated: { sum: 0, n: 0 }, game: { worked: 0, mixed: 0, no: 0, n: 0, last: [] }, weeks: {}, sessions: 0, last: null }; });
    state.logs.forEach(function (l) {
      if (l.date < from) return;
      if (l.kind === 'quest') {
        const q = MX.QUEST[l.qid]; if (!q || q.measure.kind === 'report') return;
        Object.keys(q.skills).forEach(function (k) {
          if (q.skills[k] < 0.3) return;
          const t = s[k]; t.sessions++; t.last = !t.last || l.date > t.last ? l.date : t.last;
          t.weeks[Math.floor(daysBetween('2024-01-01', l.date) / 7)] = 1;
          if (q.measure.kind === 'makes' && l.att > 0) { const b = q.stage >= 2 ? t.st2 : t.st1; b.att += l.att; b.mk += Math.min(l.makes || 0, l.att); b.n++; b.days[l.date] = 1; }
          if (q.measure.kind === 'rating' && l.rating) { t.rated.sum += l.rating; t.rated.n++; }
        });
      } else if (l.kind === 'gym') {
        const t = s.str; t.sessions++; t.last = !t.last || l.date > t.last ? l.date : t.last; t.weeks[Math.floor(daysBetween('2024-01-01', l.date) / 7)] = 1;
      } else if (l.kind === 'game') {
        (l.reports || []).forEach(function (r) {
          const t = s[r.skill]; if (!t) return;
          t.game.n++; if (r.result === 'worked') t.game.worked++; else if (r.result === 'mixed') t.game.mixed++; else t.game.no++;
          t.game.last.push({ date: l.date, result: r.result });
        });
      }
    });
    MX.SKILL_KEYS.forEach(function (k) { s[k].game.last.sort(function (a, b) { return a.date < b.date ? 1 : -1; }); });
    return s;
  };
  MX.confidence = function (sessions, weeks, att) {
    if (sessions === 0) return { level: 0, label: 'No evidence yet' };
    if (sessions < 3 || (att != null && att < 30)) return { level: 1, label: 'Low confidence' };
    if (sessions < 6 || weeks < 3) return { level: 2, label: 'Moderate confidence' };
    return { level: 3, label: 'Good confidence' };
  };
  MX.rate = function (b) { return b.att > 0 ? b.mk / b.att : null; };

  /* ---------- emphasis mix ---------- */
  MX.targets = function (p) {
    const t = {}; MX.SKILL_KEYS.forEach(function (k) { t[k] = 0.05; });
    if (p.primary) t[p.primary] = 0.45;
    if (p.secondary && p.secondary !== p.primary) t[p.secondary] = 0.25; else if (p.primary) t[p.primary] = 0.70;
    const rest = MX.SKILL_KEYS.filter(function (k) { return k !== p.primary && k !== p.secondary; });
    const left = 1 - (t[p.primary] || 0) - (p.secondary !== p.primary ? (t[p.secondary] || 0) : 0);
    rest.forEach(function (k) { t[k] = left / rest.length; });
    return t;
  };
  MX.mix = function (state, todayKey, days) {
    days = days || 14;
    const from = addDays(todayKey, -days + 1), min = {}, p = state.profile;
    MX.SKILL_KEYS.forEach(function (k) { min[k] = 0; });
    let practiceMin = 0;
    state.logs.forEach(function (l) {
      if (l.date < from || l.date > todayKey) return;
      if (l.kind === 'quest') { const q = MX.QUEST[l.qid]; if (!q || !q.dur) return; const d = l.dur || q.dur; Object.keys(q.skills).forEach(function (k) { min[k] += d * q.skills[k]; }); }
      if (l.kind === 'gym' || l.kind === 'custom') min.str += l.dur || 40;
    });
    for (let i = 0; i < days; i++) {
      const k = addDays(todayKey, -i);
      MX.eventsOn(state, k).forEach(function (e) { if (e.type === 'practice' || e.type === 'game') practiceMin += (toMin(e.end) - toMin(e.start)) || 60; });
    }
    // Team practice maintains general skills: 25% of practice time credited across non-specialized categories.
    const maint = MX.SKILL_KEYS.filter(function (k) { return k !== p.primary && k !== p.secondary; });
    const credit = {}; maint.forEach(function (k) { credit[k] = practiceMin * 0.25 / maint.length; });
    const own = MX.SKILL_KEYS.reduce(function (a, k) { return a + min[k]; }, 0);
    const total = own + practiceMin * 0.25;
    const share = {};
    MX.SKILL_KEYS.forEach(function (k) { share[k] = total > 0 ? (min[k] + (credit[k] || 0)) / total : 0; });
    return { minutes: min, credit: credit, own: own, practiceMin: practiceMin, share: share, total: total };
  };

  /* ---------- XP, records, achievements (fully derived) ---------- */
  const DAILY_CAP = 250;
  MX.xpForLevel = function (L) { let t = 0; for (let k = 1; k < L; k++) t += 100 + 40 * (k - 1); return t; };
  MX.levelInfo = function (xp) {
    let L = 1; while (MX.xpForLevel(L + 1) <= xp) L++;
    const base = MX.xpForLevel(L), next = MX.xpForLevel(L + 1);
    let title = 'Prospect'; MX.LEVEL_TITLES.forEach(function (t) { if (L >= t[0]) title = t[1]; });
    return { level: L, base: base, next: next, into: xp - base, need: next - base, title: title };
  };
  function questXp(q, l) {
    if (q.type === 'recovery') return 10;
    let x = 10 + Math.round((l.dur || q.dur) * 0.8) + q.diff * 5;
    if (q.stage >= 2) x += 5;
    if (q.measure.kind !== 'done' && MX.score(l) != null) x += 5;
    return Math.min(x, 60);
  }
  MX.progress = function (state, todayKey) {
    const tree = MX.computeTree(state);
    const logs = state.logs.slice().sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : (a.ts || 0) - (b.ts || 0); });
    const ledger = [], seen = {}, dayXp = {}, best = {}, exBest = {}, prs = [];
    let xp = 0;
    function award(date, label, amt, capped) {
      if (amt <= 0) return 0;
      if (capped) { const used = dayXp[date] || 0; amt = Math.max(0, Math.min(amt, DAILY_CAP - used)); dayXp[date] = used + amt; }
      if (amt > 0) { xp += amt; ledger.push({ date: date, label: label, xp: amt }); }
      return amt;
    }
    const summary = { sessions: 0, gym: 0, solidGym: 0, games: 0, baselines: 0, partnerQuests: 0, recovery: 0, prs: 0, checkins: Object.keys(state.readiness || {}).length };
    const baselineSet = {}, spreadDays = [];
    logs.forEach(function (l) {
      let got = 0;
      if (l.kind === 'quest') {
        const q = MX.QUEST[l.qid]; if (!q) return;
        const key = l.date + '|' + l.qid;
        if (q.type === 'recovery') summary.recovery++; else summary.sessions++;
        if (q.partner > 0 && q.type !== 'recovery') summary.partnerQuests++;
        if (q.baseline) baselineSet[q.id] = 1;
        if (!seen[key]) { seen[key] = 1; got = award(l.date, q.name, questXp(q, l), true); }
        const s = MX.score(l);
        if (q.measure.kind === 'makes' && s != null && l.att >= Math.max(5, Math.round(q.measure.att * 0.8))) {
          if (best[q.id] != null && s > best[q.id] + 1e-9) { prs.push({ date: l.date, label: q.name, value: Math.round(s * 100) + '%', prev: Math.round(best[q.id] * 100) + '%' }); award(l.date, 'Personal record: ' + q.name, 20, false); }
          if (best[q.id] == null || s > best[q.id]) best[q.id] = s;
        }
        Object.keys(q.skills).forEach(function (k) { if (q.skills[k] >= 0.3 && q.type !== 'recovery') spreadDays.push({ date: l.date, skill: k }); });
      } else if (l.kind === 'gym') {
        summary.sessions++; summary.gym++;
        const done = (l.ex || []).filter(function (x) { return x.done; });
        if (done.length && done.every(function (x) { return x.tech === 'solid'; })) summary.solidGym++;
        const key = l.date + '|' + l.wid;
        if (!seen[key]) { seen[key] = 1; const w = MX.WORKOUT[l.wid]; got = award(l.date, w ? w.name : 'Workout', Math.min(55, 15 + Math.round((l.dur || 40) * 0.8)), true); }
        done.forEach(function (x) {
          const ld = parseFloat(x.load);
          if (!isNaN(ld) && ld > 0) {
            if (exBest[x.id] != null && ld > exBest[x.id] && x.tech === 'solid') { const e = MX.EXERCISE[x.id]; prs.push({ date: l.date, label: (e ? e.name : x.id) + ' load (solid technique)', value: ld + ' ' + (state.profile.units || 'kg'), prev: exBest[x.id] + '' }); award(l.date, 'Personal record: ' + (e ? e.name : x.id), 20, false); }
            if (exBest[x.id] == null || ld > exBest[x.id]) exBest[x.id] = ld;
          }
        });
        spreadDays.push({ date: l.date, skill: 'str' });
      } else if (l.kind === 'custom') {
        summary.sessions++;
        const key = l.date + '|custom';
        if (!seen[key]) { seen[key] = 1; award(l.date, l.name || 'Coach workout', Math.min(50, 15 + Math.round((l.dur || 40) * 0.6)), true); }
        spreadDays.push({ date: l.date, skill: 'str' });
      } else if (l.kind === 'game') {
        summary.games++;
        const key = l.date + '|game|' + (l.context || 'game');
        if (!seen[key]) { seen[key] = 1; award(l.date, 'Game-application report', 25, true); }
      } else if (l.kind === 'rest') {
        summary.recovery++;
        const key = l.date + '|rest';
        if (!seen[key]) { seen[key] = 1; award(l.date, 'Rest day', 10, true); }
      }
    });
    Object.keys(state.readiness || {}).sort().forEach(function (d) { award(d, 'Readiness check-in', 2, true); });

    // node milestones: one per node per tier, by definition
    const tierCounts = { benchmark: 0, pressure: 0, game: 0 }, bossSet = {};
    let bosses = 0, fullBranches = 0;
    Object.keys(tree.nodes).forEach(function (id) {
      const n = MX.NODES[id], o = tree.nodes[id], r = rank(o.tier);
      if (n.boss) { if (r >= rank('benchmark')) { bosses++; bossSet[id] = true; award(o.ev ? o.ev.last : todayKey, 'Boss cleared: ' + n.name.replace('Boss: ', ''), 100, false); } return; }
      if (r >= rank('benchmark')) { tierCounts.benchmark++; award(o.ev && o.ev.last || todayKey, 'Benchmark: ' + n.name, 30, false); }
      if (r >= rank('pressure')) { tierCounts.pressure++; award(o.ev && o.ev.last || todayKey, 'Under pressure: ' + n.name, 40, false); }
      if (r >= rank('game')) { tierCounts.game++; award(o.ev && o.ev.last || todayKey, 'Game-applied: ' + n.name, 60, false); }
    });
    MX.TREES.forEach(function (t) {
      for (let row = 0; row < t.branches.length - 1; row++) {
        const ns = t.nodes.filter(function (n) { return n.row === row; });
        if (ns.length && ns.every(function (n) { return tree.nodes[n.id].mastered; })) fullBranches++;
      }
    });
    // max distinct skills inside any 14-day window
    let maxSpread = 0;
    spreadDays.forEach(function (a) {
      const end = addDays(a.date, 13), set = {};
      spreadDays.forEach(function (b) { if (b.date >= a.date && b.date <= end) set[b.skill] = 1; });
      maxSpread = Math.max(maxSpread, Object.keys(set).length);
    });
    const stats = MX.skillStats(state, todayKey, 0);
    let transferSkills = 0;
    MX.SKILL_KEYS.forEach(function (k) {
      const hasBench = MX.TREE[k].nodes.some(function (n) { return !n.boss && rank(tree.nodes[n.id].tier) >= rank('benchmark'); });
      if (hasBench && stats[k].game.worked >= 2) transferSkills++;
    });
    Object.assign(summary, { baselines: Object.keys(baselineSet).length, tierCounts: tierCounts, bosses: bosses, bossSet: bossSet, fullBranches: fullBranches, maxSpread14: maxSpread, prs: prs.length, transferSkills: transferSkills });
    const achieved = [];
    MX.ACHIEVEMENTS.forEach(function (a) { if (a.test(summary)) { achieved.push(a.id); award(todayKey, 'Achievement: ' + a.name, 50, false); } });
    return { xp: xp, level: MX.levelInfo(xp), ledger: ledger, prs: prs, best: best, exBest: exBest, achieved: achieved, summary: summary, tree: tree, dailyCap: DAILY_CAP, dayXp: dayXp };
  };

  /* ---------- weight-room helpers ---------- */
  MX.resolveWorkout = function (state, w) {
    const p = state.profile, have = {};
    (p.equipment || []).forEach(function (e) { have[e] = 1; });
    const supervised = p.supervision && p.strengthExp !== 'none';
    function ok(e) { return e && e.equip.every(function (q) { return have[q]; }) && (!e.sup || supervised); }
    const items = [], subs = [];
    w.items.forEach(function (it) {
      let e = MX.EXERCISE[it[0]], depth = 0;
      while (e && !ok(e) && depth < 3) { const nx = e.alt ? MX.EXERCISE[e.alt] : null; if (nx) subs.push(e.name + ' → ' + nx.name); e = nx; depth++; }
      if (e && ok(e) && !items.some(function (x) { return x.id === e.id; })) items.push({ id: e.id, sets: it[1], reps: e.id === it[0] ? it[2] : e.reps });
    });
    const blocked = (w.sup && !supervised) ? 'Needs a qualified adult supervising and some strength-training experience.' : null;
    return { items: items, subs: subs, ok: !blocked && items.length >= 4, blocked: blocked };
  };
  MX.progressionHint = function (state, exId) {
    const hist = [];
    state.logs.slice().sort(function (a, b) { return a.date < b.date ? 1 : -1; }).forEach(function (l) {
      if (l.kind !== 'gym') return;
      (l.ex || []).forEach(function (x) { if (x.id === exId && x.done) hist.push({ x: x, rpe: l.rpe }); });
    });
    if (hist.length === 0) return { kind: 'start', text: 'First time: pick a load you could lift for several more reps. Focus on the cues.' };
    const last = hist[0];
    if (last.x.tech === 'shaky') return { kind: 'hold', text: 'Last time technique was shaky. Use the easier option or the same load and own every rep.' };
    if (hist.length >= 2 && hist[0].x.tech === 'solid' && hist[1].x.tech === 'solid' && (hist[0].rpe || 10) <= 7) {
      return { kind: 'up', text: 'Two solid sessions in a row at a manageable effort. Add 1–2 reps per set, or a small load increase (about 2.5 kg / 5 lb) if you are at the top of the rep range.' };
    }
    return { kind: 'hold', text: 'Repeat the same load and aim for solid technique on every rep before progressing.' };
  };

  /* ---------- insights (rule-based weakness detection) ---------- */
  MX.insights = function (state, todayKey) {
    const st = MX.skillStats(state, todayKey, 45), out = [], tree = MX.computeTree(state);
    const pct = function (x) { return Math.round(x * 100) + '%'; };
    function qstats(id, days) {
      const from = addDays(todayKey, -(days || 45)); let att = 0, mk = 0, n = 0; const rs = [];
      state.logs.forEach(function (l) { if (l.kind === 'quest' && l.qid === id && l.date >= from && l.att > 0) { att += l.att; mk += Math.min(l.makes || 0, l.att); n++; rs.push({ d: l.date, r: Math.min(1, (l.makes || 0) / l.att) }); } });
      rs.sort(function (a, b) { return a.d < b.d ? -1 : 1; });
      return { att: att, mk: mk, n: n, rate: att ? mk / att : null, series: rs };
    }
    // R1 separation good, applied finishing lagging
    const sep = st.sep, finApplied = st.fin.st2;
    const sepAll = { att: sep.st1.att + sep.st2.att, mk: sep.st1.mk + sep.st2.mk, n: sep.st1.n + sep.st2.n };
    if (sepAll.n >= 3 && MX.rate(sepAll) >= 0.6 && finApplied.n >= 2 && MX.rate(finApplied) < 0.5) {
      out.push({ id: 'conv', kind: 'hypothesis', skill: 'fin', quest: ['fin-trailer', 'fin-race', 'fin-blocker-solo'],
        title: 'Advantages are not turning into finishes yet',
        text: 'Your separation drills are going well, but applied finishing is lagging. The step after the advantage may be the limiter.',
        evidence: 'Separation: ' + pct(MX.rate(sepAll)) + ' over ' + sepAll.n + ' sessions. Applied finishing: ' + pct(MX.rate(finApplied)) + ' over ' + finApplied.n + ' sessions (last 45 days).' });
    }
    // R2 shooting drops under pressure
    const s1 = st.sht.st1, s2 = st.sht.st2;
    if (s1.n >= 3 && s2.n >= 2 && MX.rate(s1) - MX.rate(s2) >= 0.15) {
      out.push({ id: 'shtp', kind: 'observation', skill: 'sht', quest: ['sht-closeout-solo', 'sht-closeout-live', 'sht-pace'],
        title: 'Your shot drops off under pressure',
        text: 'Technique-stage shooting is clearly better than applied shooting. That is normal, but it is also the gap to close.',
        evidence: 'Technique: ' + pct(MX.rate(s1)) + ' (' + s1.att + ' shots, ' + s1.n + ' sessions). Applied: ' + pct(MX.rate(s2)) + ' (' + s2.att + ' shots, ' + s2.n + ' sessions).' });
    }
    // R3 weak hand gap
    const wk = qstats('fin-weak'), mk = qstats('fin-mikan'), five = qstats('fin-5spot');
    const strongRef = five.n >= 1 ? five : mk;
    if (wk.n >= 2 && strongRef.n >= 2 && strongRef.rate - wk.rate >= 0.15) {
      out.push({ id: 'weak', kind: 'observation', skill: 'fin', quest: ['fin-weak', 'fin-inside'], title: 'Weak-hand finishing gap',
        text: 'Your weak-hand finishing is behind your mixed-hand finishing.', evidence: 'Weak-hand block: ' + pct(wk.rate) + ' (' + wk.n + ' sessions) vs ' + pct(strongRef.rate) + ' in ' + MX.QUEST[strongRef === five ? 'fin-5spot' : 'fin-mikan'].name + '.' });
    }
    // R4 fatigue shooting gap
    const fat = qstats('sht-fatigue'), fresh = qstats('sht-5spot').n >= 2 ? qstats('sht-5spot') : qstats('sht-ft');
    if (fat.n >= 2 && fresh.n >= 2 && fresh.rate - fat.rate >= 0.15) {
      out.push({ id: 'fat', kind: 'hypothesis', skill: 'cond', quest: ['sht-fatigue', 'cond-tempo', 'cond-breath'], title: 'Shooting fades when you are tired',
        text: 'Your shooting drops more than usual after running. Conditioning and a steady routine may help close it.', evidence: 'Fatigue shooting ' + pct(fat.rate) + ' vs fresh ' + pct(fresh.rate) + ' (' + fat.n + ' and ' + fresh.n + ' sessions).' });
    }
    // R5 drill-to-game transfer gap
    MX.SKILL_KEYS.forEach(function (k) {
      const g = st[k].game.last.slice(0, 3);
      const hasBench = MX.TREE[k].nodes.some(function (n) { return !n.boss && rank(tree.nodes[n.id].tier) >= rank('benchmark'); });
      if (g.length >= 3 && g.filter(function (x) { return x.result === 'no'; }).length >= 2 && hasBench) {
        const q2 = MX.QUESTS.filter(function (q) { return q.skill === k && q.stage === 2 && q.type !== 'boss'; }).map(function (q) { return q.id; });
        out.push({ id: 'xfer-' + k, kind: 'observation', skill: k, quest: q2.slice(0, 3), title: MX.SKILLS[k].name + ': drill results are not showing up in games yet',
          text: 'You have reached benchmarks in drills, but your recent game reports say it is not carrying over. More applied, game-like reps should help close the gap.',
          evidence: '2 or more of your last 3 game reports for ' + MX.SKILLS[k].name.toLowerCase() + ' were "did not show up".' });
      }
    });
    // R6 neglect (maintenance)
    const recentPractice = [0, 1, 2, 3, 4, 5, 6].some(function (i) { return MX.eventsOn(state, addDays(todayKey, -i)).some(function (e) { return e.type === 'practice'; }); });
    const hasHistory = state.logs.length >= 6;
    if (hasHistory) {
      MX.SKILL_KEYS.forEach(function (k) {
        const covered = recentPractice && (k === 'iq' || k === 'def' || k === 'cond');
        const last = st[k].last;
        if (!covered && (!last || daysBetween(last, todayKey) > 21)) {
          const q = MX.QUESTS.filter(function (q) { return q.skill === k && q.type !== 'boss' && q.type !== 'recovery' && q.stage === 1; }).map(function (q) { return q.id; });
          out.push({ id: 'neglect-' + k, kind: 'observation', skill: k, quest: q.slice(0, 3), title: 'Maintenance: ' + MX.SKILLS[k].name,
            text: 'You have not trained this area for over three weeks. One short session keeps it from slipping.', evidence: last ? 'Last session: ' + last + '.' : 'No sessions logged yet.' });
        }
      });
    }
    // R7 fatigue pattern
    const rk = Object.keys(state.readiness || {}).sort().slice(-5);
    const very = rk.filter(function (d) { return state.readiness[d].level === 'very'; }).length;
    if (rk.length >= 3 && very >= 3) {
      out.push({ id: 'tired', kind: 'observation', skill: 'cond', quest: ['rec-rest', 'rec-mobility'], safety: true, title: 'You have reported heavy fatigue often',
        text: 'Several of your recent check-ins were "very fatigued". Lighter days and more sleep help. If this keeps happening, or you also feel unwell or have pain, talk with a parent or trusted adult and a qualified healthcare professional.',
        evidence: very + ' of your last ' + rk.length + ' check-ins.' });
    }
    // R8 recent decline on the same quest
    MX.QUESTS.forEach(function (q) {
      if (q.measure.kind !== 'makes' || q.type === 'boss') return;
      const s = qstats(q.id, 60).series;
      if (s.length >= 6) {
        const a = s.slice(-6, -3), b = s.slice(-3);
        const av = function (x) { return x.reduce(function (t, y) { return t + y.r; }, 0) / x.length; };
        if (av(a) - av(b) >= 0.15) out.push({ id: 'dip-' + q.id, kind: 'observation', skill: q.skill, quest: [q.id, 'rec-mobility'], title: 'Dip in ' + q.name,
          text: 'Your last three results are lower than the three before. This is often fatigue or a busy week, not lost skill. Check your recovery before adding volume.',
          evidence: 'Average ' + pct(av(a)) + ' → ' + pct(av(b)) + '.' });
      }
    });
    const st8 = state.insights || {};
    return out.filter(function (i) { const x = st8[i.id]; return !(x && x.until && x.until > todayKey); });
  };

  /* ---------- recommendation engine ---------- */
  /* ctx: {key, nowMin, minutes, loc: 'auto'|'court'|'gym'|'home', partner: bool} */
  MX.recommend = function (state, ctx) {
    const p = state.profile, key = ctx.key, nowMin = ctx.nowMin;
    const prog = MX.progress(state, key), tree = prog.tree;
    const todays = MX.eventsOn(state, key), tomorrow = MX.eventsOn(state, addDays(key, 1));
    const ready = (state.readiness || {})[key] || null;
    const fac = MX.facilities(state, key);
    const notes = [], reasonsGlobal = [];
    const gameToday = todays.find(function (e) { return e.type === 'game'; });
    const gameTomorrow = tomorrow.find(function (e) { return e.type === 'game'; });
    const practiceToday = todays.find(function (e) { return e.type === 'practice'; });
    const practiceLater = practiceToday && toMin(practiceToday.start) > nowMin ? practiceToday : null;
    const gameLater = gameToday && toMin(gameToday.end) > nowMin ? gameToday : null;

    // --- load and readiness caps
    const y1 = MX.dayLoad(state, addDays(key, -1), key, nowMin), y2 = MX.dayLoad(state, addDays(key, -2), key, nowMin), t0 = MX.dayLoad(state, key, key, nowMin);
    const recent = y1.total + y2.total + t0.total;
    let maxLoad = 3, maxLegs = 3; // legs rank cap
    if (ready && ready.level === 'tired') { maxLoad = 2; maxLegs = 1; notes.push('You reported feeling somewhat tired, so today stays moderate and easy on the legs.'); }
    if (ready && ready.level === 'very') { maxLoad = 0; maxLegs = 0; notes.push('You reported heavy fatigue. Today is a recovery day. That is part of training, not a missed day.'); }
    if (ready && ready.sore === 'high') { maxLegs = Math.min(maxLegs, 0); maxLoad = Math.min(maxLoad, 1); notes.push('Significant soreness: lower-body work is skipped today.'); }
    if (ready && ready.pain) { maxLoad = 0; maxLegs = 0; notes.push('You reported pain that is not normal soreness. Skip training that causes it and tell a parent or trusted adult. If it continues, see a qualified healthcare professional.'); }
    if (gameTomorrow) { maxLoad = Math.min(maxLoad, 2); maxLegs = Math.min(maxLegs, 1); notes.push('Game tomorrow: no demanding lower-body work today.'); }
    if (gameLater) { maxLoad = Math.min(maxLoad, 1); maxLegs = 0; notes.push('Game today: keep it light before the game.'); }
    if (practiceLater) { maxLoad = Math.min(maxLoad, 1); maxLegs = Math.min(maxLegs, 1); }
    if (recent >= 9) { maxLoad = Math.min(maxLoad, 1); maxLegs = Math.min(maxLegs, 1); notes.push('Heavy load over the last two days (' + recent.toFixed(0) + ' load points). Lighter work is recommended.'); }
    else if (recent >= 6) { maxLoad = Math.min(maxLoad, 2); notes.push('Solid workload recently, so the most demanding options are filtered out.'); }
    const lastLegs = MX.lastLegStrength(state, key);
    const legsStrengthRecent = lastLegs && daysBetween(lastLegs, key) < 2;
    // Explosive work needs freshness: never on top of a practice or game day, the day before a game, a heavy stretch, or when tired/sore.
    const explosiveBlock = !!(practiceToday || gameToday || gameTomorrow || recent >= 6 || (ready && (ready.level !== 'fresh' || ready.sore === 'high' || ready.pain)));

    // --- location
    let loc = ctx.loc || 'auto';
    const canCourt = fac.hasCourt, canGym = fac.hasGym;
    const spaces = {};
    if (loc === 'auto') {
      if (canCourt) spaces.court = spaces.hoop = 1;
      if (canGym) spaces.gym = 1;
      spaces.home = 1; if (p.homeHoop) spaces.hoop = 1; if (p.openSpace) spaces.field = 1;
    } else if (loc === 'court') { spaces.court = spaces.hoop = spaces.field = spaces.home = 1; }
    else if (loc === 'gym') { spaces.gym = spaces.home = 1; }
    else { spaces.home = 1; if (p.homeHoop) spaces.hoop = 1; if (p.openSpace) spaces.field = 1; }
    const partner = ctx.partner != null ? ctx.partner : false;
    const minutes = ctx.minutes || p.duration || 45;

    // --- emphasis deficits
    const targets = MX.targets(p), mix = MX.mix(state, key, 14);
    const deficit = {};
    MX.SKILL_KEYS.forEach(function (k) { deficit[k] = mix.total > 30 ? targets[k] - mix.share[k] : targets[k]; });
    const ins = MX.insights(state, key);
    const insQuest = {}, insSkill = {};
    ins.forEach(function (i) { (i.quest || []).forEach(function (q) { insQuest[q] = i; }); insSkill[i.skill] = i; });
    const recentQuest = {};
    state.logs.forEach(function (l) { if (l.kind === 'quest' && daysBetween(l.date, key) <= 2 && daysBetween(l.date, key) >= 0) recentQuest[l.qid] = 1; if (l.kind === 'gym' && daysBetween(l.date, key) <= 2) recentQuest[l.wid] = 1; });
    const strDays = (function () { let d = 99; state.logs.forEach(function (l) { if ((l.kind === 'gym' || l.kind === 'custom') && l.date <= key) d = Math.min(d, daysBetween(l.date, key)); }); return d; })();
    const doneToday = {}; state.logs.forEach(function (l) { if (l.date === key) doneToday[l.qid || l.wid || l.kind] = 1; });

    const cands = [];
    function nodeBonus(nodes) {
      let b = 0, best = null;
      nodes.forEach(function (nid) {
        const o = tree.nodes[nid], n = MX.NODES[nid]; if (!o || !o.unlocked || o.mastered) return;
        const spec = n.tree === p.primary ? 1.5 : n.tree === p.secondary ? 1.2 : 1;
        const v = (o.tier === 'practicing' ? 10 : 7) * spec;
        if (v > b) { b = v; best = n; }
      });
      return { b: b, node: best };
    }
    function baseReasons(skills) {
      const r = [];
      const ks = Object.keys(skills).sort(function (a, b) { return skills[b] - skills[a]; });
      const k = ks[0];
      if (k === p.primary) r.push('Builds your primary focus: ' + MX.SKILLS[k].name.toLowerCase() + '.');
      else if (k === p.secondary) r.push('Builds your secondary focus: ' + MX.SKILLS[k].name.toLowerCase() + '.');
      else if (deficit[k] > 0.02) r.push(MX.SKILLS[k].name + ' has had little recent attention, so this keeps it maintained.');
      return r;
    }

    // --- basketball quests
    MX.QUESTS.forEach(function (q) {
      if (q.type === 'team' || q.type === 'game') return;
      if (q.id === 'rec-rest') return;
      const why = [];
      if (q.space !== 'any' && !spaces[q.space]) return;
      if (q.partner > 0 && !partner) return;
      if (q.dur > minutes + 2) return;
      if (q.load > maxLoad) return;
      if (legsRank(q.legs) > maxLegs) return;
      if (q.type === 'boss') { const bn = tree.nodes[q.nodes[0]]; if (!bn.unlocked || bn.mastered) return; }
      if (q.nodes.length && !q.baseline && !q.nodes.some(function (n) { return tree.nodes[n] && tree.nodes[n].unlocked; })) return; // advanced content waits for readiness (baselines are the test-in route)
      if (q.type === 'athletic' && explosiveBlock) return;
      if (q.type === 'athletic' && legsRank(q.legs) >= 2 && legsStrengthRecent) return;
      if (q.type === 'cond' && (recent >= 6 || practiceLater)) return; // no extra conditioning on top of heavy practice load
      let s = 0;
      Object.keys(q.skills).forEach(function (k) { s += Math.max(-0.1, deficit[k]) * 100 * q.skills[k]; });
      const nb = nodeBonus(q.nodes); s += nb.b;
      if (nb.node) why.push('Works toward "' + nb.node.name + '" in your ' + MX.SKILLS[nb.node.tree].name.toLowerCase() + ' tree.');
      if (insQuest[q.id]) { s += 25; why.unshift('Addresses a pattern in your results: ' + insQuest[q.id].title.toLowerCase() + '.'); }
      else if (insSkill[q.skill]) { s += 8; }
      if (recentQuest[q.id]) s -= 18;
      if (doneToday[q.id]) s -= 40;
      if (q.partner > 0 && partner) { s += 12; why.push('You have a partner today, so live reps are the best use of them.'); }
      if (q.baseline) {
        const last = state.logs.filter(function (l) { return l.qid === q.id; }).map(function (l) { return l.date; }).sort().pop();
        const due = !last || daysBetween(last, key) >= 21;
        if (due && (!ready || ready.level === 'fresh') && (q.skill === p.primary || q.skill === p.secondary || !last)) { s += last ? 15 : 10; why.push(last ? 'Reassessment due: your last baseline was ' + daysBetween(last, key) + ' days ago.' : 'Sets a baseline so future progress is measurable.'); }
        else if (!due) s -= 15;
      }
      if (q.type === 'boss') { s += 6; why.push('Boss challenge unlocked. A milestone test of this tree.'); }
      if (q.type === 'athletic') why.push('No practice or game close by and you are fresh, so explosive work can be done at full quality.');
      if (q.type === 'recovery') s += maxLoad <= 1 ? 30 : -20;
      s += Math.max(0, 5 - Math.abs(minutes - q.dur) / 5);
      if (q.stage === 2) s += 2;
      cands.push({ kind: 'quest', id: q.id, q: q, score: s, why: baseReasons(q.skills).concat(why) });
    });

    // --- weight room / athletic development
    MX.WORKOUTS.forEach(function (w) {
      if (w.where === 'gym' && !spaces.gym) return;
      if (w.where === 'home' && !spaces.home) return;
      if (w.where === 'any' && !(spaces.court || spaces.home || spaces.gym)) return;
      if (w.dur > minutes + 5) return;
      if (w.load > maxLoad) return;
      if (legsRank(w.legs) > maxLegs) return;
      if (legsRank(w.legs) >= 2 && legsStrengthRecent) return;
      if (legsRank(w.legs) >= 2 && practiceLater) return;
      if (w.explosive && explosiveBlock) return;
      const r = MX.resolveWorkout(state, w); if (!r.ok) return;
      let s = Math.max(-0.1, deficit.str) * 100;
      const why = baseReasons({ str: 1 });
      const nodes = []; r.items.forEach(function (it) { MX.EXERCISE[it.id].nodes.forEach(function (n) { if (nodes.indexOf(n) < 0) nodes.push(n); }); });
      const nb = nodeBonus(nodes); s += nb.b; if (nb.node) why.push('Works toward "' + nb.node.name + '" in your strength tree.');
      if (strDays >= 4 && strDays < 99) { s += 12; why.push('Your last strength session was ' + strDays + ' days ago.'); }
      if (strDays === 99) { s += 8; why.push('Starts your athletic-development base with technique-first work.'); }
      if (strDays <= 1) s -= 25;
      if (recentQuest[w.id]) s -= 12;
      if (w.legs === 'none' && (gameTomorrow || practiceLater)) { s += 6; why.push('Leaves your legs fresh for ' + (gameTomorrow ? 'tomorrow\'s game.' : 'practice later today.')); }
      if (w.id === 'w-foundA' || w.id === 'w-foundB') s += 2;
      cands.push({ kind: 'gym', id: w.id, w: w, resolved: r, score: s, why: why.concat(['Weight-room work supports your basketball: it does not replace skill work, and it does not guarantee speed or jump gains.']).slice(0, 4) });
    });

    // --- missions and recovery
    const missions = [];
    if (practiceLater || (practiceToday && toMin(practiceToday.end) > nowMin - 120)) {
      const pool = MX.QUESTS.filter(function (q) { return q.type === 'team'; });
      pool.sort(function (a, b) { return (b.skill === p.primary ? 2 : b.skill === p.secondary ? 1 : 0) - (a.skill === p.primary ? 2 : a.skill === p.secondary ? 1 : 0); });
      missions.push({ kind: 'mission', id: pool[0].id, q: pool[0], event: practiceToday, why: ['Team practice today (' + MX.fmtTime(practiceToday.start) + ') is real development time. Bring one focus into it.'] });
    }
    if (gameToday) {
      const pool = MX.QUESTS.filter(function (q) { return q.type === 'game'; });
      pool.sort(function (a, b) { return (b.skill === p.primary ? 2 : b.skill === p.secondary ? 1 : 0) - (a.skill === p.primary ? 2 : a.skill === p.secondary ? 1 : 0); });
      missions.unshift({ kind: 'mission', id: pool[0].id, q: pool[0], event: gameToday, why: ['Game today (' + MX.fmtTime(gameToday.start) + '). This is where drill work becomes game application.'] });
    }
    cands.sort(function (a, b) { return b.score - a.score; });
    // Workout focus: a single-skill focus keeps only work that mainly trains that skill (no forced variety).
    let focusFallback = null;
    const fsk = MX.focusSkill ? MX.focusSkill(p, ctx.focus) : null;
    if (fsk) {
      const keepF = cands.filter(function (c) { return MX.candSkillWeight(c, fsk) >= 0.5 || (c.q && c.q.type === 'recovery' && maxLoad === 0); });
      if (keepF.some(function (c) { return !(c.q && c.q.type === 'recovery'); }) || maxLoad === 0) { cands.length = 0; keepF.forEach(function (c) { cands.push(c); }); }
      else focusFallback = 'No ' + MX.SKILLS[fsk].name.toLowerCase() + ' work fits today\'s limits, so other options are shown.';
    }

    // rest option is always available and never penalized
    const rest = { kind: 'quest', id: 'rec-rest', q: MX.QUEST['rec-rest'], score: 0, why: ['Rest is a valid choice any day. There is no streak to protect.'] };
    let main, alts;
    if (maxLoad === 0) {
      const rec = cands.filter(function (c) { return c.kind === 'quest' && c.q.load === 0; });
      main = missions[0] || rec[0] || rest;
      alts = (missions[0] ? rec.slice(0, 2) : rec.slice(1, 3)).concat([rest]).filter(function (x) { return x !== main; });
    } else {
      const top = cands.filter(function (c) { return !(c.q && c.q.type === 'recovery'); });
      main = missions[0] || top[0] || rest;
      const used = {}; if (main.q) used[main.q.skill] = 1; if (main.kind === 'gym') used.str = 1;
      alts = [];
      if (missions[0] && top[0]) { alts.push(top[0]); used[top[0].kind === 'gym' ? 'str' : top[0].q.skill] = 1; }
      top.forEach(function (c) {
        if (alts.length >= 3 || c === main || alts.indexOf(c) >= 0) return;
        const sk = c.kind === 'gym' ? 'str' : c.q.skill;
        if (!used[sk]) { alts.push(c); used[sk] = 1; }
      });
      top.forEach(function (c) { if (alts.length < 3 && c !== main && alts.indexOf(c) < 0) alts.push(c); });
    }
    if (!fac.hasCourt && ctx.loc === 'auto') reasonsGlobal.push('No court access on your schedule today, so only home, field or weight-room options are shown.');
    if (!fac.hasGym && ctx.loc === 'auto' && p.gymAccess) reasonsGlobal.push('The weight room is not open on your schedule today.');
    if (focusFallback) reasonsGlobal.unshift(focusFallback);
    return { flags: { gameTomorrow: !!gameTomorrow, gameLater: !!gameLater, practiceLater: !!practiceLater }, focusFallback: focusFallback, main: main, alts: alts.slice(0, 3), notes: notes, context: reasonsGlobal, all: cands, missions: missions, caps: { maxLoad: maxLoad, maxLegs: maxLegs, recent: recent }, spaces: spaces, insights: ins, mix: mix, targets: targets };
  };

  /* ---------- integrity checks (also run by tests and shown in Profile > Diagnostics) ---------- */
  MX.integrity = function () {
    const errs = [];
    Object.keys(MX.NODES).forEach(function (id) {
      const n = MX.NODES[id];
      n.req.forEach(function (r) { if (!MX.NODES[r]) errs.push(id + ' requires missing node ' + r); else if (MX.NODES[r].tree !== n.tree) errs.push(id + ' has cross-tree hard prerequisite ' + r); });
      if ((n.need || 1) > Math.max(1, n.req.length)) errs.push(id + ' needs more prerequisites than it lists');
      (n.x || []).forEach(function (r) { if (!MX.NODES[r]) errs.push(id + ' connects to missing node ' + r); });
      const qs = MX.QUESTS.filter(function (q) { return q.nodes.indexOf(id) >= 0; });
      const ex = MX.EXERCISES.filter(function (e) { return e.nodes.indexOf(id) >= 0; });
      if (n.goal !== 'game' && qs.length === 0 && ex.length === 0) errs.push(id + ' has no quest or exercise that can produce evidence');
      if (n.goal === 'pressure' && !qs.some(function (q) { return q.stage >= 2; })) errs.push(id + ' asks for pressure evidence but has no applied (stage 2) quest');
      if (n.goal === 'pressure' && !qs.some(function (q) { return q.stage >= 2 && q.partner === 0; }) && !qs.some(function (q) { return q.stage >= 2 && q.alt; })) errs.push(id + ' pressure evidence requires a partner with no solo route');
    });
    MX.QUESTS.forEach(function (q) {
      q.nodes.forEach(function (n) { if (!MX.NODES[n]) errs.push('quest ' + q.id + ' links missing node ' + n); });
      Object.keys(q.skills).forEach(function (k) { if (!MX.SKILLS[k]) errs.push('quest ' + q.id + ' has unknown skill ' + k); });
      if (q.alt && !MX.QUEST[q.alt]) errs.push('quest ' + q.id + ' alt missing');
      ['purpose', 'transfer', 'prog', 'regr', 'recovery'].forEach(function (f) { if (!q[f]) errs.push('quest ' + q.id + ' missing ' + f); });
      if (!q.steps || !q.steps.length) errs.push('quest ' + q.id + ' missing steps');
    });
    MX.EXERCISES.forEach(function (e) { if (e.alt && !MX.EXERCISE[e.alt]) errs.push('exercise ' + e.id + ' alt missing'); e.nodes.forEach(function (n) { if (!MX.NODES[n]) errs.push('exercise ' + e.id + ' node missing ' + n); }); });
    MX.WORKOUTS.forEach(function (w) { w.items.forEach(function (it) { if (!MX.EXERCISE[it[0]]) errs.push('workout ' + w.id + ' missing exercise ' + it[0]); }); });
    // every node reachable: simulate a player who masters everything
    const fake = MX.defaultState(); const days = ['2026-01-05', '2026-01-07', '2026-01-09', '2026-01-11'];
    let i = 0;
    MX.QUESTS.forEach(function (q) {
      if (q.measure.kind === 'report') return;
      days.forEach(function (d) { fake.logs.push({ id: 'f' + (i++), kind: 'quest', qid: q.id, date: d, ts: i, att: 10, makes: 10, rating: 5, dur: q.dur }); });
    });
    days.forEach(function (d) { fake.logs.push({ id: 'g' + (i++), kind: 'gym', wid: 'x', date: d, ts: i, ex: MX.EXERCISES.map(function (e) { return { id: e.id, done: true, tech: 'solid' }; }) }); });
    days.forEach(function (d) { fake.logs.push({ id: 'r' + (i++), kind: 'game', date: d, ts: i, reports: Object.keys(MX.NODES).filter(function (n) { return MX.NODES[n].goal === 'game'; }).map(function (n) { return { skill: MX.NODES[n].tree, result: 'worked', node: n }; }) }); });
    const t = MX.computeTree(fake);
    Object.keys(MX.NODES).forEach(function (id) { if (!t.nodes[id].mastered) errs.push('node ' + id + ' cannot be mastered even with perfect evidence (tier ' + t.nodes[id].tier + ')'); });
    return errs;
  };
})(globalThis.MX = globalThis.MX || {});
