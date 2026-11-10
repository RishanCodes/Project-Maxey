/* UI part C: Train, Progress (skill trees, assessment, records, awards, history), Schedule, Profile, boot. */

/* ================= TRAIN ================= */
function viewTrain() {
  return h('div', { class: 'wrap' },
    h('div', { class: 'row between' }, h('h1', null, 'Train'), h('button', { class: 'btn sm', onclick: function () { openReport({}); } }, icon('team', 18), 'Report a game')),
    seg([['quests', 'Basketball quests'], ['gym', 'Weight room'], ['games', 'Game application']], A.train, function (v) { A.train = v; render(); }, 'Train sections'),
    A.train === 'quests' ? trainQuests() : A.train === 'gym' ? trainGym() : trainGames());
}
function trainQuests() {
  const f = A.filters, tree = MX.computeTree(st()).nodes, p = P();
  const upd = function (k, v) { f[k] = v; render(); };
  const list = MX.QUESTS.filter(function (q) {
    if (q.id === 'rec-rest') return false;
    if (f.skill !== 'all' && !(q.skills[f.skill] >= 0.3)) return false;
    if (f.dur && q.dur > f.dur) return false;
    if (f.space !== 'all' && q.space !== f.space && !(f.space === 'court')) return false;
    if (f.space === 'court' && q.space === 'any') return false;
    if (f.partner !== 'all' && String(q.partner) !== f.partner) return false;
    if (f.diff && q.diff !== f.diff) return false;
    const locked = q.nodes.length && !q.baseline && !q.nodes.some(function (n) { return tree[n].unlocked; });
    if (locked && !f.locked) return false;
    return true;
  }).sort(function (a, b) {
    const w = function (q) { return (q.skill === p.primary ? 0 : q.skill === p.secondary ? 1 : 2) * 10 + (q.type === 'boss' ? 5 : 0) + q.stage; };
    return w(a) - w(b);
  });
  return h('div', { class: 'stack' },
    h('div', { class: 'card', style: { gap: '8px' } },
      h('div', { class: 'chips scroll' }, chip('All skills', f.skill === 'all', function () { upd('skill', 'all'); }), MX.SKILL_KEYS.map(function (k) { return chip(MX.SKILLS[k].name, f.skill === k, function () { upd('skill', k); }); })),
      h('div', { class: 'chips scroll' }, [[0, 'Any length'], [10, '≤ 10 min'], [15, '≤ 15 min'], [20, '≤ 20 min']].map(function (o) { return chip(o[1], f.dur === o[0], function () { upd('dur', o[0]); }); })),
      h('div', { class: 'chips scroll' }, [['all', 'Any place'], ['court', 'Court'], ['hoop', 'Any hoop'], ['home', 'At home'], ['field', 'Open space']].map(function (o) { return chip(o[1], f.space === o[0], function () { upd('space', o[0]); }); })),
      h('div', { class: 'chips scroll' }, [['all', 'Solo or partner'], ['0', 'Solo'], ['1', 'Helper'], ['2', 'Live defender']].map(function (o) { return chip(o[1], f.partner === o[0], function () { upd('partner', o[0]); }); }),
        [[0, 'Any difficulty'], [1, 'Level 1'], [2, 'Level 2'], [3, 'Level 3']].map(function (o) { return chip(o[1], f.diff === o[0], function () { upd('diff', o[0]); }); })),
      toggleRow('Show locked quests', 'Quests whose skill nodes are not unlocked yet.', f.locked, function (v) { upd('locked', v); })),
    h('div', { class: 'xs muted' }, plural(list.length, 'quest') + ' · your focus areas first'),
    h('div', { class: 'card', style: { padding: '2px 14px' } }, list.length ? h('div', { class: 'list' }, list.map(function (q) {
      const locked = q.nodes.length && !q.baseline && !q.nodes.some(function (n) { return tree[n].unlocked; });
      return h('button', { class: 'item', onclick: function () { questDetail(q); } }, skillIcon(q.skill),
        h('div', { class: 'grow' }, h('div', { class: 'title' }, q.name),
          h('div', { class: 'row', style: { gap: '4px', marginTop: '3px' } },
            h('span', { class: 'tag' + (q.type === 'boss' ? ' warn' : '') }, KIND_LABEL[q.type] || 'Skill'),
            q.stage ? h('span', { class: 'tag ' + (q.stage === 2 ? 'cyan' : q.stage === 3 ? 'good' : 'blue') }, STAGE_LABEL[q.stage]) : null,
            q.dur ? h('span', { class: 'tag' }, q.dur + ' min') : null,
            q.partner ? h('span', { class: 'tag' }, q.partner === 2 ? 'Defender' : 'Helper') : null,
            q.baseline ? h('span', { class: 'tag good' }, 'Baseline') : null,
            locked ? h('span', { class: 'tag bad' }, 'Locked') : null)),
        icon('chev', 18));
    })) : h('p', { class: 'muted', style: { padding: '14px 0' } }, 'No quests match these filters. Clear a filter or turn on locked quests.')));
}
function trainGym() {
  const p = P();
  const logs = st().logs.filter(function (l) { return l.kind === 'gym' || l.kind === 'custom'; }).sort(function (a, b) { return a.date < b.date ? 1 : -1; }).slice(0, 5);
  return h('div', { class: 'stack' },
    h('div', { class: 'note info' }, 'Strength, explosiveness and conditioning work supports your basketball. It is scheduled around practices and games, and progression follows technique and consistency, never maximal lifts.'),
    !p.gymAccess ? h('div', { class: 'note' }, 'You have not set up weight-room access. At-home and movement workouts still work. Change this in Profile.') : null,
    h('div', { class: 'card', style: { padding: '2px 14px' } }, h('div', { class: 'list' }, MX.WORKOUTS.map(function (w) {
      const r = MX.resolveWorkout(st(), w);
      const where = w.where === 'gym' ? 'Weight room' : w.where === 'home' ? 'At home' : 'Anywhere';
      return h('button', { class: 'item', onclick: function () { workoutDetail(w); } }, skillIcon('str'),
        h('div', { class: 'grow' }, h('div', { class: 'title' }, w.name),
          h('div', { class: 'row', style: { gap: '4px', marginTop: '3px' } }, h('span', { class: 'tag' }, w.dur + ' min'), h('span', { class: 'tag' }, where), h('span', { class: 'tag ' + (w.legs === 'none' ? 'good' : w.legs === 'heavy' ? 'warn' : 'blue') }, 'Legs: ' + w.legs),
            !r.ok ? h('span', { class: 'tag bad' }, r.blocked ? 'Needs supervision' : 'Missing equipment') : r.subs.length ? h('span', { class: 'tag cyan' }, 'Adapted') : null)),
        icon('chev', 18));
    }))),
    h('button', { class: 'btn block', id: 'btn-custom', onclick: openCustomWorkout }, icon('plus', 18), 'Log a coach-assigned workout'),
    h('div', { class: 'section-title' }, h('h2', null, 'Explosiveness drills')),
    h('p', { class: 'xs muted' }, 'Acceleration, jumping and landing, deceleration and change of direction. Low volume, full rest, scored on quality. Recommended only on fresh days without practice or a game in the next 24 hours.'),
    (function () {
      const tree = MX.computeTree(st()).nodes;
      return h('div', { class: 'card', style: { padding: '2px 14px' }, id: 'explosive-list' }, h('div', { class: 'list' }, MX.QUESTS.filter(function (q) { return q.type === 'athletic'; }).map(function (q) {
        const locked = !q.baseline && !q.nodes.some(function (n) { return tree[n].unlocked; });
        return h('button', { class: 'item', onclick: function () { questDetail(q); } }, skillIcon('str'),
          h('div', { class: 'grow' }, h('div', { class: 'title' }, q.name),
            h('div', { class: 'row', style: { gap: '4px', marginTop: '3px' } }, h('span', { class: 'tag' }, q.dur + ' min'), h('span', { class: 'tag ' + (q.stage === 2 ? 'cyan' : 'blue') }, STAGE_LABEL[q.stage]), h('span', { class: 'tag ' + (q.legs === 'moderate' ? 'warn' : 'good') }, 'Legs: ' + q.legs), q.baseline ? h('span', { class: 'tag good' }, 'Baseline') : null, locked ? h('span', { class: 'tag bad' }, 'Locked') : null)),
          icon('chev', 18));
      })));
    })(),
    h('div', { class: 'section-title' }, h('h2', null, 'Exercise library'), h('span', { class: 'xs muted' }, MX.EXERCISES.length + ' exercises')),
    h('div', { class: 'card', style: { padding: '2px 14px' } }, h('div', { class: 'list' }, MX.EXERCISES.map(function (e) {
      return h('button', { class: 'item', onclick: function () { exerciseDetail(e.id); } }, h('div', { class: 'grow' }, h('div', { class: 'title' }, e.name), h('div', { class: 'xs muted' }, e.cat + ' · ' + (e.equip.length ? e.equip.map(function (q) { return MX.EQUIPMENT[q]; }).join(', ') : 'No equipment') + (e.sup ? ' · supervised' : ''))), icon('chev', 16));
    }))),
    logs.length ? h('div', { class: 'stack' }, h('div', { class: 'section-title' }, h('h2', null, 'Recent workouts')),
      h('div', { class: 'card', style: { padding: '2px 14px' } }, h('div', { class: 'list' }, logs.map(function (l) { const sm = logSummary(l); return h('div', { class: 'item' }, h('div', { class: 'grow' }, h('div', { class: 'title small' }, sm.name), h('div', { class: 'xs muted' }, relDay(l.date) + ' · ' + sm.res))); })))) : null);
}
function trainGames() {
  const logs = st().logs.filter(function (l) { return l.kind === 'game'; }).sort(function (a, b) { return a.date < b.date ? 1 : -1; });
  const stats = MX.skillStats(st(), today(), 60);
  const missions = MX.QUESTS.filter(function (q) { return q.type === 'team' || q.type === 'game'; });
  return h('div', { class: 'stack' },
    h('div', { class: 'note info' }, 'Stage 3 of skill development. Drill success is technique; game application is whether it shows up against real opponents. They are tracked separately and never mixed.'),
    h('button', { class: 'btn primary block', id: 'btn-report', onclick: function () { openReport({}); } }, 'Report a game, scrimmage or practice'),
    h('div', { class: 'section-title' }, h('h2', null, 'Missions')),
    h('div', { class: 'card', style: { padding: '2px 14px' } }, h('div', { class: 'list' }, missions.map(function (q) {
      return h('button', { class: 'item', onclick: function () { questDetail(q); } }, skillIcon(q.skill), h('div', { class: 'grow' }, h('div', { class: 'title' }, q.name), h('div', { class: 'xs muted' }, q.type === 'game' ? 'Use on game day' : 'Use in team practice')), icon('chev', 16));
    }))),
    h('div', { class: 'section-title' }, h('h2', null, 'Last 60 days')),
    h('div', { class: 'card' }, MX.SKILL_KEYS.map(function (k) {
      const g = stats[k].game;
      return h('div', { class: 'row between nowrap small' }, h('span', { class: 'grow' }, MX.SKILLS[k].name),
        g.n ? h('span', { class: 'tnum' }, h('span', { style: { color: 'var(--good)' } }, g.worked + ' worked'), ' · ' + g.mixed + ' mixed · ', h('span', { style: { color: 'var(--bad)' } }, g.no + ' no')) : h('span', { class: 'muted' }, 'no reports'));
    })),
    logs.length ? h('div', { class: 'card', style: { padding: '2px 14px' } }, h('div', { class: 'list' }, logs.slice(0, 10).map(function (l) { const sm = logSummary(l); return h('div', { class: 'item' }, h('div', { class: 'grow' }, h('div', { class: 'title small' }, sm.name), h('div', { class: 'xs muted' }, relDay(l.date) + ' · ' + sm.res + (l.shots ? ' · shots ' + l.made + '/' + l.shots : '')), l.notes ? h('div', { class: 'xs muted' }, l.notes) : null)); }))) : null);
}

/* ================= PROGRESS ================= */
function viewProgress() {
  const prog = MX.progress(st(), today());
  return h('div', { class: 'wrap' },
    h('h1', null, 'Progress'),
    seg([['trees', 'Skill trees'], ['skills', 'Assessment'], ['records', 'Records'], ['awards', 'Awards'], ['history', 'History']], A.progress, function (v) { A.progress = v; render(); }, 'Progress sections'),
    A.progress === 'trees' ? progTrees(prog) : A.progress === 'skills' ? progSkills(prog) : A.progress === 'records' ? progRecords(prog) : A.progress === 'awards' ? progAwards(prog) : progHistory());
}
function progTrees(prog) {
  const s0 = st(), p = P(), key = s0.prefs.tree || p.primary;
  const nodes = prog.tree.nodes;
  return h('div', { class: 'stack' },
    h('div', { class: 'chips scroll', role: 'tablist', 'aria-label': 'Skill trees' }, MX.TREES.map(function (t) {
      const m = t.nodes.filter(function (n) { return nodes[n.id].mastered; }).length;
      return chip([MX.SKILLS[t.key].name, h('span', { class: 'muted xs tnum' }, m + '/' + t.nodes.length), t.key === p.primary ? h('span', { class: 'tag blue' }, '1st') : t.key === p.secondary ? h('span', { class: 'tag cyan' }, '2nd') : null], key === t.key, function () { s0.prefs.tree = t.key; S.save(); render(); });
    })),
    treeMap(key, nodes),
    h('div', { class: 'legend' },
      [['#2E3B4F', 'Locked'], ['#2C7BFF', 'Unlocked / practicing'], ['#5E9BFF', 'Benchmark'], ['#3CD3FF', 'Under pressure'], ['#F3F6FB', 'Game-applied'], ['#C9D2DF', 'Ring = mastered']].map(function (x) { return h('span', { style: { '--c': x[0] } }, x[1]); })),
    h('p', { class: 'xs muted' }, 'Nodes unlock when a prerequisite reaches benchmark, or when you prove that node directly with a strong result. Tap a node for details, quests and mastery rules. Tiers come from logged evidence only.'));
}
function treeLayout(t) {
  const W = 360, cols = [62, 180, 298];
  const rowY = function (r) { return 64 + r * 132; };
  return { W: W, H: rowY(t.branches.length - 1) + 92, x: function (n) { return n.boss ? 180 : cols[n.col]; }, y: function (n) { return rowY(n.row); }, rowY: rowY };
}
function wrapLabel(t, max) {
  const words = t.split(' '), lines = []; let cur = '';
  words.forEach(function (w) { if ((cur + ' ' + w).trim().length > max && cur) { lines.push(cur); cur = w; } else cur = (cur + ' ' + w).trim(); });
  if (cur) lines.push(cur);
  return lines.slice(0, 2);
}
function treeMap(key, nodes) {
  const t = MX.TREE[key], L = treeLayout(t), p = P();
  const isFocus = key === p.primary || key === p.secondary;
  const nextIds = t.nodes.filter(function (n) { return nodes[n.id].unlocked && !nodes[n.id].mastered; }).sort(function (a, b) { return a.row - b.row || MX.rank(nodes[b.id].tier) - MX.rank(nodes[a.id].tier); }).slice(0, 2).map(function (n) { return n.id; });
  const z = A.zoom;
  const svg = s('svg', { viewBox: '0 0 ' + L.W + ' ' + L.H, width: Math.round(L.W * z * (window.innerWidth > 560 ? 1.35 : 1)), role: 'group', 'aria-label': MX.SKILLS[key].name + ' skill tree', style: 'max-width:none' });
  // branch labels
  t.branches.forEach(function (b, r) {
    const y = L.rowY(r) - 44;
    svg.appendChild(s('text', { x: 14, y: y, fill: '#8E9BB0', 'font-size': 11, 'font-family': 'Barlow Condensed, Arial Narrow, sans-serif', 'font-weight': 600, 'letter-spacing': '1.6', text: b.name.toUpperCase() }));
    svg.appendChild(s('line', { x1: 14 + b.name.length * 7.2 + 8, x2: L.W - 14, y1: y - 4, y2: y - 4, stroke: '#1B2432', 'stroke-width': 1 }));
  });
  // edges
  t.nodes.forEach(function (n) {
    n.req.forEach(function (rid) {
      const r = MX.NODES[rid]; const o = nodes[rid];
      const ok = o.unlocked && MX.rank(o.tier) >= MX.rank('benchmark');
      const x1 = L.x(r), y1 = L.y(r), x2 = L.x(n), y2 = L.y(n);
      let d;
      const top = y1 + 27, bot = y2 - (n.boss ? 31 : 27);
      if (r.row === n.row) d = 'M' + (x1 + 27) + ' ' + y1 + ' L' + (x2 - 27) + ' ' + y2;
      else if (n.row - r.row === 1) { const my = (top + bot) / 2; d = 'M' + x1 + ' ' + top + ' C' + x1 + ' ' + my + ' ' + x2 + ' ' + my + ' ' + x2 + ' ' + bot; }
      else {
        // Skips a row: run down a gutter between columns so the line never crosses a node or its label.
        const ch = x1 === x2 ? (x1 < 180 ? 121 : 239) : (Math.abs(x1 - x2) > 150 ? (x1 < x2 ? 121 : 239) : (x1 + x2) / 2);
        const a = top + 34, b = bot - 34;
        d = 'M' + x1 + ' ' + top + ' C' + x1 + ' ' + (top + 22) + ' ' + ch + ' ' + (a - 16) + ' ' + ch + ' ' + a + ' L' + ch + ' ' + b + ' C' + ch + ' ' + (b + 16) + ' ' + x2 + ' ' + (bot - 22) + ' ' + x2 + ' ' + bot;
      }
      svg.appendChild(s('path', { d: d, fill: 'none', stroke: ok ? '#2C7BFF' : '#2E3B4F', 'stroke-width': ok ? 2.2 : 1.4, 'stroke-dasharray': ok ? null : '4 4', opacity: ok ? 0.9 : 0.8 }));
    });
  });
  // nodes
  t.nodes.forEach(function (n) {
    const o = nodes[n.id], x = L.x(n), y = L.y(n), R = n.boss ? 29 : 25;
    const tier = o.tier;
    const fill = tier === 'locked' ? '#0B1017' : tier === 'available' ? '#0E1726' : tier === 'practicing' ? '#10244A' : tier === 'benchmark' ? '#2C7BFF' : tier === 'pressure' ? '#1B8FD9' : '#E9F1FF';
    const stroke = tier === 'locked' ? '#2E3B4F' : tier === 'game' ? '#FFFFFF' : tier === 'pressure' ? '#3CD3FF' : '#2C7BFF';
    const g = s('g', { class: 'tnode', tabindex: 0, role: 'button', 'aria-label': n.name + ': ' + MX.TIER_LABEL[tier] + (o.mastered ? ', mastered' : ''), 'data-node': n.id,
      onclick: function () { nodeSheet(n.id); }, onkeydown: function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); nodeSheet(n.id); } } });
    if (nextIds.indexOf(n.id) >= 0 && isFocus) g.appendChild(s('circle', { cx: x, cy: y, r: R + 8, fill: 'none', stroke: '#3CD3FF', 'stroke-width': 1.5, 'stroke-dasharray': '2 4', opacity: 0.9 }));
    if (o.mastered) g.appendChild(s('circle', { cx: x, cy: y, r: R + 5, fill: 'none', stroke: '#C9D2DF', 'stroke-width': 2 }));
    if (n.boss) {
      const pts = []; for (let i = 0; i < 6; i++) { const a = Math.PI / 6 + i * Math.PI / 3; pts.push((x + R * Math.cos(a)).toFixed(1) + ',' + (y + R * Math.sin(a)).toFixed(1)); }
      g.appendChild(s('polygon', { class: 'ring', points: pts.join(' '), fill: fill, stroke: stroke, 'stroke-width': 2 }));
    } else g.appendChild(s('circle', { class: 'ring', cx: x, cy: y, r: R, fill: fill, stroke: stroke, 'stroke-width': 2, 'stroke-dasharray': tier === 'locked' ? '3 3' : null }));
    if (tier === 'practicing' && o.ev) {
      const frac = Math.min(1, o.ev.hits / 3), c = 2 * Math.PI * (R - 5);
      g.appendChild(s('circle', { cx: x, cy: y, r: R - 5, fill: 'none', stroke: '#3CD3FF', 'stroke-width': 3, 'stroke-dasharray': (c * frac).toFixed(1) + ' ' + c.toFixed(1), transform: 'rotate(-90 ' + x + ' ' + y + ')', 'stroke-linecap': 'round' }));
    }
    const glyph = tier === 'locked' ? 'lock' : n.boss ? 'crown' : tier === 'game' ? 'star' : (tier === 'benchmark' || tier === 'pressure') ? 'check' : MX.SKILLS[key].icon;
    const ic = icon(glyph); ic.setAttribute('x', x - 10); ic.setAttribute('y', y - 10); ic.setAttribute('width', 20); ic.setAttribute('height', 20);
    ic.style.color = tier === 'game' ? '#0A1B3A' : tier === 'locked' ? '#56657A' : '#F3F6FB';
    g.appendChild(ic);
    const lines = wrapLabel(n.short || n.name, 13);
    lines.forEach(function (ln, i) {
      g.appendChild(s('text', { x: x, y: y + R + 15 + i * 13, 'text-anchor': 'middle', fill: tier === 'locked' ? '#6E7C92' : '#F3F6FB', 'font-size': 11.5, 'font-weight': 600, 'font-family': 'Inter, system-ui, sans-serif', text: ln }));
    });
    svg.appendChild(g);
  });
  const done = t.nodes.filter(function (n) { return nodes[n.id].mastered; }).length;
  return h('div', { class: 'stack', style: { gap: '8px' } },
    h('div', { class: 'row between nowrap' },
      h('div', { style: { minWidth: 0 } }, h('h3', null, MX.SKILLS[key].name), h('div', { class: 'xs muted' }, done + ' of ' + t.nodes.length + ' mastered' + (isFocus ? ' · dotted ring = suggested next' : ''))),
      h('div', { class: 'row nowrap' },
        h('button', { class: 'iconbtn', 'aria-label': 'Zoom out', onclick: function () { A.zoom = Math.max(0.8, +(A.zoom - 0.2).toFixed(1)); render(); } }, icon('minus', 18)),
        h('button', { class: 'iconbtn', 'aria-label': 'Zoom in', onclick: function () { A.zoom = Math.min(2, +(A.zoom + 0.2).toFixed(1)); render(); } }, icon('plus', 18)))),
    h('div', { class: 'treewrap', id: 'treewrap' }, svg));
}
function nodeSheet(id) {
  const n = MX.NODES[id];
  openSheet({
    eyebrow: function () { return MX.SKILLS[n.tree].name + ' · ' + n.branch; }, title: n.name,
    body: function (api) {
      const tree = MX.computeTree(st()), o = tree.nodes[id], e = o.ev;
      const quests = MX.QUESTS.filter(function (q) { return q.nodes.indexOf(id) >= 0; });
      const exs = MX.EXERCISES.filter(function (x) { return x.nodes.indexOf(id) >= 0; });
      const children = Object.keys(MX.NODES).filter(function (k) { return MX.NODES[k].req.indexOf(id) >= 0; });
      const goal = n.goal || 'benchmark';
      const hitDays = e ? Object.keys(e.hitDays).length : 0, wDays = e ? Object.keys(e.workedDays).length : 0;
      const req = [];
      if (n.boss) req.push(['Pass the boss challenge once', e && e.hits >= 1, (e ? e.hits : 0) + ' passes']);
      else {
        req.push(['Benchmark: 3 sessions at or above the quest benchmark, on 2+ different days', e && e.hits >= 3 && hitDays >= 2, (e ? e.hits : 0) + '/3 sessions · ' + hitDays + '/2 days']);
        if (goal === 'pressure' || goal === 'game') req.push(['Under pressure: 2 benchmark sessions in applied (stage 2) quests', e && e.pHits >= 2, (e ? e.pHits : 0) + '/2']);
        if (goal === 'game') req.push(['Game-applied: 2 "worked" game reports naming this skill, on 2 different days', e && e.worked >= 2 && wDays >= 2, (e ? e.worked : 0) + '/2 · ' + (e ? e.mixed : 0) + ' mixed · ' + (e ? e.no : 0) + ' not yet']);
      }
      const proveQ = quests.filter(function (q) { return q.measure.kind === 'makes' && q.type !== 'boss' && (q.partner === 0 || (st().today && st().today.partner)); })[0];
      return [
        h('div', { class: 'row' }, h('span', { class: 'tag ' + (o.mastered ? 'good' : o.unlocked ? 'blue' : 'bad') }, o.mastered ? 'Mastered' : MX.TIER_LABEL[o.tier]), o.testedOut ? h('span', { class: 'tag cyan' }, 'Proven early') : null, n.boss ? h('span', { class: 'tag warn' }, 'Boss') : null,
          h('span', { class: 'tag' }, 'Goal: ' + MX.TIER_LABEL[goal].toLowerCase())),
        h('p', null, n.purpose),
        !o.unlocked ? h('div', { class: 'card', style: { background: 'var(--surface-2)' } },
          h('b', null, 'Prerequisites: ' + (n.need > 1 ? n.need + ' of these' : n.req.length > 1 ? 'any one of these' : 'this') + ' at benchmark'),
          n.req.map(function (r) { const ro = tree.nodes[r]; return h('button', { class: 'item', onclick: function () { closeSheet(); nodeSheet(r); } }, h('span', { class: 'ndot ' + (MX.rank(ro.tier) >= MX.rank('benchmark') ? 'on' : 'off') }), h('div', { class: 'grow small' }, MX.NODES[r].name, h('div', { class: 'xs muted' }, MX.TIER_LABEL[ro.tier])), icon('chev', 16)); }),
          proveQ && !n.boss ? h('div', { class: 'stack', style: { gap: '6px' } }, h('p', { class: 'small muted' }, 'Already solid at this? Prove it: score ' + pct(Math.min(1, proveQ.bench + 0.1)) + '+ in ' + proveQ.name + ' to unlock it now.'),
            h('button', { class: 'btn sm', id: 'prove-it', onclick: function () { closeSheet(); openQuestRun(proveQ, { testOut: id }); } }, 'Prove it')) : null) : null,
        h('div', { class: 'stack' }, h('div', { class: 'eyebrow' }, 'Mastery requirements'),
          req.map(function (r) { return h('div', { class: 'row nowrap small' }, h('span', { style: { color: r[1] ? 'var(--good)' : 'var(--muted)' } }, icon(r[1] ? 'check' : 'minus', 18)), h('span', { class: 'grow' }, r[0]), h('span', { class: 'tnum xs muted' }, r[2])); }),
          e && e.rates.length ? h('p', { class: 'xs muted' }, 'Best session ' + pct(e.best) + ' · ' + plural(e.sessions, 'session') + ' logged' + (o.unlocked ? '' : ' (recorded while locked; counts once unlocked)')) : h('p', { class: 'xs muted' }, 'No evidence yet. Perfect results are not required, only consistent benchmark-level sessions.')),
        n.x && n.x.length ? h('div', { class: 'stack' }, h('div', { class: 'eyebrow' }, 'Connected skills (other trees)'), h('div', { class: 'chips' }, n.x.map(function (x) { return nodeChip(x, tree); })), h('p', { class: 'xs muted' }, 'Related abilities. Shared quests build both; neither is a hard requirement.')) : null,
        quests.length || exs.length ? h('div', { class: 'stack' }, h('div', { class: 'eyebrow' }, 'Quests that build it'),
          h('div', { class: 'list' }, quests.map(function (q) { return h('button', { class: 'item', onclick: function () { closeSheet(); questDetail(q); } }, skillIcon(q.skill, 32), h('div', { class: 'grow' }, h('div', { class: 'title small' }, q.name), h('div', { class: 'xs muted' }, (KIND_LABEL[q.type] || 'Skill') + ' · ' + STAGE_LABEL[q.stage] + (q.partner ? ' · ' + PARTNER_LABEL[q.partner].toLowerCase() : '') + (q.dur ? ' · ' + q.dur + ' min' : ''))), icon('chev', 16)); }),
            exs.map(function (x) { return h('button', { class: 'item', onclick: function () { exerciseDetail(x.id); } }, skillIcon('str', 32), h('div', { class: 'grow' }, h('div', { class: 'title small' }, x.name), h('div', { class: 'xs muted' }, 'Exercise · ' + x.cat)), icon('chev', 16)); }))) : null,
        n.goal === 'game' ? h('button', { class: 'btn sm', onclick: function () { closeSheet(); openReport({}); } }, 'Report a game') : null,
        children.length ? h('div', { class: 'stack' }, h('div', { class: 'eyebrow' }, 'Leads to'), h('div', { class: 'chips' }, children.map(function (c) { return nodeChip(c, tree); }))) : null
      ];
    }
  });
}
function spark(values) {
  const W = 300, H = 44, n = values.length;
  const svg = s('svg', { class: 'spark', viewBox: '0 0 ' + W + ' ' + H, preserveAspectRatio: 'none', 'aria-hidden': 'true' });
  [0.5].forEach(function (g) { svg.appendChild(s('line', { x1: 0, x2: W, y1: H - g * (H - 8) - 4, y2: H - g * (H - 8) - 4, stroke: '#222D3D', 'stroke-dasharray': '3 4' })); });
  if (n < 2) { if (n === 1) svg.appendChild(s('circle', { cx: W / 2, cy: H - values[0] * (H - 8) - 4, r: 3.5, fill: '#3CD3FF' })); return svg; }
  const pts = values.map(function (v, i) { return [i / (n - 1) * (W - 8) + 4, H - v * (H - 8) - 4]; });
  svg.appendChild(s('path', { d: 'M' + pts.map(function (p) { return p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(' L') + ' L' + pts[n - 1][0] + ' ' + H + ' L' + pts[0][0] + ' ' + H + 'Z', fill: 'rgba(44,123,255,.15)' }));
  svg.appendChild(s('path', { d: 'M' + pts.map(function (p) { return p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(' L'), fill: 'none', stroke: '#2C7BFF', 'stroke-width': 2, 'vector-effect': 'non-scaling-stroke' }));
  svg.appendChild(s('circle', { cx: pts[n - 1][0], cy: pts[n - 1][1], r: 3.5, fill: '#3CD3FF' }));
  return svg;
}
function progSkills(prog) {
  const k0 = today(), stats = MX.skillStats(st(), k0, 0), p = P();
  const baselines = MX.QUESTS.filter(function (q) { return q.baseline || q.type === 'boss'; });
  return h('div', { class: 'stack' },
    h('div', { class: 'note info' }, 'Four separate kinds of evidence: what you said at the start, technique-stage drills, applied drills under pressure, and your game reports. No overall rating is invented from them.'),
    MX.SKILL_KEYS.map(function (k) {
      const x = stats[k], weeks = Object.keys(x.weeks).length;
      const self = p.strengths.indexOf(k) >= 0 ? ['Strength', 'good'] : p.needs.indexOf(k) >= 0 ? ['Development need', 'warn'] : ['No self-report', ''];
      const r1 = MX.rate(x.st1), r2 = MX.rate(x.st2);
      const conf = MX.confidence(x.sessions, weeks, x.st1.att + x.st2.att || null);
      const ns = MX.TREE[k].nodes, m = ns.filter(function (n) { return prog.tree.nodes[n.id].mastered; }).length;
      return h('div', { class: 'card' },
        h('div', { class: 'row between nowrap' }, h('div', { class: 'row nowrap', style: { gap: '10px', minWidth: 0 } }, skillIcon(k), h('div', { style: { minWidth: 0 } }, h('h3', null, MX.SKILLS[k].name), h('div', { class: 'xs muted' }, m + '/' + ns.length + ' nodes mastered'))),
          h('span', { class: 'tag ' + self[1] }, self[0])),
        h('div', { class: 'evgrid' },
          h('div', { class: 'ev' }, h('span', { class: 'xs muted' }, 'Technique drills'), h('span', { class: 'v tnum' }, pct(r1)), h('span', { class: 'xs muted tnum' }, x.st1.att ? x.st1.mk + '/' + x.st1.att + ' · ' + plural(x.st1.n, 'session') : (x.rated.n ? 'quality ' + (x.rated.sum / x.rated.n).toFixed(1) + '/5' : 'no data'))),
          h('div', { class: 'ev' }, h('span', { class: 'xs muted' }, 'Under pressure'), h('span', { class: 'v tnum' }, pct(r2)), h('span', { class: 'xs muted tnum' }, x.st2.att ? x.st2.mk + '/' + x.st2.att + ' · ' + plural(x.st2.n, 'session') : 'no data')),
          h('div', { class: 'ev' }, h('span', { class: 'xs muted' }, 'Game reports'), h('span', { class: 'v tnum' }, x.game.n ? x.game.worked + '/' + x.game.n : '—'), h('span', { class: 'xs muted' }, x.game.n ? 'worked · ' + x.game.mixed + ' mixed' : 'none yet')),
          h('div', { class: 'ev' }, h('span', { class: 'xs muted' }, 'Evidence'), h('span', { class: 'small', style: { fontWeight: 600 } }, confBars(conf.level), ' ', conf.label), h('span', { class: 'xs muted' }, plural(x.sessions, 'session') + ' · ' + plural(weeks, 'week')))),
        r1 != null && r2 != null && r1 - r2 >= 0.15 ? h('p', { class: 'xs muted' }, 'Applied results trail technique results by ' + Math.round((r1 - r2) * 100) + ' points. That gap is the next thing to close.') : null);
    }),
    h('div', { class: 'section-title' }, h('h2', null, 'Baselines and benchmarks')),
    h('p', { class: 'small muted' }, 'Standardized tests with fixed rules, so results compare over time. Reassess every 2–4 weeks. They fit inside a normal session.'),
    h('div', { class: 'card', style: { padding: '2px 14px' } }, h('div', { class: 'list' }, baselines.map(function (q) {
      const hist = st().logs.filter(function (l) { return l.kind === 'quest' && l.qid === q.id && l.att > 0; }).sort(function (a, b) { return a.date < b.date ? -1 : 1; });
      const last = hist[hist.length - 1];
      const due = !last || MX.daysBetween(last.date, k0) >= 21;
      return h('button', { class: 'item', style: { flexWrap: 'wrap' }, onclick: function () { questDetail(q); } },
        h('div', { class: 'grow' }, h('div', { class: 'title small' }, q.name), h('div', { class: 'xs muted' }, last ? 'Last: ' + pct(MX.score(last)) + ' · ' + relDay(last.date) + ' · ' + plural(hist.length, 'result') : 'Not done yet')),
        h('span', { class: 'tag ' + (due ? 'warn' : 'good') }, due ? (last ? 'Reassess' : 'Start') : 'Current'),
        hist.length ? h('div', { style: { width: '100%' } }, spark(hist.slice(-10).map(function (l) { return MX.score(l); }))) : null);
    }))));
}
function progRecords(prog) {
  const rows = Object.keys(prog.best).map(function (id) { return { q: MX.QUEST[id], v: prog.best[id] }; }).filter(function (r) { return r.q; }).sort(function (a, b) { return a.q.skill < b.q.skill ? -1 : 1; });
  const ex = Object.keys(prog.exBest);
  return h('div', { class: 'stack' },
    h('div', { class: 'section-title' }, h('h2', null, 'Personal records')),
    prog.prs.length ? h('div', { class: 'card', style: { padding: '2px 14px' } }, h('div', { class: 'list' }, prog.prs.slice().reverse().map(function (p) { return h('div', { class: 'item' }, icon('flame', 20), h('div', { class: 'grow' }, h('div', { class: 'title small' }, p.label), h('div', { class: 'xs muted' }, relDay(p.date) + ' · ' + p.prev + ' → ' + p.value))); }))) :
      h('p', { class: 'muted small' }, 'A record needs a previous result to beat and a full-size session (at least 80% of the usual attempts), so small samples cannot inflate it.'),
    h('div', { class: 'section-title' }, h('h2', null, 'Best sessions')),
    rows.length ? h('div', { class: 'card', style: { padding: '2px 14px' } }, h('div', { class: 'list' }, rows.map(function (r) { return h('div', { class: 'item' }, skillIcon(r.q.skill, 32), h('div', { class: 'grow' }, h('div', { class: 'title small' }, r.q.name)), h('b', { class: 'tnum' }, pct(r.v))); }))) : h('p', { class: 'muted small' }, 'Full-size measured sessions appear here.'),
    ex.length ? [h('div', { class: 'section-title' }, h('h2', null, 'Weight-room bests')), h('div', { class: 'card', style: { padding: '2px 14px' } }, h('div', { class: 'list' }, ex.map(function (id) { return h('div', { class: 'item' }, h('div', { class: 'grow title small' }, MX.EXERCISE[id] ? MX.EXERCISE[id].name : id), h('b', { class: 'tnum' }, prog.exBest[id] + ' ' + (P().units || 'kg'))); }))),
      h('p', { class: 'xs muted' }, 'Heavier is not the goal by itself. Load records only count with solid technique, and gym numbers are not proof of basketball improvement.')] : null);
}
function progAwards(prog) {
  const s0 = st(), titles = titlesAvailable(prog);
  return h('div', { class: 'stack' },
    h('div', { class: 'card hero' }, h('div', { class: 'eyebrow' }, 'Career'), h('div', { class: 'row between' }, h('h2', null, 'Level ' + prog.level.level + ' · ' + prog.level.title), h('span', { class: 'tnum muted' }, prog.xp + ' XP')),
      h('div', { class: 'xpbar' }, h('i', { style: { width: Math.min(100, prog.level.into / prog.level.need * 100) + '%' } })),
      h('p', { class: 'xs muted' }, 'XP measures engagement and milestones in the app. It is not a basketball rating. XP is earned once per activity per day (daily limit ' + prog.dailyCap + '); milestones and achievements pay out once.')),
    h('div', { class: 'stack' }, h('div', { class: 'eyebrow' }, 'Display title'), chipGroup(titles.map(function (t) { return [t, t]; }), s0.prefs.title || prog.level.title, function (v) { s0.prefs.title = v; commit(); })),
    h('div', { class: 'section-title' }, h('h2', null, 'Achievements'), h('span', { class: 'muted small tnum' }, prog.achieved.length + '/' + MX.ACHIEVEMENTS.length)),
    h('div', { class: 'ach' }, MX.ACHIEVEMENTS.map(function (a) { const on = prog.achieved.indexOf(a.id) >= 0; return h('div', { class: on ? '' : 'off' }, h('span', { style: { color: on ? 'var(--cyan)' : 'var(--muted)' } }, icon(on ? 'crown' : 'lock', 20)), h('b', null, a.name), h('span', { class: 'xs muted' }, a.desc), a.title ? h('span', { class: 'xs', style: { color: 'var(--silver)' } }, 'Title: ' + a.title) : null); })),
    h('div', { class: 'section-title' }, h('h2', null, 'Recent XP')),
    prog.ledger.length ? h('div', { class: 'card', style: { padding: '2px 14px' } }, h('div', { class: 'list' }, prog.ledger.slice(-15).reverse().map(function (x) { return h('div', { class: 'item' }, h('div', { class: 'grow small' }, x.label, h('div', { class: 'xs muted' }, relDay(x.date))), h('span', { class: 'tag good tnum' }, '+' + x.xp)); }))) : h('p', { class: 'muted small' }, 'No XP yet.'));
}
function progHistory() {
  const logs = st().logs.slice().sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : (b.ts || 0) - (a.ts || 0); });
  if (!logs.length) return h('p', { class: 'muted' }, 'No sessions logged yet.');
  const groups = {}; logs.forEach(function (l) { (groups[l.date] = groups[l.date] || []).push(l); });
  return h('div', { class: 'stack' },
    h('p', { class: 'xs muted' }, 'Deleting a log removes exactly what it earned (XP, evidence, records). Everything is recalculated from this history.'),
    Object.keys(groups).slice(0, 60).map(function (d) {
      return h('div', { class: 'stack', style: { gap: '4px' } }, h('div', { class: 'eyebrow' }, relDay(d) + (relDay(d) !== fmtDate(d) ? ' · ' + fmtDate(d) : '')),
        h('div', { class: 'card', style: { padding: '2px 14px' } }, h('div', { class: 'list' }, groups[d].map(function (l) {
          const sm = logSummary(l), confirm = A.confirmDel === l.id;
          return h('div', { class: 'item' }, skillIcon(sm.skill, 32), h('div', { class: 'grow' }, h('div', { class: 'title small' }, sm.name), h('div', { class: 'xs muted' }, sm.res + (l.dur ? ' · ' + l.dur + ' min' : '')), l.notes ? h('div', { class: 'xs muted' }, '“' + l.notes + '”') : null),
            confirm ? h('div', { class: 'row nowrap' }, h('button', { class: 'btn sm danger', onclick: function () { st().logs = st().logs.filter(function (x) { return x.id !== l.id; }); A.confirmDel = null; commit(); toast('Log deleted'); } }, 'Delete'), h('button', { class: 'btn sm ghost', onclick: function () { A.confirmDel = null; render(); } }, 'Keep'))
              : h('button', { class: 'iconbtn', 'aria-label': 'Delete log', onclick: function () { A.confirmDel = l.id; render(); } }, icon('trash', 18)));
        }))));
    }));
}

/* ================= SCHEDULE ================= */
function weekStart(k) { const d = MX.dow(k); return MX.addDays(k, -((d + 6) % 7)); }
function viewSchedule() {
  const k0 = today(); if (!A.schedDay) A.schedDay = k0;
  const ws = MX.addDays(weekStart(k0), A.weekOffset * 7);
  const days = [0, 1, 2, 3, 4, 5, 6].map(function (i) { return MX.addDays(ws, i); });
  const sel = A.schedDay, evs = MX.eventsOn(st(), sel);
  const logs = st().logs.filter(function (l) { return l.date === sel; });
  const load = MX.dayLoad(st(), sel, k0, sel === k0 ? nowMin() : 1440);
  const planDays = days.filter(function (d) { return d >= k0; });
  const plans = st().plans || {};
  const selPlan = plans[sel];
  const weekPlanned = days.filter(function (d) { return plans[d]; });
  return h('div', { class: 'wrap' },
    h('div', { class: 'row between' }, h('h1', null, 'Schedule'), h('div', { class: 'row nowrap' },
      h('button', { class: 'btn sm', id: 'build-week', disabled: !planDays.length ? true : null, onclick: function () { weekBuilderSheet(planDays); } }, 'Build week'),
      h('button', { class: 'btn sm primary', id: 'add-event', onclick: function () { eventEditor(null, sel); } }, icon('plus', 18), 'Add'))),
    h('div', { class: 'row between nowrap' },
      h('button', { class: 'iconbtn', 'aria-label': 'Previous week', onclick: function () { A.weekOffset--; A.schedDay = MX.addDays(ws, -7); render(); } }, icon('left', 18)),
      h('b', { class: 'small' }, MX.parseKey(ws).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' – ' + MX.parseKey(days[6]).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })),
      h('button', { class: 'iconbtn', 'aria-label': 'Next week', onclick: function () { A.weekOffset++; A.schedDay = MX.addDays(ws, 7); render(); } }, icon('chev', 18))),
    h('div', { class: 'week', role: 'tablist', 'aria-label': 'Days' }, days.map(function (d) {
      const e = MX.eventsOn(st(), d).filter(function (x) { return x.type !== 'school'; });
      return h('button', { role: 'tab', class: d === k0 ? 'today' : '', 'aria-selected': d === sel ? 'true' : 'false', onclick: function () { A.schedDay = d; render(); } },
        MX.DAY_NAMES[MX.dow(d)], h('b', null, String(MX.parseKey(d).getDate())),
        h('span', { class: 'dots' }, e.slice(0, 3).map(function (x) { return h('i', { style: { background: evColor(x.type) } }); }), plans[d] ? h('i', { title: 'Planned', style: { background: 'transparent', boxShadow: 'inset 0 0 0 1.5px var(--cyan)' } }) : null));
    })),
    h('div', { class: 'card' },
      h('div', { class: 'row between' }, h('h3', null, relDay(sel) === fmtDate(sel) ? fmtDate(sel) : relDay(sel) + ' · ' + fmtDate(sel)), load.total ? h('span', { class: 'tag ' + (load.total >= 5 ? 'warn' : 'blue') }, 'Load ' + load.total.toFixed(1)) : null),
      evs.length ? h('div', { class: 'list' }, evs.map(function (e) {
        return h('button', { class: 'evrow', onclick: function () { eventEditor(e, sel); } }, h('span', { class: 't' }, MX.fmtTime(e.start), h('br'), MX.fmtTime(e.end)),
          h('div', { style: { display: 'flex', gap: '10px', minWidth: 0 } }, h('span', { class: 'evbar', style: { background: evColor(e.type) } }), h('div', { style: { minWidth: 0 } }, h('div', { style: { fontWeight: 600 } }, e.title), h('div', { class: 'xs muted' }, (MX.EVENT_TYPES[e.type] || {}).name + (e.repeat === 'weekly' ? ' · weekly' : ' · one-time') + (e.coach ? ' · coach-assigned' : '')))),
          icon('edit', 16));
      })) : h('p', { class: 'muted small' }, 'Nothing scheduled. A free day.'),
      logs.length ? h('div', { class: 'stack', style: { gap: '4px' } }, h('div', { class: 'eyebrow' }, 'Logged'), logs.map(function (l) { const sm = logSummary(l); return h('div', { class: 'small' }, '✓ ' + sm.name + ' · ' + sm.res); })) : null),
    selPlan ? planCard(selPlan, {}) : (sel >= k0 ? h('div', { class: 'card' }, h('div', { class: 'row between' }, h('h3', null, 'No plan for this day'),
      h('div', { class: 'row nowrap' }, h('button', { class: 'btn sm', id: 'plan-day', onclick: function () { rebuildDay(sel, {}); } }, 'Plan this day'), h('button', { class: 'btn sm ghost', onclick: function () { rebuildDay(sel, { rest: true }); } }, 'Rest day')))) : null),
    weekPlanned.length ? h('div', { class: 'card', id: 'week-overview' },
      h('div', { class: 'row between' }, h('h3', null, 'This week\'s plan'), h('span', { class: 'xs muted' }, plural(weekPlanned.length, 'day') + ' planned')),
      A.weekNotes && A.weekNotes.length ? h('div', { class: 'note' }, A.weekNotes.join(' ')) : null,
      h('div', { class: 'list' }, weekPlanned.map(function (d) {
        const pl = plans[d], doneN = pl.blocks.filter(function (b) { return MX.blockDone(st(), b); }).length;
        const names = pl.blocks.filter(function (b) { return b.kind !== 'warmup' && b.kind !== 'cooldown'; }).map(MX.blockName);
        return h('button', { class: 'item', onclick: function () { A.schedDay = d; render(); } },
          h('b', { style: { width: '36px' }, class: 'small' }, MX.DAY_NAMES[MX.dow(d)]),
          h('div', { class: 'grow' }, h('div', { class: 'title small' }, planTitle(pl) + (pl.kind === 'session' ? ' · ' + MX.focusLabel(P(), pl.focus) : '')), h('div', { class: 'xs muted' }, names.length ? names.join(' · ') : 'Recovery')),
          pl.blocks.length ? h('span', { class: 'tag ' + (doneN === pl.blocks.length ? 'good' : '') + ' tnum' }, doneN + '/' + pl.blocks.length) : null);
      }))) : null,
    h('div', { class: 'section-title' }, h('h2', null, 'Facilities by day')),
    h('div', { class: 'card' }, [1, 2, 3, 4, 5, 6, 0].map(function (d) {
      const k = days[(d + 6) % 7];
      const f = MX.facilities(st(), k);
      return h('div', { class: 'row between nowrap small' }, h('b', { style: { width: '42px' } }, MX.DAY_NAMES[d]),
        h('div', { class: 'grow row', style: { gap: '4px' } },
          f.court.map(function (e) { return h('span', { class: 'tag blue' }, 'Court ' + MX.fmtTime(e.start) + '–' + MX.fmtTime(e.end)); }),
          f.gym.map(function (e) { return h('span', { class: 'tag' }, 'Weights ' + MX.fmtTime(e.start) + '–' + MX.fmtTime(e.end)); }),
          !f.court.length && !f.gym.length ? h('span', { class: 'muted xs' }, P().courtAnytime ? 'Court access most days' : 'No facility windows') : null));
    })),
    h('p', { class: 'xs muted' }, 'Practices and games count as real training load. Recommendations avoid hard lower-body work the day before games and stack less on busy days.'));
}
function eventEditor(e, dateKey) {
  const isNew = !e;
  const d = e ? Object.assign({}, e) : { id: MX.uid(), type: 'practice', title: '', day: MX.dow(dateKey), date: dateKey, start: '16:00', end: '17:30', repeat: 'weekly' };
  if (!d.date) d.date = dateKey;
  openSheet({ eyebrow: 'Schedule', title: isNew ? 'Add event' : 'Edit event', modal: true,
    body: function (api) {
      return [
        h('div', { class: 'eyebrow' }, 'Type'),
        chipGroup(Object.keys(MX.EVENT_TYPES).map(function (t) { return [t, MX.EVENT_TYPES[t].name]; }), d.type, function (v) { d.type = v; api.refresh(); }),
        field('Title', h('input', { type: 'text', id: 'ev-title', value: d.title, placeholder: MX.EVENT_TYPES[d.type].name, oninput: function (ev) { d.title = ev.target.value; } })),
        h('div', { class: 'eyebrow' }, 'Repeats'),
        chipGroup([['weekly', 'Every week'], ['once', 'One time']], d.repeat, function (v) { d.repeat = v; api.refresh(); }),
        d.repeat === 'weekly' ? chipGroup(MX.DAY_NAMES.map(function (n, i) { return [i, n]; }), d.day, function (v) { d.day = v; api.refresh(); }) :
          field('Date', h('input', { type: 'date', id: 'ev-date', value: d.date, onchange: function (ev) { d.date = ev.target.value || d.date; } })),
        h('div', { class: 'row nowrap' }, field('Start', h('input', { type: 'time', id: 'ev-start', value: d.start, onchange: function (ev) { d.start = ev.target.value || d.start; } })), field('End', h('input', { type: 'time', id: 'ev-end', value: d.end, onchange: function (ev) { d.end = ev.target.value || d.end; } }))),
        d.type === 'strength' ? toggleRow('Assigned by a coach', 'Counts as training load like any session.', !!d.coach, function (v) { d.coach = v; api.refresh(); }) : null,
        d.type === 'strength' ? h('div', { class: 'stack' }, h('div', { class: 'eyebrow' }, 'Lower-body demand'), chipGroup([['none', 'None'], ['light', 'Light'], ['moderate', 'Moderate'], ['heavy', 'Heavy']], d.legs || 'moderate', function (v) { d.legs = v; api.refresh(); })) : null,
        !isNew && e.repeat === 'weekly' ? h('div', { class: 'card', style: { background: 'var(--surface-2)' } }, h('p', { class: 'small' }, 'Not happening on ' + fmtDate(dateKey) + '?'),
          h('button', { class: 'btn sm', id: 'ev-skip', onclick: function () { const sk = st().schedule.skips; (sk[e.id] = sk[e.id] || {})[dateKey] = true; closeSheet(); commit(); toast('Skipped for ' + fmtDate(dateKey)); } }, 'Skip this date only')) : null
      ];
    },
    foot: function () {
      return [!isNew ? h('button', { class: 'btn danger', onclick: function () { st().schedule.events = st().schedule.events.filter(function (x) { return x.id !== e.id; }); closeSheet(); commit(); toast('Event deleted'); } }, 'Delete') : h('button', { class: 'btn ghost', onclick: function () { closeSheet(); } }, 'Cancel'),
        h('button', { class: 'btn primary grow', id: 'ev-save', onclick: function () {
          if (MX.toMin(d.end) <= MX.toMin(d.start)) { toast('End time must be after start time'); return; }
          d.title = (d.title || '').trim() || MX.EVENT_TYPES[d.type].name;
          if (d.repeat === 'weekly') delete d.date; else d.day = MX.dow(d.date);
          const evs = st().schedule.events, i = evs.findIndex(function (x) { return x.id === d.id; });
          if (i >= 0) evs[i] = d; else evs.push(d);
          closeSheet(); commit(); toast(isNew ? 'Event added' : 'Event saved');
        } }, 'Save')];
    }
  });
}

/* ================= PROFILE ================= */
function viewProfile() {
  const p = P(), s0 = st(), prog = MX.progress(s0, today());
  const row = function (label, value, onclick) { return h('button', { class: 'item', onclick: onclick }, h('div', { class: 'grow' }, h('div', { class: 'xs muted' }, label), h('div', { class: 'small', style: { fontWeight: 600 } }, value)), icon('chev', 16)); };
  const lvl = (LEVELS.find(function (l) { return l[0] === p.level; }) || ['', ''])[1];
  return h('div', { class: 'wrap' },
    h('h1', null, 'Profile'),
    h('div', { class: 'card hero court-hero' }, courtLines(), h('div', { class: 'row nowrap' }, h('div', { class: 'jersey' }, String(prog.level.level)), h('div', null, h('h2', null, p.name || 'Player'), h('div', { class: 'small muted' }, p.grade + ' · ' + p.position + ' · ' + lvl)))),
    h('div', { class: 'card' }, h('h3', null, 'Specializations'),
      h('p', { class: 'xs muted' }, 'Changing these re-weights recommendations only. Nodes, records and achievements are never reset.'),
      h('button', { class: 'btn block', id: 'edit-spec', onclick: function () { editProfileSection('spec', 'Specializations'); } }, MX.SKILLS[p.primary].name + ' · ' + MX.SKILLS[p.secondary].name)),
    h('div', { class: 'card', style: { padding: '4px 14px' } }, h('div', { class: 'list' },
      row('Name', p.name || '—', function () { editProfileSection('name', 'Name'); }),
      row('Background, position, playstyle', p.position + ' · ' + p.style.slice(0, 2).join(', '), function () { editProfileSection('background', 'Background'); }),
      row('Strengths and needs (self-reported)', p.strengths.map(function (k) { return MX.SKILLS[k].short; }).join(', ') + ' / ' + p.needs.map(function (k) { return MX.SKILLS[k].short; }).join(', '), function () { editProfileSection('abilities', 'Strengths and needs'); }),
      row('Goals and session length', p.duration + ' min · ' + plural(p.goals.length, 'goal'), function () { editProfileSection('goals', 'Goals'); }),
      row('Court access', [p.courtAnytime ? 'Most days' : 'Schedule windows', p.homeHoop ? 'home hoop' : null, p.openSpace ? 'open space' : null].filter(Boolean).join(' · '), function () { editProfileSection('schedule', 'Court access and week'); }),
      row('Weight room, partner, supervision', (p.gymAccess ? plural(p.equipment.length, 'equipment type') : 'No weight room') + ' · partner ' + p.partner + ' · ' + (p.supervision ? 'supervised' : 'unsupervised'), function () { editProfileSection('gym', 'Training setup'); }))),
    h('div', { class: 'card' }, h('h3', null, 'Units'), chipGroup([['kg', 'Kilograms'], ['lb', 'Pounds']], p.units, function (v) { p.units = v; commit(); })),
    saveCard(),
    diagnosticsCard(),
    h('div', { class: 'card' }, h('h3', null, 'Start over'),
      A.confirmReset ? h('div', { class: 'stack' }, h('p', { class: 'small' }, 'This erases your profile, schedule and every log from this device and your account storage. Export first if you might want it back.'),
        h('div', { class: 'row' }, h('button', { class: 'btn danger', id: 'reset-yes', onclick: function () { const fresh = MX.defaultState(); A.confirmReset = false; S.replace(fresh); A.tab = 'home'; render(); } }, 'Erase everything'), h('button', { class: 'btn ghost', onclick: function () { A.confirmReset = false; render(); } }, 'Cancel')))
        : h('button', { class: 'btn danger', onclick: function () { A.confirmReset = true; render(); } }, 'Reset career')),
    h('p', { class: 'xs muted', style: { textAlign: 'center' } }, 'Project Maxey: Ascension · not affiliated with any player or team. Not medical advice.'));
}
function saveCard() {
  return h('div', { class: 'card', id: 'save-card' },
    h('div', { class: 'row between' }, h('h3', null, 'Saving and backup'), h('span', { class: 'pill' }, saveDot(), saveLabel())),
    h('p', { class: 'small' }, S.detail),
    h('ul', { class: 'why xs' },
      h('li', null, 'Account storage: ' + (S.status === 'cloud' ? 'working. Your save is private to your Claude account.' : 'not available in this view (signed out, or the page is open outside Claude).')),
      h('li', null, 'Browser storage: ' + (S.localOk ? 'working, as a backup copy on this device.' : 'blocked in this view.')),
      h('li', null, 'Export: always works. Keep a copy if you clear your browser or switch accounts.')),
    h('div', { class: 'row' }, h('button', { class: 'btn sm', id: 'btn-export', onclick: exportSheet }, icon('copy', 16), 'Export save'), h('button', { class: 'btn sm', id: 'btn-import', onclick: importSheet }, 'Import save')));
}
function exportSheet() {
  const text = S.exportText();
  openSheet({ eyebrow: 'Backup', title: 'Export save data', body: function () {
    return [h('p', { class: 'small muted' }, 'Copy this text somewhere safe (notes app, email to yourself). Import it later to restore everything.'),
      h('textarea', { id: 'export-text', readonly: true, style: { minHeight: '160px', fontSize: '12px', fontFamily: 'ui-monospace, monospace' } }, text),
      h('div', { class: 'row' },
        h('button', { class: 'btn primary', onclick: function () {
          const ta = document.getElementById('export-text');
          const fallback = function () { ta.focus(); ta.select(); toast('Selected. Copy it with your device\'s copy command.'); };
          try { navigator.clipboard.writeText(text).then(function () { toast('Copied to clipboard'); }, fallback); } catch (e) { fallback(); }
        } }, icon('copy', 16), 'Copy'),
        h('button', { class: 'btn', id: 'btn-download', onclick: function () {
          const p0 = window.claude && window.claude.use ? window.claude.use('downloads') : Promise.resolve(null);
          p0.then(function (dl) {
            if (!dl) { toast('File download is not available here. Use Copy instead.'); return; }
            return dl.save({ filename: 'project-maxey-save-' + today() + '.json', data: text }).then(function (r) { if (r && r.status === 'saved') toast('Save file downloaded'); }, function () { toast('Download cancelled or unavailable. Use Copy instead.'); });
          });
        } }, 'Download file')),
      h('p', { class: 'xs muted' }, (text.length / 1024).toFixed(1) + ' KB · ' + plural(st().logs.length, 'log'))];
  } });
}
function importSheet() {
  const imp = { text: '', parsed: null, error: '' };
  openSheet({ eyebrow: 'Backup', title: 'Import save data', modal: true, body: function (api) {
    return [h('p', { class: 'small muted' }, 'Paste exported save text, or choose a saved .json file. Importing replaces your current career.'),
      h('textarea', { id: 'import-text', placeholder: 'Paste save text here', style: { minHeight: '120px', fontSize: '12px' }, oninput: function (e) { imp.text = e.target.value; imp.parsed = null; imp.error = ''; } }, imp.text),
      h('input', { type: 'file', accept: '.json,application/json,text/plain', 'aria-label': 'Choose save file', onchange: function (e) {
        const f = e.target.files && e.target.files[0]; if (!f) return;
        const rd = new FileReader(); rd.onload = function () { imp.text = String(rd.result || ''); const r = S.parseImport(imp.text); imp.parsed = r.state || null; imp.error = r.error || ''; api.refresh(); }; rd.readAsText(f);
      } }),
      h('button', { class: 'btn sm', id: 'import-check', onclick: function () { const r = S.parseImport(imp.text); imp.parsed = r.state || null; imp.error = r.error || ''; api.refresh(); } }, 'Check save'),
      imp.error ? h('div', { class: 'note safety' }, imp.error) : null,
      imp.parsed ? h('div', { class: 'note info' }, 'Found ' + (imp.parsed.profile.name || 'a player') + ' with ' + plural(imp.parsed.logs.length, 'log') + '. This will replace the current career on this device and in account storage.') : null,
      imp.parsed ? h('button', { class: 'btn primary', id: 'import-go', onclick: function () { imp.parsed.updatedAt = Date.now(); S.replace(imp.parsed); closeAllSheets(); A.tab = 'home'; render(); toast('Save imported'); } }, 'Replace with this save') : null];
  } });
}
function diagnosticsCard() {
  return h('details', { class: 'card', style: { padding: '12px 14px' } }, h('summary', null, 'Diagnostics'),
    h('div', null, (function () {
      const errs = MX.integrity();
      return [h('p', { class: 'small' }, errs.length ? errs.length + ' content issues found:' : 'Content check passed: ' + Object.keys(MX.NODES).length + ' skill nodes all reachable, every node has an evidence route, ' + MX.QUESTS.length + ' quests and ' + MX.EXERCISES.length + ' exercises complete.'),
        errs.length ? h('ul', { class: 'why xs' }, errs.slice(0, 20).map(function (e) { return h('li', null, e); })) : null,
        h('p', { class: 'xs muted' }, 'Logs: ' + st().logs.length + ' · Check-ins: ' + Object.keys(st().readiness).length + ' · Events: ' + st().schedule.events.length)];
    })()));
}

/* ================= BOOT ================= */
(function boot() {
  let lastRef = null, lastResolved = null;
  S.onChange(function () {
    if (S.state !== lastRef || S.resolved !== lastResolved) { lastRef = S.state; lastResolved = S.resolved; render(); return; }
    document.querySelectorAll('.savedot').forEach(function (d) { d.className = 'savedot ' + S.status; });
  });
  S.init(function () { lastRef = S.state; lastResolved = S.resolved; render(); });
  let lastDay = today();
  document.addEventListener('visibilitychange', function () { if (!document.hidden && today() !== lastDay) { lastDay = today(); render(); } });
})();
