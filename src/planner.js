/* Session builder and week builder. Pure logic on top of MX.recommend, so every plan obeys the same
 * readiness, workload, facility, partner, schedule and specialization rules as single recommendations.
 * Plans are stored in state.plans[dateKey]; a block is complete when a log carries its id (log.plan). */
(function (MX) {
  const addDays = MX.addDays, toMin = MX.toMin, legsRank = MX.legsRank;

  /* ---------- workout focus ---------- */
  // focus: {mode: 'balanced' | 'primary' | 'secondary' | 'skill', skill?}
  MX.focusSkill = function (p, focus) {
    if (!focus || !focus.mode || focus.mode === 'balanced') return null;
    if (focus.mode === 'primary') return p.primary;
    if (focus.mode === 'secondary') return p.secondary;
    return MX.SKILLS[focus.skill] ? focus.skill : null;
  };
  MX.focusLabel = function (p, focus) {
    const k = MX.focusSkill(p, focus);
    return k ? MX.SKILLS[k].name + ' only' : 'Balanced';
  };
  MX.candSkillWeight = function (c, k) { return c.kind === 'gym' ? (k === 'str' ? 1 : 0) : (c.q.skills[k] || 0); };
  function candSkill(c) { return c.kind === 'gym' ? 'str' : c.q.skill; }
  function candDur(c) { return c.kind === 'gym' ? c.w.dur : c.q.dur; }
  function candLegs(c) { return c.kind === 'gym' ? c.w.legs : c.q.legs; }

  /* ---------- blocks ---------- */
  const CAT_ORDER = { warmup: 0, athletic: 1, skill: 2, cond: 4, gym: 5, recovery: 6, mission: 7, cooldown: 8 };
  MX.blockCat = function (b) {
    if (b.kind === 'gym') return 'gym';
    if (b.kind === 'warmup' || b.kind === 'cooldown' || b.kind === 'mission') return b.kind;
    const q = MX.QUEST[b.ref]; if (!q) return 'skill';
    return q.type === 'athletic' ? 'athletic' : q.type === 'cond' ? 'cond' : q.type === 'recovery' ? 'recovery' : 'skill';
  };
  function sortBlocks(blocks) {
    return blocks.slice().sort(function (a, b) {
      const d = CAT_ORDER[MX.blockCat(a)] - CAT_ORDER[MX.blockCat(b)];
      if (d) return d;
      const qa = MX.QUEST[a.ref], qb = MX.QUEST[b.ref];
      return (qa ? qa.stage : 0) - (qb ? qb.stage : 0);
    });
  }
  function fromCand(c) {
    return { id: MX.uid(), kind: c.kind === 'gym' ? 'gym' : 'quest', ref: c.kind === 'gym' ? c.w.id : c.q.id, dur: candDur(c), why: (c.why || []).slice(0, 2) };
  }
  MX.blockName = function (b) {
    if (b.kind === 'warmup') return 'Warm-up';
    if (b.kind === 'cooldown') return 'Cool-down';
    if (b.kind === 'gym') return MX.WORKOUT[b.ref] ? MX.WORKOUT[b.ref].name : 'Workout';
    return MX.QUEST[b.ref] ? MX.QUEST[b.ref].name : b.ref;
  };
  MX.blockDone = function (state, b) { return !!b.done || state.logs.some(function (l) { return l.plan === b.id; }); };
  function warmup(blocks, dur) {
    const cats = blocks.map(MX.blockCat), steps = ['2 minutes of easy jogging, skips and side shuffles.', 'Leg swings, walking lunges with a reach, hip openers and ankle rocks.'];
    if (cats.indexOf('athletic') >= 0 || blocks.some(function (b) { return legsRank(b.kind === 'gym' ? (MX.WORKOUT[b.ref] || {}).legs : (MX.QUEST[b.ref] || {}).legs) >= 2; })) steps.push('3 snap-downs and 3 build-up runs to about 80% speed.');
    if (cats.indexOf('skill') >= 0) steps.push('Form shots close to the rim and 1 minute of stationary handling with both hands.');
    if (cats.indexOf('gym') >= 0) steps.push('In the weight room, do a light first set of the first exercise.');
    return { id: MX.uid(), kind: 'warmup', dur: dur, steps: steps, why: ['Raises body temperature and prepares the movements you are about to train.'] };
  }
  function cooldown(dur) {
    return { id: MX.uid(), kind: 'cooldown', dur: dur, steps: ['1–2 minutes of easy walking.', 'Calf, hip flexor and hamstring stretches, about 30 seconds each side.', '1 minute of slow breathing: 4 seconds in, 6 seconds out.'], why: ['Brings your system down and starts recovery.'] };
  }

  /* ---------- session builder ----------
   * ctx: {key, nowMin, minutes, loc, partner, focus, strengthDay, keep: [completed blocks to preserve]} */
  MX.buildSession = function (state, ctx) {
    const p = state.profile, fs = MX.focusSkill(p, ctx.focus);
    const keep = (ctx.keep || []).filter(function (b) { return b.kind !== 'warmup' && b.kind !== 'cooldown'; });
    const keepDone = (ctx.keep || []);
    const rec = MX.recommend(state, { key: ctx.key, nowMin: ctx.nowMin, minutes: ctx.minutes, loc: ctx.loc || 'auto', partner: !!ctx.partner, focus: ctx.focus });
    const caps = rec.caps, notes = rec.notes.slice();
    const recovery = caps.maxLoad === 0;
    let cap = ctx.minutes;
    const why = rec.flags.gameTomorrow ? ' because you have a game tomorrow' : rec.flags.practiceLater ? ' because team practice is later today' : rec.flags.gameLater ? ' because you have a game today' : '';
    if (recovery) cap = Math.min(cap, 25); else if (caps.maxLoad <= 1 || why) cap = Math.min(cap, 35);
    if (cap < ctx.minutes) notes.push('Kept to ' + cap + ' minutes' + (why || ' because today calls for a lighter session') + '.');
    const warm = recovery ? 0 : cap >= 40 ? 8 : cap >= 20 ? 5 : 0, cool = recovery ? 0 : cap >= 30 ? 5 : 0;
    const keptMin = keep.reduce(function (t, b) { return t + (b.dur || 0); }, 0);
    let left = cap - warm - cool - keptMin;
    const usedRefs = {}; keep.forEach(function (b) { usedRefs[b.ref] = 1; });
    let pool = rec.all.filter(function (c) {
      if (c.q && (c.q.id === 'rec-rest' || c.q.type === 'team' || c.q.type === 'game')) return false;
      if (recovery) return c.q && (c.q.type === 'recovery' || c.q.type === 'film');
      return !(c.q && c.q.type === 'recovery');
    });
    if (fs) pool = pool.filter(function (c) { return MX.candSkillWeight(c, fs) >= 0.5; });
    const counts = { legs: 0, gym: 0, cond: 0, ath: 0 }, perSkill = {}, picks = [];
    keep.forEach(function (b) { const c = b.kind === 'gym' ? { kind: 'gym', w: MX.WORKOUT[b.ref] } : { kind: 'quest', q: MX.QUEST[b.ref] }; if (c.w || c.q) tally(c); });
    function tally(c) {
      if (legsRank(candLegs(c)) >= 2) counts.legs++;
      if (c.kind === 'gym') counts.gym++;
      if (c.q && c.q.type === 'cond') counts.cond++;
      if (c.q && c.q.type === 'athletic') counts.ath++;
      perSkill[candSkill(c)] = (perSkill[candSkill(c)] || 0) + 1;
    }
    function ok(c) {
      const d = candDur(c);
      if (!d || d > left || usedRefs[c.id]) return false;
      if (legsRank(candLegs(c)) >= 2 && counts.legs >= 1) return false;
      if (c.kind === 'gym' && counts.gym >= 1) return false;
      if (c.q && c.q.type === 'cond' && counts.cond >= 1) return false;
      if (c.q && c.q.type === 'athletic' && counts.ath >= (fs === 'str' ? 2 : 1)) return false;
      if (!fs && (perSkill[candSkill(c)] || 0) >= 2) return false;
      return true;
    }
    function take(c) { picks.push(c); usedRefs[c.id] = 1; left -= candDur(c); tally(c); }
    // Strength day: place one strength or explosiveness piece first so it is not squeezed out by skill work.
    if (ctx.strengthDay && (!fs || fs === 'str') && !recovery) {
      const reserve = fs ? 0 : Math.min(15, Math.max(0, left - 25));
      const g = pool.find(function (c) { return (c.kind === 'gym' || (c.q && c.q.type === 'athletic')) && ok(c) && candDur(c) <= left - reserve; });
      if (g) take(g);
    }
    const order = fs ? [] : [p.primary, p.secondary, 'other', 'other'];
    let guard = 0;
    while (left >= 8 && guard++ < 12) {
      const want = order.length ? order.shift() : null;
      let c = null;
      if (want && want !== 'other') c = pool.find(function (x) { return ok(x) && candSkill(x) === want; });
      else if (want === 'other') c = pool.find(function (x) { return ok(x) && candSkill(x) !== p.primary && candSkill(x) !== p.secondary && !perSkill[candSkill(x)]; });
      if (!c) c = pool.find(ok);
      if (!c) break;
      take(c);
    }
    const main = sortBlocks(keep.concat(picks.map(fromCand)));
    const blocks = [];
    const keptWarm = keepDone.find(function (b) { return b.kind === 'warmup'; }), keptCool = keepDone.find(function (b) { return b.kind === 'cooldown'; });
    if (keptWarm) blocks.push(keptWarm); else if (warm && main.length) blocks.push(warmup(main, warm));
    main.forEach(function (b) { blocks.push(b); });
    if (keptCool) blocks.push(keptCool); else if (cool && main.length) blocks.push(cooldown(cool));
    const unused = Math.max(0, left + (main.length ? 0 : warm + cool));
    if (!main.length) notes.push(fs ? 'No ' + MX.SKILLS[fs].name.toLowerCase() + ' work fits today\'s limits (time, place, partner, readiness or schedule). Try Balanced, more time or another location, or take the rest.' : 'Nothing fits today\'s limits. Rest is a good choice.');
    else if (unused >= 8) notes.push(fs ? unused + ' minutes left open: no more ' + MX.SKILLS[fs].name.toLowerCase() + ' work fits today\'s limits. Choose Balanced to fill them, or finish early.' : unused + ' minutes left open: nothing else fits today\'s limits.');
    return { id: MX.uid(), date: ctx.key, kind: recovery ? 'recovery' : 'session', minutes: ctx.minutes, cap: cap, focus: ctx.focus || { mode: 'balanced' }, loc: ctx.loc || 'auto', partner: !!ctx.partner, blocks: blocks, notes: notes, unused: unused, builtAt: Date.now() };
  };

  /* ---------- swaps ---------- */
  MX.swapOptions = function (state, plan, blockId, nowKey, nowMin) {
    const b = plan.blocks.find(function (x) { return x.id === blockId; }); if (!b || b.kind === 'warmup' || b.kind === 'cooldown' || b.kind === 'mission') return [];
    const p = state.profile, fs = MX.focusSkill(p, plan.focus);
    const rec = MX.recommend(state, { key: plan.date, nowMin: plan.date === nowKey ? nowMin : 0, minutes: b.dur + (plan.unused || 0), loc: plan.loc || 'auto', partner: !!plan.partner, focus: plan.focus });
    const used = {}; plan.blocks.forEach(function (x) { used[x.ref] = 1; });
    const cat = MX.blockCat(b), sk = b.kind === 'gym' ? 'str' : (MX.QUEST[b.ref] || {}).skill;
    const pool = rec.all.filter(function (c) {
      if (used[c.id] || (c.q && (c.q.type === 'team' || c.q.type === 'game' || c.q.id === 'rec-rest'))) return false;
      if (fs && MX.candSkillWeight(c, fs) < 0.5) return false;
      return MX.blockCat(fromCand(c)) === cat || cat === 'skill';
    });
    pool.sort(function (x, y) { return (candSkill(y) === sk) - (candSkill(x) === sk) || y.score - x.score; });
    return pool.slice(0, 4);
  };
  MX.applySwap = function (plan, blockId, cand) {
    const i = plan.blocks.findIndex(function (x) { return x.id === blockId; }); if (i < 0) return plan;
    const old = plan.blocks[i], nb = fromCand(cand);
    plan.unused = Math.max(0, (plan.unused || 0) + old.dur - nb.dur);
    plan.blocks[i] = nb;
    const head = plan.blocks.filter(function (x) { return x.kind === 'warmup'; }), tail = plan.blocks.filter(function (x) { return x.kind === 'cooldown' || x.kind === 'mission'; });
    plan.blocks = head.concat(sortBlocks(plan.blocks.filter(function (x) { return x.kind !== 'warmup' && x.kind !== 'cooldown' && x.kind !== 'mission'; }))).concat(tail);
    return plan;
  };
  MX.removeBlock = function (plan, blockId) {
    const b = plan.blocks.find(function (x) { return x.id === blockId; }); if (!b) return plan;
    plan.blocks = plan.blocks.filter(function (x) { return x.id !== blockId; });
    plan.unused = (plan.unused || 0) + (b.dur || 0);
    if (!plan.blocks.some(function (x) { return x.kind !== 'warmup' && x.kind !== 'cooldown'; })) plan.blocks = plan.blocks.filter(function (x) { return x.kind === 'mission'; });
    return plan;
  };

  /* ---------- time slots ---------- */
  function windows(state, key) {
    const ev = MX.eventsOn(state, key);
    const w = function (t) { return ev.filter(function (e) { return e.type === t; }).map(function (e) { return { start: e.start, end: e.end, len: toMin(e.end) - toMin(e.start), type: t, title: e.title }; }); };
    return { court: w('court'), gym: w('gym'), free: w('free') };
  }
  MX.planSlot = function (state, plan) {
    const W = windows(state, plan.date), p = state.profile;
    const needsGym = plan.blocks.some(function (b) { return b.kind === 'gym' && MX.WORKOUT[b.ref] && MX.WORKOUT[b.ref].where === 'gym'; });
    const needsCourt = plan.blocks.some(function (b) { const q = MX.QUEST[b.ref]; return b.kind === 'quest' && q && (q.space === 'court' || (q.space === 'hoop' && !p.homeHoop)); });
    const total = plan.blocks.reduce(function (t, b) { return t + (b.dur || 0); }, 0);
    let pick = null;
    const longest = function (arr) { return arr.slice().sort(function (a, b) { return b.len - a.len; })[0] || null; };
    if (needsGym) pick = longest(W.gym);
    if (!pick && needsCourt) pick = longest(W.court) || (p.courtAnytime ? longest(W.free) : null);
    if (!pick) pick = longest(W.free) || longest(W.court) || longest(W.gym);
    if (!pick) return { label: 'Any time that suits you', total: total };
    const end = Math.min(toMin(pick.end), toMin(pick.start) + total);
    const hh = function (m) { return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); };
    const where = pick.type === 'gym' ? 'weight room' : pick.type === 'court' ? 'court' : 'free time';
    let label = MX.fmtTime(pick.start) + '–' + MX.fmtTime(hh(end)) + ' · ' + where;
    if (needsGym && needsCourt) label += ' (court work before or after)';
    return { start: pick.start, end: hh(end), label: label, total: total, short: total > pick.len ? 'Longer than this ' + where + ' window (' + pick.len + ' min). Trim a block or split it.' : null };
  };

  /* ---------- day and week planning ---------- */
  function dayInfo(state, key) {
    const ev = MX.eventsOn(state, key);
    return { game: ev.find(function (e) { return e.type === 'game'; }), practice: ev.find(function (e) { return e.type === 'practice'; }), sport: ev.find(function (e) { return e.type === 'sport'; }) };
  }
  function sessionMinutes(state, key) {
    const W = windows(state, key), all = W.court.concat(W.free).concat(W.gym);
    const best = all.reduce(function (m, w) { return Math.max(m, w.len); }, 0);
    return Math.max(15, best ? Math.min(state.profile.duration || 45, best) : (state.profile.duration || 45));
  }
  function pseudoLogs(plan) {
    return plan.blocks.filter(function (b) { return b.kind === 'quest' || b.kind === 'gym'; }).map(function (b, i) {
      return b.kind === 'gym' ? { id: 'plan-' + b.id, kind: 'gym', wid: b.ref, date: plan.date, ts: i, dur: b.dur, ex: [] } : { id: 'plan-' + b.id, kind: 'quest', qid: b.ref, date: plan.date, ts: i, dur: b.dur };
    });
  }
  /* opts: {todayKey, nowMin, focus, partner, strengthDay, rest} */
  MX.planDay = function (state, key, opts) {
    const info = dayInfo(state, key), isToday = key === opts.todayKey;
    const nowMin = isToday ? opts.nowMin : 0;
    const focus = opts.focus || { mode: 'balanced' };
    let plan;
    if (opts.rest) {
      plan = { id: MX.uid(), date: key, kind: 'rest', focus: focus, blocks: [], notes: ['Full rest day. Sleep, eat well and let training turn into improvement.'], unused: 0, partner: !!opts.partner, loc: 'auto', minutes: 0 };
    } else if (info.game || info.practice) {
      const rec = MX.recommend(state, { key: key, nowMin: Math.min(nowMin, toMin((info.game || info.practice).start) - 1), minutes: 15, loc: 'auto', partner: !!opts.partner, focus: focus });
      const fs = MX.focusSkill(state.profile, focus);
      const ms = rec.missions.slice().sort(function (a, b) { return (b.q.skill === fs) - (a.q.skill === fs); });
      const m = ms[0];
      const blocks = m ? [{ id: MX.uid(), kind: 'mission', ref: m.q.id, dur: 0, why: m.why.slice(0, 1) }] : [];
      const notes = [info.game ? 'Game day. The game is the session; keep anything before it light.' : 'Team practice is real development time and counts as training load.'];
      const extra = rec.all.find(function (c) { return c.q && c.q.load <= 1 && c.q.dur <= 15 && c.q.type !== 'recovery' && (!fs || MX.candSkillWeight(c, fs) >= 0.5) && c.q.type !== 'team' && c.q.type !== 'game'; });
      if (extra && !info.game) { const b = fromCand(extra); b.optional = true; b.why = ['Optional, light, and only if you feel fresh. Skipping it is fine.']; blocks.unshift(b); }
      plan = { id: MX.uid(), date: key, kind: info.game ? 'game' : 'practice', focus: focus, blocks: blocks, notes: notes, unused: 0, partner: !!opts.partner, loc: 'auto', minutes: extra && !info.game ? extra.q.dur : 0 };
    } else {
      plan = MX.buildSession(state, { key: key, nowMin: nowMin, minutes: opts.minutes || sessionMinutes(state, key), loc: 'auto', partner: !!opts.partner, focus: focus, strengthDay: !!opts.strengthDay, keep: opts.keep });
    }
    const ev = info.game || info.practice;
    if (plan.kind === 'rest') plan.slot = { label: 'Rest day', total: 0 };
    else if (ev) plan.slot = { start: ev.start, end: ev.end, label: MX.fmtTime(ev.start) + '–' + MX.fmtTime(ev.end) + ' · ' + ev.title, total: plan.minutes };
    else plan.slot = MX.planSlot(state, plan);
    if (plan.slot.short) plan.notes = plan.notes.concat([plan.slot.short]);
    return plan;
  };

  /* Plans every day from max(start, today) to end. Days with completed blocks are kept as they are. */
  MX.buildWeek = function (state, opts) {
    const p = state.profile, todayKey = opts.todayKey;
    const days = [];
    for (let k = opts.start; k <= opts.end; k = addDays(k, 1)) if (k >= todayKey) days.push(k);
    const plans = {}, weekNotes = [];
    const temp = Object.assign({}, state, { logs: state.logs.slice() });
    const kept = {};
    days.forEach(function (k) { const ex = (state.plans || {})[k]; if (ex && ex.blocks && ex.blocks.some(function (b) { return MX.blockDone(state, b); })) kept[k] = ex; });
    const info = {}; days.forEach(function (k) { info[k] = dayInfo(state, k); });
    const busy = function (k) { const i = info[k] || dayInfo(state, k); return !!(i.game || i.practice || i.sport); };
    const free = days.filter(function (k) { return !busy(k) && !kept[k]; });
    // Rest: at least one full rest day in any planned span of 4+ days, preferring the day after a game.
    const restDays = {};
    const loggedToday = state.logs.some(function (l) { return l.date === todayKey && l.kind !== 'rest'; });
    const restable = free.filter(function (k) { return !(k === todayKey && loggedToday); });
    const alreadyRest = days.some(function (k) { return state.logs.some(function (l) { return l.kind === 'rest' && l.date === k; }); });
    if (days.length >= 4 && restable.length && !alreadyRest) {
      const afterGame = restable.find(function (k) { return dayInfo(state, addDays(k, -1)).game; });
      const streak = function (k) { let n = 0; for (let i = 1; i <= 3; i++) { if (busy(addDays(k, -i))) n++; else break; } return n; };
      const best = afterGame || restable.slice().sort(function (a, b) { return streak(b) - streak(a) || (a < b ? 1 : -1); })[0];
      restDays[best] = true;
    } else if (days.length >= 4 && !restable.length) weekNotes.push('Every remaining day has a practice, game or logged work, so there is no full rest day. Keep extra work light and sleep well.');
    // Strength / explosiveness: up to 2 non-adjacent training days, never the day before a game, preferring weight-room days.
    const strengthOk = p.gymAccess || MX.resolveWorkout(state, MX.WORKOUT['w-home']).ok;
    const strengthDays = {}, existing = {};
    const hasStrength = function (k) {
      const pl = kept[k] || (k < todayKey ? null : null);
      const inPlan = pl && pl.blocks.some(function (b) { return b.kind === 'gym' || MX.blockCat(b) === 'athletic'; });
      const inLogs = state.logs.some(function (l) { return l.date === k && (l.kind === 'gym' || l.kind === 'custom' || (l.kind === 'quest' && MX.QUEST[l.qid] && MX.QUEST[l.qid].type === 'athletic')); });
      return inPlan || inLogs;
    };
    for (let k = addDays(days[0] || todayKey, -1); k <= (days[days.length - 1] || todayKey); k = addDays(k, 1)) if (hasStrength(k)) existing[k] = true;
    const strengthCount = function () { return Object.keys(strengthDays).length + days.filter(function (k) { return existing[k]; }).length; };
    if (strengthOk) {
      const cands = free.filter(function (k) { return !restDays[k] && !dayInfo(state, addDays(k, 1)).game; })
        .sort(function (a, b) { return (MX.facilities(state, b).hasGym ? 1 : 0) - (MX.facilities(state, a).hasGym ? 1 : 0) || (a < b ? -1 : 1); });
      cands.forEach(function (k) {
        if (strengthCount() >= 2 || existing[k]) return;
        const near = function (d) { return strengthDays[d] || existing[d]; };
        if (near(addDays(k, -1)) || near(addDays(k, 1))) return;
        strengthDays[k] = true;
      });
    }
    days.forEach(function (k) {
      if (kept[k]) { plans[k] = kept[k]; temp.logs = temp.logs.concat(pseudoLogs({ date: k, blocks: kept[k].blocks.filter(function (b) { return !MX.blockDone(state, b); }) })); return; }
      const plan = MX.planDay(temp, k, { todayKey: todayKey, nowMin: opts.nowMin, focus: (opts.focusByDay && opts.focusByDay[k]) || opts.focus, partner: opts.partner, strengthDay: !!strengthDays[k], rest: !!restDays[k] });
      plans[k] = plan;
      temp.logs = temp.logs.concat(pseudoLogs(plan)); // later days see this day's planned load and variety
    });
    return { plans: plans, notes: weekNotes, days: days, rest: Object.keys(restDays), strength: Object.keys(strengthDays) };
  };

  /* Drop plans older than three weeks so saves stay small. */
  MX.prunePlans = function (state, todayKey) {
    const cut = addDays(todayKey, -21), out = {};
    Object.keys(state.plans || {}).forEach(function (k) { if (k >= cut) out[k] = state.plans[k]; });
    state.plans = out;
  };
})(globalThis.MX = globalThis.MX || {});
