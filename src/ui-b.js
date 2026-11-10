/* UI part B: home, readiness, recommendation cards, quest/mission/gym logging, reward summary. */
const SPACE_LABEL = { court: 'Court', hoop: 'Any hoop', home: 'At home', field: 'Open space', any: 'Anywhere' };
const PARTNER_LABEL = ['Solo', 'Needs a helper', 'Needs a live defender'];
const STAGE_LABEL = { 1: 'Technique', 2: 'Applied', 3: 'Game' };
const KIND_LABEL = { skill: 'Skill quest', boss: 'Boss challenge', team: 'Practice mission', game: 'Game mission', film: 'Film study', recovery: 'Recovery', cond: 'Conditioning' };

function viewHome() {
  const k = today(), s0 = st(), prog = MX.progress(s0, k), ctx = todayCtx();
  const rec = MX.recommend(s0, { key: k, nowMin: nowMin(), minutes: ctx.minutes, loc: ctx.loc, partner: ctx.partner });
  return h('div', { class: 'wrap' },
    header(prog),
    readinessCard(k),
    setupCard(k, ctx),
    recCard(rec),
    insightsCard(rec.insights.slice(0, 2)),
    focusCard(rec),
    recentCard(prog, k),
    upcomingCard(k));
}

function readinessCard(k) {
  const s0 = st(), r = s0.readiness[k];
  function set(level) {
    const prev = s0.readiness[k] || {};
    s0.readiness[k] = Object.assign({ sore: 'none', pain: false }, prev, { level: level });
    commit();
  }
  if (r && !A.editReady) {
    const lab = { fresh: 'Fresh', tired: 'Somewhat tired', very: 'Very fatigued' }[r.level];
    return h('div', { class: 'card', style: { padding: '10px 14px' } }, h('div', { class: 'row between nowrap' },
      h('div', { class: 'grow' }, h('span', { class: 'eyebrow' }, 'Readiness today'), h('div', { style: { fontWeight: 600 } }, lab + (r.sore !== 'none' ? ' · ' + (r.sore === 'mild' ? 'mild soreness' : 'significant soreness') : '') + (r.pain ? ' · pain reported' : ''))),
      h('button', { class: 'btn sm', onclick: function () { A.editReady = true; render(); } }, 'Change')),
      r.pain ? h('div', { class: 'note safety' }, 'Pain that is not normal soreness: skip anything that makes it worse and tell a parent or trusted adult. If it lasts or keeps coming back, see a qualified healthcare professional.') : null);
  }
  const cur = r ? r.level : null;
  return h('div', { class: 'card' },
    h('div', { class: 'row between' }, h('h3', null, 'How do you feel today?'), r ? h('button', { class: 'link', onclick: function () { A.editReady = false; render(); } }, 'Done') : null),
    h('div', { class: 'ready' },
      [['fresh', 'Fresh', 'Ready to work'], ['tired', 'Tired', 'Somewhat tired'], ['very', 'Drained', 'Very fatigued']].map(function (o) {
        return h('button', { 'aria-pressed': cur === o[0] ? 'true' : 'false', id: 'ready-' + o[0], onclick: function () { set(o[0]); } }, h('b', null, o[1]), h('span', { class: 'muted xs' }, o[2]));
      })),
    r ? h('div', { class: 'stack' },
      h('div', { class: 'eyebrow' }, 'Soreness (optional)'),
      chipGroup([['none', 'None'], ['mild', 'Mild'], ['high', 'Significant']], r.sore, function (v) { r.sore = v; commit(); }),
      toggleRow('Pain (not normal soreness)', 'Sharp, joint, or pain that changes how you move.', !!r.pain, function (v) { r.pain = v; commit(); })) :
      h('p', { class: 'muted small' }, 'One tap. It adjusts today\'s recommendation. Skipping it is fine.'));
}

function setupCard(k, ctx) {
  const fac = MX.facilities(st(), k);
  const facTxt = [];
  if (fac.court.length) facTxt.push('Court ' + fac.court.map(function (e) { return MX.fmtTime(e.start) + '–' + MX.fmtTime(e.end); }).join(', '));
  else if (P().courtAnytime) facTxt.push('Court access: most days'); else facTxt.push('No court window today');
  if (P().gymAccess) facTxt.push(fac.gym.length ? 'Weight room ' + fac.gym.map(function (e) { return MX.fmtTime(e.start) + '–' + MX.fmtTime(e.end); }).join(', ') : 'Weight room closed today');
  const upd = function (key, v) { ctx[key] = v; commit(); };
  return h('div', { class: 'card' },
    h('div', { class: 'row between' }, h('span', { class: 'eyebrow' }, 'Today\'s setup'), h('span', { class: 'xs muted' }, facTxt.join(' · '))),
    h('div', { class: 'chips scroll' }, [15, 20, 30, 45, 60, 90].map(function (m) { return chip(m + ' min', ctx.minutes === m, function () { upd('minutes', m); }); })),
    h('div', { class: 'chips scroll' },
      [['auto', 'Use my schedule'], ['court', 'At a court'], ['gym', 'Weight room'], ['home', 'At home']].map(function (o) { return chip(o[1], ctx.loc === o[0], function () { upd('loc', o[0]); }); }),
      chip(ctx.partner ? 'Partner with me' : 'Training solo', ctx.partner, function () { upd('partner', !ctx.partner); })));
}

function candMeta(c) {
  if (c.kind === 'gym') return [c.w.dur + ' min', c.w.legs === 'none' ? 'Upper body' : c.w.legs === 'heavy' ? 'Heavy legs' : 'Full body', c.w.where === 'home' ? 'At home' : 'Weight room'];
  const q = c.q; const m = [];
  if (q.dur) m.push(q.dur + ' min');
  m.push(MX.SKILLS[q.skill].name);
  if (q.stage) m.push(STAGE_LABEL[q.stage]);
  if (q.partner) m.push(PARTNER_LABEL[q.partner]);
  return m;
}
function candKind(c) { return c.kind === 'gym' ? 'Weight room' : KIND_LABEL[c.q.type] || 'Skill quest'; }
function candName(c) { return c.kind === 'gym' ? c.w.name : c.q.name; }
function startCandidate(c) {
  if (c.kind === 'gym') return openGymRun(c.w);
  if (c.kind === 'mission' || c.q.type === 'team' || c.q.type === 'game') return openReport({ mission: c.q, context: c.q.type === 'game' ? 'game' : 'practice' });
  if (c.q.id === 'rec-rest') return logRest();
  return openQuestRun(c.q);
}
function recCard(rec) {
  const m = rec.main;
  const purpose = m.kind === 'gym' ? m.w.purpose : m.q.purpose;
  return h('div', { class: 'card hero court-hero', id: 'rec-card' }, courtLines(),
    h('div', { class: 'row' }, h('span', { class: 'tag blue' }, 'Recommended · ' + candKind(m))),
    h('h2', { style: { fontSize: '28px' } }, candName(m)),
    h('div', { class: 'row muted small' }, candMeta(m).join(' · ')),
    h('p', { class: 'small', style: { color: 'var(--silver)' } }, purpose),
    h('div', { class: 'stack', style: { gap: '4px' } }, h('div', { class: 'eyebrow' }, 'Why this, today'), h('ul', { class: 'why small' }, (m.why || []).concat(rec.context).slice(0, 4).map(function (w) { return h('li', null, w); }))),
    rec.notes.length ? h('div', { class: 'note' }, rec.notes.join(' ')) : null,
    h('button', { class: 'btn start block', id: 'start-quest', onclick: function () { startCandidate(m); } }, m.kind === 'mission' ? 'Start mission' : 'Start quest'),
    h('div', { class: 'row' }, h('button', { class: 'link', onclick: function () { showDetail(m); } }, 'Full details'), h('span', { class: 'muted' }, '·'), h('button', { class: 'link', onclick: function () { logRest(); } }, 'Rest today instead')),
    rec.alts.length ? h('div', { class: 'stack', style: { gap: '0' } }, h('div', { class: 'eyebrow', style: { marginTop: '4px' } }, 'Alternatives'),
      h('div', { class: 'list' }, rec.alts.map(function (c) {
        return h('button', { class: 'item', onclick: function () { showDetail(c); } },
          c.kind === 'gym' ? skillIcon('str') : skillIcon(c.q.skill),
          h('div', { class: 'grow' }, h('div', { class: 'title' }, candName(c)), h('div', { class: 'muted small' }, candKind(c) + ' · ' + candMeta(c).slice(0, 2).join(' · '))),
          icon('chev', 18));
      }))) : null);
}
function showDetail(c) {
  if (c.kind === 'gym') return workoutDetail(c.w);
  return questDetail(c.q, c.why);
}

function insightsCard(list) {
  if (!list.length) return null;
  const s0 = st();
  return h('div', { class: 'card' },
    h('div', { class: 'row between' }, h('h3', null, 'Patterns in your results'), h('span', { class: 'xs muted' }, 'Rule-based, from your logs')),
    list.map(function (i) {
      const q = (i.quest || []).map(function (id) { return MX.QUEST[id]; }).filter(Boolean)[0];
      return h('div', { class: 'stack', style: { gap: '6px', borderTop: '1px solid var(--line)', paddingTop: '10px' } },
        h('div', { class: 'row' }, h('span', { class: 'tag ' + (i.kind === 'hypothesis' ? 'warn' : 'cyan') }, i.kind === 'hypothesis' ? 'Hypothesis' : 'Observation'), h('b', null, i.title)),
        h('p', { class: 'small' }, i.text),
        h('p', { class: 'xs muted' }, 'Evidence: ' + i.evidence),
        h('div', { class: 'row' },
          q ? h('button', { class: 'btn sm primary', onclick: function () { questDetail(q, ['Suggested because: ' + i.title.toLowerCase() + '.']); } }, 'Try ' + q.name) : null,
          h('button', { class: 'btn sm ghost', onclick: function () { s0.insights[i.id] = { until: MX.addDays(today(), 3) }; commit(); toast('Postponed for 3 days'); } }, 'Later'),
          h('button', { class: 'btn sm ghost', onclick: function () { s0.insights[i.id] = { until: MX.addDays(today(), 21) }; commit(); toast('Dismissed for 3 weeks'); } }, 'Dismiss')));
    }));
}

function mixBar(mix, targets) {
  return h('div', { class: 'stack', style: { gap: '6px' } },
    h('div', { class: 'mixbar', role: 'img', 'aria-label': 'Training mix over 14 days' }, MX.SKILL_KEYS.map(function (k) { return h('i', { style: { width: (mix.share[k] * 100) + '%', background: MX.SKILLS[k].color } }); })),
    h('div', { class: 'legend' }, MX.SKILL_KEYS.filter(function (k) { return mix.share[k] > 0.005 || targets[k] >= 0.2; }).map(function (k) { return h('span', { style: { '--c': MX.SKILLS[k].color } }, MX.SKILLS[k].short + ' ' + pct(mix.share[k])); })));
}
function focusCard(rec) {
  const p = P(), mix = rec.mix, t = rec.targets;
  const line = function (k, label) {
    return h('div', { class: 'row between nowrap' }, h('div', { class: 'row nowrap', style: { gap: '10px', minWidth: 0 } }, skillIcon(k, 32), h('div', { style: { minWidth: 0 } }, h('div', { class: 'xs muted' }, label), h('div', { style: { fontWeight: 600 } }, MX.SKILLS[k].name))),
      h('div', { class: 'tnum small', style: { textAlign: 'right' } }, mix.own > 0 ? pct(mix.share[k]) : '—', h('div', { class: 'xs muted' }, 'target ' + pct(t[k]))));
  };
  return h('div', { class: 'card' },
    h('div', { class: 'row between' }, h('h3', null, 'Development focus'), h('button', { class: 'link', onclick: function () { setTab('profile'); } }, 'Change')),
    line(p.primary, 'Primary'), line(p.secondary, 'Secondary'),
    mix.own > 0 ? mixBar(mix, t) : h('p', { class: 'muted small' }, 'Your 14-day training mix appears here once you log sessions.'),
    h('p', { class: 'xs muted' }, 'Last 14 days of optional skill work. Team practice counts toward general maintenance (' + Math.round(mix.practiceMin) + ' practice minutes on your schedule).'));
}
function logSummary(l) {
  if (l.kind === 'quest') { const q = MX.QUEST[l.qid]; const sc = MX.score(l); return { name: q ? q.name : l.qid, skill: q ? q.skill : 'fin', res: q && q.measure.kind === 'makes' && l.att ? l.makes + '/' + l.att + ' (' + pct(sc) + ')' : q && q.measure.kind === 'rating' && l.rating ? 'Quality ' + l.rating + '/5' : 'Completed' }; }
  if (l.kind === 'gym') { const w = MX.WORKOUT[l.wid]; return { name: w ? w.name : 'Workout', skill: 'str', res: (l.ex || []).filter(function (x) { return x.done; }).length + ' exercises' + (l.rpe ? ' · RPE ' + l.rpe : '') }; }
  if (l.kind === 'custom') return { name: l.name || 'Coach-assigned workout', skill: 'str', res: (l.dur || '?') + ' min' };
  if (l.kind === 'game') return { name: 'Game report · ' + (l.context || 'game'), skill: (l.reports && l.reports[0] && l.reports[0].skill) || 'iq', res: (l.reports || []).map(function (r) { return MX.SKILLS[r.skill].short + ' ' + (r.result === 'worked' ? '✓' : r.result === 'mixed' ? '~' : '✗'); }).join(' ') };
  if (l.kind === 'rest') return { name: 'Rest day', skill: 'cond', res: 'Recovery' };
  return { name: l.kind, skill: 'iq', res: '' };
}
function recentCard(prog, k) {
  const logs = st().logs.slice().sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : (b.ts || 0) - (a.ts || 0); }).slice(0, 4);
  const miles = prog.ledger.filter(function (x) { return /^(Benchmark|Under pressure|Game-applied|Boss cleared)/.test(x.label) && MX.daysBetween(x.date, k) <= 14; }).slice(-3).reverse();
  return h('div', { class: 'card' },
    h('div', { class: 'row between' }, h('h3', null, 'Recent progress'), h('button', { class: 'link', onclick: function () { A.progress = 'history'; setTab('progress'); } }, 'History')),
    miles.length ? h('div', { class: 'stack', style: { gap: '6px' } }, miles.map(function (m) { return h('div', { class: 'row nowrap small' }, icon('star', 16), h('span', { class: 'grow' }, m.label), h('span', { class: 'tag good' }, '+' + m.xp)); })) : null,
    logs.length ? h('div', { class: 'list' }, logs.map(function (l) {
      const sm = logSummary(l);
      return h('div', { class: 'item' }, skillIcon(sm.skill, 34), h('div', { class: 'grow' }, h('div', { class: 'title small' }, sm.name), h('div', { class: 'xs muted' }, relDay(l.date) + ' · ' + sm.res)));
    })) : h('p', { class: 'muted small' }, 'Nothing logged yet. Start the recommended quest above. Logging takes a few taps.'));
}
function upcomingCard(k) {
  const ev = MX.nextEvents(st(), k, nowMin(), 4);
  return h('div', { class: 'card' },
    h('div', { class: 'row between' }, h('h3', null, 'Coming up'), h('button', { class: 'link', onclick: function () { setTab('schedule'); } }, 'Schedule')),
    ev.length ? h('div', { class: 'list' }, ev.map(function (x) {
      return h('div', { class: 'item' }, h('span', { class: 'evbar', style: { background: evColor(x.ev.type), height: '30px' } }),
        h('div', { class: 'grow' }, h('div', { class: 'title small' }, x.ev.title), h('div', { class: 'xs muted' }, relDay(x.key) + ' · ' + MX.fmtTime(x.ev.start) + '–' + MX.fmtTime(x.ev.end))));
    })) : h('p', { class: 'muted small' }, 'No practices, games or facility windows in the next two weeks.'));
}

/* ---------- quest detail ---------- */
function nodeChip(id, tree) {
  const n = MX.NODES[id], o = tree.nodes[id];
  return h('button', { class: 'chip', onclick: function () { nodeSheet(id); } }, h('span', { class: 'ndot ' + (o.mastered ? 'on' : o.unlocked ? 'open' : 'off') }), MX.SKILLS[n.tree].short + ' · ' + (n.short || n.name));
}
function questDetail(q, why) {
  const tree = MX.computeTree(st()).nodes;
  const locked = q.nodes.length && !q.nodes.some(function (n) { return tree[n].unlocked; });
  openSheet({
    eyebrow: (KIND_LABEL[q.type] || 'Skill quest') + ' · ' + MX.SKILLS[q.skill].name, title: q.name,
    sub: [q.dur ? q.dur + ' min' : null, 'Difficulty ' + q.diff + '/3', STAGE_LABEL[q.stage], SPACE_LABEL[q.space], PARTNER_LABEL[q.partner]].filter(Boolean).join(' · '),
    body: function () {
      return [
        why && why.length ? h('div', { class: 'note info' }, why.join(' ')) : null,
        locked ? h('div', { class: 'note' }, 'This quest belongs to skill nodes you have not unlocked yet. You can still do it; results are recorded as evidence and count once the node unlocks.') : null,
        q.problem ? h('p', null, h('b', null, 'Problem: '), q.problem) : null,
        h('div', { class: 'stack' }, h('div', { class: 'eyebrow' }, 'How to do it'), h('ol', { class: 'steps' }, q.steps.map(function (x) { return h('li', null, x); }))),
        q.measure.kind !== 'report' ? h('div', { class: 'card', style: { background: 'var(--surface-2)' } }, h('div', { class: 'eyebrow' }, 'Measurable objective'),
          h('div', null, q.measure.kind === 'makes' ? 'Record ' + q.measure.label.toLowerCase() + ' out of ' + q.measure.of.toLowerCase() + ' (about ' + q.measure.att + '). Benchmark: ' + pct(q.bench) + ' or better.' : q.measure.kind === 'rating' ? 'Rate the quality of your reps 1–5. Benchmark: ' + Math.round(q.bench * 5) + '/5 or better.' : 'Complete it.')) : null,
        h('dl', { class: 'kv' },
          h('dt', null, 'Purpose'), h('dd', null, q.purpose),
          h('dt', null, 'Game transfer'), h('dd', null, q.transfer),
          h('dt', null, 'Progression'), h('dd', null, q.prog),
          h('dt', null, 'Regression'), h('dd', null, q.regr),
          h('dt', null, 'Recovery'), h('dd', null, q.recovery),
          h('dt', null, 'Equipment'), h('dd', null, q.space === 'home' ? 'Ball (and a wall for passing drills)' : q.space === 'field' ? 'Open space, cones optional' : q.space === 'any' ? 'Your practice or game' : 'Ball and hoop. Cones or a chair help.')),
        q.alt ? h('p', { class: 'small' }, 'No partner today? Solo alternative: ', h('button', { class: 'link', onclick: function () { closeSheet(); questDetail(MX.QUEST[q.alt]); } }, MX.QUEST[q.alt].name)) : null,
        q.nodes.length ? h('div', { class: 'stack' }, h('div', { class: 'eyebrow' }, 'Skill-tree nodes this builds'), h('div', { class: 'chips' }, q.nodes.map(function (n) { return nodeChip(n, { nodes: tree }); }))) : null
      ];
    },
    foot: function () { return h('button', { class: 'btn start block', onclick: function () { closeSheet(); startCandidate({ kind: 'quest', q: q }); } }, q.type === 'team' || q.type === 'game' ? 'Start mission' : q.id === 'rec-rest' ? 'Log rest day' : 'Start quest'); }
  });
}

/* ---------- quest run & logging ---------- */
function openQuestRun(q, opts) {
  opts = opts || {};
  const run = { makes: 0, att: 0, rating: null, notes: '', dur: q.dur, history: [] };
  const m = q.measure;
  openSheet({
    eyebrow: (opts.testOut ? 'Prove it · ' : '') + (KIND_LABEL[q.type] || 'Skill quest'), title: q.name, modal: true,
    sub: (q.dur ? q.dur + ' min · ' : '') + STAGE_LABEL[q.stage] + ' stage',
    body: function (api) {
      const out = [];
      if (opts.testOut) out.push(h('div', { class: 'note info' }, 'Prove-it attempt for "' + MX.NODES[opts.testOut].name + '". Score ' + pct(Math.min(1, q.bench + 0.1)) + ' or better to unlock it now without its prerequisites.'));
      out.push(h('details', { open: true }, h('summary', null, 'Instructions'), h('div', null, h('ol', { class: 'steps small' }, q.steps.map(function (x) { return h('li', null, x); })))));
      if (m.kind === 'makes') {
        const rate = run.att ? run.makes / run.att : null;
        out.push(h('div', { class: 'card', style: { background: 'var(--surface-2)' } },
          h('div', { class: 'row between' }, h('span', { class: 'eyebrow' }, m.label + ' / ' + m.of), h('span', { class: 'tag ' + (rate == null ? '' : rate >= q.bench ? 'good' : 'warn') }, rate == null ? 'Benchmark ' + pct(q.bench) : pct(rate))),
          h('div', { class: 'counter' },
            h('button', { class: 'tap miss', id: 'tap-miss', onclick: function () { run.att++; run.history.push('m'); api.refresh(); } }, 'Miss'),
            h('div', { class: 'big tnum', 'aria-live': 'polite' }, run.makes + '/' + run.att),
            h('button', { class: 'tap make', id: 'tap-make', onclick: function () { run.makes++; run.att++; run.history.push('k'); api.refresh(); } }, 'Make')),
          h('div', { class: 'row between' },
            h('button', { class: 'btn sm ghost', disabled: !run.history.length ? true : null, onclick: function () { const x = run.history.pop(); if (x === 'k') { run.makes--; run.att--; } else if (x === 'm') run.att--; api.refresh(); } }, 'Undo'),
            h('div', { class: 'row nowrap small muted' }, 'Or type:',
              h('input', { type: 'number', inputmode: 'numeric', min: 0, id: 'in-makes', value: run.makes, style: { width: '68px' }, 'aria-label': m.label, onchange: function (e) { run.makes = Math.max(0, parseInt(e.target.value, 10) || 0); run.att = Math.max(run.att, run.makes); run.history = []; api.refresh(); } }),
              '/',
              h('input', { type: 'number', inputmode: 'numeric', min: 0, id: 'in-att', value: run.att, style: { width: '68px' }, 'aria-label': m.of, onchange: function (e) { run.att = Math.max(0, parseInt(e.target.value, 10) || 0); run.makes = Math.min(run.makes, run.att); run.history = []; api.refresh(); } })))));
      } else if (m.kind === 'rating') {
        out.push(h('div', { class: 'stack' }, h('div', { class: 'eyebrow' }, m.label), chipGroup([[1, '1'], [2, '2'], [3, '3'], [4, '4'], [5, '5']], run.rating, function (v) { run.rating = v; api.refresh(); }, false, true),
          h('div', { class: 'xs muted' }, '1 = could not hold quality · 3 = okay · 5 = every rep sharp')));
      }
      out.push(h('div', { class: 'row' },
        q.dur ? field('Minutes', h('input', { type: 'number', inputmode: 'numeric', id: 'in-dur', min: 1, value: run.dur, style: { width: '100px' }, onchange: function (e) { run.dur = Math.max(1, parseInt(e.target.value, 10) || q.dur); } })) : null),
        field('Notes (optional)', h('textarea', { id: 'in-notes', placeholder: 'What felt different? Distance, defender, conditions…', oninput: function (e) { run.notes = e.target.value; } }, run.notes)));
      out.push(h('p', { class: 'xs muted' }, q.recovery));
      return out;
    },
    foot: function () {
      return [h('button', { class: 'btn ghost', onclick: function () { closeSheet(); } }, 'Cancel'),
        h('button', { class: 'btn primary grow', id: 'log-quest', onclick: function () {
          const log = { id: MX.uid(), kind: 'quest', qid: q.id, date: today(), ts: Date.now(), dur: q.dur ? run.dur : 0, notes: run.notes.trim() };
          if (m.kind === 'makes' && run.att > 0) { log.makes = run.makes; log.att = run.att; }
          if (m.kind === 'rating' && run.rating) log.rating = run.rating;
          if (opts.testOut) log.testOut = opts.testOut;
          const ctx = st().today; if (q.partner && ctx) log.partner = true;
          logAndReward(log, function (before, after) {
            const sc = MX.score(log);
            if (sc == null) return m.kind === 'done' ? 'Completed.' : 'Logged without a result. Numbers are optional, but they are what moves skill nodes forward.';
            return (m.kind === 'makes' ? log.makes + '/' + log.att + ' = ' + pct(sc) : 'Quality ' + log.rating + '/5') + (sc >= q.bench ? '. Benchmark hit.' : '. Below the ' + pct(q.bench) + ' benchmark, still useful practice evidence.');
          });
        } }, 'Log session')];
    }
  });
}
function logRest() {
  const k = today();
  if (st().logs.some(function (l) { return l.kind === 'rest' && l.date === k; })) { toast('Rest day already logged today'); return; }
  closeAllSheets();
  logAndReward({ id: MX.uid(), kind: 'rest', date: k, ts: Date.now() }, function () { return 'Rest logged. Recovery is when training turns into improvement.'; });
}

function snapshot() { return MX.progress(st(), today()); }
function logAndReward(log, resultText) {
  const before = snapshot();
  st().logs.push(log);
  S.save();
  const after = snapshot();
  closeAllSheets();
  render();
  rewardSheet(before, after, resultText ? resultText(before, after) : '');
}
function rewardSheet(before, after, text) {
  const gained = after.xp - before.xp;
  const unlocked = [], tiers = [];
  Object.keys(after.tree.nodes).forEach(function (id) {
    const a = after.tree.nodes[id], b = before.tree.nodes[id];
    if (a.unlocked && !b.unlocked) unlocked.push(id);
    else if (MX.rank(a.tier) > MX.rank(b.tier) && MX.rank(a.tier) >= MX.rank('benchmark')) tiers.push(id);
  });
  const ach = after.achieved.filter(function (x) { return before.achieved.indexOf(x) < 0; });
  const prs = after.prs.slice(before.prs.length);
  const lvlUp = after.level.level > before.level.level;
  const capped = gained === 0;
  openSheet({
    eyebrow: 'Session logged', title: gained > 0 ? '+' + gained + ' XP' : 'Logged',
    body: function () {
      return [
        text ? h('p', null, text) : null,
        lvlUp ? h('div', { class: 'card hero' }, h('div', { class: 'eyebrow' }, 'Level up'), h('h2', null, 'Level ' + after.level.level + ' · ' + after.level.title)) : null,
        tiers.map(function (id) { const n = MX.NODES[id]; return h('div', { class: 'row nowrap' }, icon('star', 20), h('div', { class: 'grow' }, h('b', null, n.name), h('div', { class: 'small muted' }, MX.TIER_LABEL[after.tree.nodes[id].tier] + (after.tree.nodes[id].mastered ? ' · Mastered' : '')))); }),
        unlocked.length ? h('div', { class: 'stack' }, h('div', { class: 'eyebrow' }, 'Newly unlocked'), unlocked.map(function (id) { const n = MX.NODES[id]; return h('button', { class: 'item', onclick: function () { closeSheet(); nodeSheet(id); } }, skillIcon(n.tree, 32), h('div', { class: 'grow' }, h('div', { class: 'title' }, n.name), h('div', { class: 'xs muted' }, MX.SKILLS[n.tree].name + ' · ' + n.branch)), icon('chev', 16)); })) : null,
        prs.map(function (p) { return h('div', { class: 'row nowrap' }, icon('flame', 20), h('div', null, h('b', null, 'Personal record'), h('div', { class: 'small muted' }, p.label + ': ' + p.value + ' (was ' + p.prev + ')'))); }),
        ach.map(function (id) { const a = MX.ACHIEVEMENTS.find(function (x) { return x.id === id; }); return h('div', { class: 'row nowrap' }, icon('crown', 20), h('div', null, h('b', null, 'Achievement: ' + a.name), h('div', { class: 'small muted' }, a.desc + (a.title ? ' Title unlocked: ' + a.title + '.' : '')))); }),
        capped ? h('p', { class: 'small muted' }, 'No XP this time: XP is earned once per activity per day, with a daily limit of ' + after.dailyCap + ', so extra logging is never needed. Your results still count as evidence.') : null
      ];
    },
    foot: function () { return h('button', { class: 'btn primary block', id: 'reward-ok', onclick: function () { closeSheet(); } }, 'Done'); }
  });
}

/* ---------- game application / mission report ---------- */
function openReport(opts) {
  opts = opts || {};
  const mission = opts.mission || null, tree = MX.computeTree(st()).nodes, p = P();
  const order = (mission && mission.reportSkills ? mission.reportSkills : []).concat([p.primary, p.secondary]).concat(MX.SKILL_KEYS);
  const skills = order.filter(function (k, i) { return order.indexOf(k) === i; });
  const r = { context: opts.context || 'game', items: {}, shots: '', made: '', notes: '', more: false };
  skills.forEach(function (k) {
    const gameNodes = MX.TREE[k].nodes.filter(function (n) { return n.goal === 'game' && tree[n.id].unlocked; });
    const pref = mission ? mission.nodes.filter(function (id) { return MX.NODES[id].tree === k && tree[id].unlocked; })[0] : null;
    r.items[k] = { result: null, node: pref || null, options: gameNodes };
  });
  openSheet({
    eyebrow: mission ? (mission.type === 'game' ? 'Game mission' : 'Practice mission') : 'Game application', title: mission ? mission.name : 'Report a game or practice', modal: true,
    body: function (api) {
      const shown = r.more ? skills : skills.slice(0, mission ? Math.max(3, (mission.reportSkills || []).length) : 4);
      return [
        mission ? h('details', { open: true }, h('summary', null, 'Mission'), h('div', null, h('ol', { class: 'steps small' }, mission.steps.map(function (x) { return h('li', null, x); })))) : null,
        h('div', { class: 'note info' }, 'Report what you noticed. The app cannot see your games, so it only uses what you tell it. "Mixed" is a normal answer.'),
        h('div', { class: 'eyebrow' }, 'Where'),
        chipGroup([['game', 'Game'], ['scrimmage', 'Scrimmage'], ['practice', 'Team practice'], ['pickup', 'Pickup']], r.context, function (v) { r.context = v; api.refresh(); }),
        shown.map(function (k) {
          const it = r.items[k];
          return h('div', { class: 'card', style: { background: 'var(--surface-2)', gap: '8px' } },
            h('div', { class: 'row nowrap' }, skillIcon(k, 30), h('b', { class: 'grow' }, MX.SKILLS[k].name)),
            chipGroup([['worked', 'Worked'], ['mixed', 'Mixed'], ['no', 'Did not show up']], it.result, function (v) { it.result = it.result === v ? null : v; api.refresh(); }),
            it.result && it.options.length ? h('div', { class: 'stack', style: { gap: '6px' } }, h('div', { class: 'xs muted' }, 'Which skill were you applying? (optional, moves game-mastery nodes)'),
              chipGroup(it.options.map(function (n) { return [n.id, n.short || n.name]; }), it.node, function (v) { it.node = it.node === v ? null : v; api.refresh(); })) : null,
            it.result && !it.options.length ? h('div', { class: 'xs muted' }, 'Game-mastery nodes in this tree unlock once applied nodes reach benchmark. This report still counts in your game-application record.') : null);
        }),
        !r.more ? h('button', { class: 'link', onclick: function () { r.more = true; api.refresh(); } }, 'Report other skills') : null,
        h('div', { class: 'row' }, field('Shots made (optional)', h('input', { type: 'number', inputmode: 'numeric', min: 0, id: 'rep-made', value: r.made, style: { width: '120px' }, oninput: function (e) { r.made = e.target.value; } })),
          field('Shots attempted', h('input', { type: 'number', inputmode: 'numeric', min: 0, id: 'rep-shots', value: r.shots, style: { width: '120px' }, oninput: function (e) { r.shots = e.target.value; } }))),
        field('Notes (optional)', h('textarea', { id: 'rep-notes', placeholder: 'What did the defense do? What would you change?', oninput: function (e) { r.notes = e.target.value; } }, r.notes))
      ];
    },
    foot: function () {
      return [h('button', { class: 'btn ghost', onclick: function () { closeSheet(); } }, 'Cancel'), h('button', { class: 'btn primary grow', id: 'log-report', onclick: function () {
        const reports = skills.filter(function (k) { return r.items[k].result; }).map(function (k) { return { skill: k, result: r.items[k].result, node: r.items[k].node || null }; });
        if (!reports.length) { toast('Rate at least one skill, or cancel'); return; }
        const log = { id: MX.uid(), kind: 'game', date: today(), ts: Date.now(), context: r.context, reports: reports, notes: r.notes.trim(), mission: mission ? mission.id : null };
        const sh = parseInt(r.shots, 10), md = parseInt(r.made, 10);
        if (sh > 0) { log.shots = sh; log.made = Math.min(sh, Math.max(0, md || 0)); }
        logAndReward(log, function () { return 'Game application recorded separately from drill results: ' + reports.length + ' skill' + (reports.length > 1 ? 's' : '') + ' reported.'; });
      } }, 'Save report')];
    }
  });
}

/* ---------- weight room ---------- */
function exerciseDetail(id) {
  const e = MX.EXERCISE[id];
  openSheet({ eyebrow: e.cat + ' · Athletic development', title: e.name, sub: e.sets + ' × ' + e.reps + ' · rest ' + e.rest + (e.equip.length ? ' · ' + e.equip.map(function (q) { return MX.EQUIPMENT[q]; }).join(', ') : ' · No equipment'),
    body: function () { return exerciseInfo(e, true); } });
}
function exerciseInfo(e, full) {
  return [
    h('p', null, e.purpose),
    h('div', { class: 'stack', style: { gap: '4px' } }, h('div', { class: 'eyebrow' }, 'Technique cues'), h('ul', { class: 'why small' }, e.cues.map(function (c) { return h('li', null, c); }))),
    h('dl', { class: 'kv small' },
      full ? [h('dt', null, 'Sets × reps'), h('dd', null, e.sets + ' × ' + e.reps), h('dt', null, 'Rest'), h('dd', null, e.rest)] : null,
      h('dt', null, 'Easier'), h('dd', null, e.easier), h('dt', null, 'Progression'), h('dd', null, e.prog),
      h('dt', null, 'Common mistakes'), h('dd', null, e.mistakes.join('; ')), h('dt', null, 'Safety'), h('dd', null, e.safety)),
    e.sup ? h('div', { class: 'note safety' }, 'Needs a coach or qualified adult supervising technique.') : null,
    full && e.nodes.length ? h('div', { class: 'chips' }, e.nodes.map(function (n) { return nodeChip(n, MX.computeTree(st())); })) : null
  ];
}
function workoutDetail(w) {
  const r = MX.resolveWorkout(st(), w);
  openSheet({ eyebrow: 'Weight room', title: w.name, sub: w.dur + ' min · legs: ' + w.legs,
    body: function () {
      return [h('p', null, w.purpose),
        r.blocked ? h('div', { class: 'note safety' }, r.blocked) : null,
        r.subs.length ? h('div', { class: 'note info' }, 'Swapped for your equipment: ' + r.subs.join(', ') + '.') : null,
        h('div', { class: 'list' }, r.items.map(function (it) { const e = MX.EXERCISE[it.id]; return h('button', { class: 'item', onclick: function () { exerciseDetail(e.id); } }, h('div', { class: 'grow' }, h('div', { class: 'title' }, e.name), h('div', { class: 'small muted' }, it.sets + ' × ' + it.reps + ' · rest ' + e.rest)), icon('chev', 16)); })),
        h('p', { class: 'xs muted' }, 'Warm up for 5–8 minutes first (easy jog, mobility, a few light reps). Technique comes before load. No maximal lifts.')];
    },
    foot: function () { return h('button', { class: 'btn start block', disabled: !r.ok ? true : null, onclick: function () { closeSheet(); openGymRun(w); } }, 'Start workout'); }
  });
}
function lastGymLog(wid) { return st().logs.filter(function (l) { return l.kind === 'gym' && l.wid === wid; }).sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : (b.ts || 0) - (a.ts || 0); })[0]; }
function openGymRun(w) {
  const r = MX.resolveWorkout(st(), w);
  if (!r.ok) { workoutDetail(w); return; }
  const run = { ex: r.items.map(function (it) { return { id: it.id, sets: it.sets, reps: it.reps, load: '', tech: 'okay', done: true }; }), rpe: null, dur: w.dur, notes: '' };
  const last = lastGymLog(w.id);
  openSheet({
    eyebrow: 'Weight room', title: w.name, modal: true, sub: 'Tap through as you go. Load is optional.',
    body: function (api) {
      return [
        r.subs.length ? h('div', { class: 'note info' }, 'Swapped for your equipment: ' + r.subs.join(', ') + '.') : null,
        last ? h('button', { class: 'btn sm', id: 'repeat-last', onclick: function () {
          run.ex.forEach(function (x) { const p = (last.ex || []).find(function (y) { return y.id === x.id; }); if (p) { x.sets = p.sets; x.reps = p.reps; x.load = p.load || ''; } });
          api.refresh(); toast('Filled from ' + relDay(last.date).toLowerCase());
        } }, 'Repeat last session (' + relDay(last.date) + ')') : null,
        run.ex.map(function (x, i) {
          const e = MX.EXERCISE[x.id], hint = MX.progressionHint(st(), x.id);
          return h('div', { class: 'card', style: { background: 'var(--surface-2)', opacity: x.done ? 1 : 0.55 } },
            h('div', { class: 'row between nowrap' }, h('div', { class: 'grow' }, h('b', null, e.name), h('div', { class: 'xs muted' }, e.cat + ' · rest ' + e.rest)),
              h('button', { class: 'switch', role: 'switch', 'aria-checked': x.done ? 'true' : 'false', 'aria-label': 'Done: ' + e.name, onclick: function () { x.done = !x.done; api.refresh(); } })),
            h('div', { class: 'row nowrap' },
              field('Sets', h('input', { type: 'number', inputmode: 'numeric', min: 1, value: x.sets, style: { width: '70px' }, onchange: function (ev) { x.sets = Math.max(1, parseInt(ev.target.value, 10) || 1); } })),
              field('Reps', h('input', { type: 'text', value: x.reps, style: { width: '110px' }, onchange: function (ev) { x.reps = ev.target.value; } })),
              e.equip.length ? field('Load (' + (P().units || 'kg') + ')', h('input', { type: 'number', inputmode: 'decimal', min: 0, step: '0.5', value: x.load, placeholder: '—', style: { width: '90px' }, onchange: function (ev) { x.load = ev.target.value; } })) : null),
            h('div', { class: 'row' }, h('span', { class: 'xs muted' }, 'Technique:'), chipGroup([['solid', 'Solid'], ['okay', 'Okay'], ['shaky', 'Shaky']], x.tech, function (v) { x.tech = v; api.refresh(); })),
            h('div', { class: 'xs', style: { color: hint.kind === 'up' ? 'var(--good)' : 'var(--muted)' } }, hint.text),
            h('details', null, h('summary', { class: 'small' }, 'Cues and safety'), h('div', null, exerciseInfo(e, false))));
        }),
        h('div', { class: 'stack' }, h('div', { class: 'eyebrow' }, 'Session effort (RPE, optional)'),
          chipGroup([[5, '5 easy'], [6, '6'], [7, '7'], [8, '8 hard'], [9, '9'], [10, '10 max']], run.rpe, function (v) { run.rpe = run.rpe === v ? null : v; api.refresh(); }),
          h('div', { class: 'xs muted' }, 'Most sessions should sit around 6–7: hard enough to count, with reps left in reserve.')),
        field('Minutes', h('input', { type: 'number', inputmode: 'numeric', min: 5, value: run.dur, style: { width: '100px' }, onchange: function (ev) { run.dur = Math.max(5, parseInt(ev.target.value, 10) || w.dur); } })),
        field('Notes (optional)', h('textarea', { oninput: function (ev) { run.notes = ev.target.value; } }, run.notes)),
        h('div', { class: 'note safety' }, 'Stop an exercise if it causes pain (not normal effort). Persistent pain or unusual fatigue: tell a parent or trusted adult and see a qualified healthcare professional.')
      ];
    },
    foot: function () {
      return [h('button', { class: 'btn ghost', onclick: function () { closeSheet(); } }, 'Cancel'), h('button', { class: 'btn primary grow', id: 'log-gym', onclick: function () {
        const done = run.ex.filter(function (x) { return x.done; });
        if (!done.length) { toast('Mark at least one exercise done'); return; }
        const log = { id: MX.uid(), kind: 'gym', wid: w.id, date: today(), ts: Date.now(), dur: run.dur, rpe: run.rpe, notes: run.notes.trim(), ex: run.ex.map(function (x) { return { id: x.id, sets: x.sets, reps: x.reps, load: x.load, tech: x.tech, done: x.done }; }) };
        logAndReward(log, function () { const solid = done.filter(function (x) { return x.tech === 'solid'; }).length; return done.length + ' exercises logged, ' + solid + ' with solid technique. Strength nodes move on solid-technique sessions, not on load.'; });
      } }, 'Log workout')];
    }
  });
}
function openCustomWorkout() {
  const c = { name: 'Coach-assigned workout', dur: 45, legs: 'moderate', rpe: null, notes: '' };
  openSheet({ eyebrow: 'Weight room', title: 'Log a coach-assigned workout', modal: true,
    body: function (api) {
      return [h('p', { class: 'muted small' }, 'Workouts from a real coach count toward your training load and athletic development. Record them here so recommendations account for them.'),
        field('Name', h('input', { type: 'text', id: 'cw-name', value: c.name, oninput: function (e) { c.name = e.target.value; } })),
        field('Minutes', h('input', { type: 'number', inputmode: 'numeric', id: 'cw-dur', value: c.dur, style: { width: '100px' }, onchange: function (e) { c.dur = Math.max(5, parseInt(e.target.value, 10) || 45); } })),
        h('div', { class: 'eyebrow' }, 'Lower-body demand'), chipGroup([['none', 'None'], ['light', 'Light'], ['moderate', 'Moderate'], ['heavy', 'Heavy']], c.legs, function (v) { c.legs = v; api.refresh(); }),
        h('div', { class: 'eyebrow' }, 'Effort (RPE, optional)'), chipGroup([[5, '5'], [6, '6'], [7, '7'], [8, '8'], [9, '9'], [10, '10']], c.rpe, function (v) { c.rpe = c.rpe === v ? null : v; api.refresh(); }),
        field('What you did (optional)', h('textarea', { id: 'cw-notes', oninput: function (e) { c.notes = e.target.value; } }, c.notes))];
    },
    foot: function () { return [h('button', { class: 'btn ghost', onclick: function () { closeSheet(); } }, 'Cancel'), h('button', { class: 'btn primary grow', id: 'log-custom', onclick: function () {
      logAndReward({ id: MX.uid(), kind: 'custom', date: today(), ts: Date.now(), name: c.name.trim() || 'Coach-assigned workout', dur: c.dur, legs: c.legs, load: c.legs === 'heavy' ? 3 : c.legs === 'moderate' ? 2 : 1, rpe: c.rpe, notes: c.notes.trim() }, function () { return 'Coach workout recorded and counted in your training load.'; });
    } }, 'Log workout')]; }
  });
}
