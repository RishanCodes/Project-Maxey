/* UI part A: helpers, icons, shell, sheets, onboarding. Parts A–C are concatenated into one scope by build.mjs. */
const S = MX.Store;
const st = function () { return S.state; };
const P = function () { return S.state.profile; };
const today = function () { return MX.dkey(new Date()); };
const nowMin = function () { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };

const SVGNS = 'http://www.w3.org/2000/svg';
function h(tag, props) {
  const el = document.createElement(tag);
  setProps(el, props);
  for (let i = 2; i < arguments.length; i++) add(el, arguments[i]);
  return el;
}
function s(tag, props) {
  const el = document.createElementNS(SVGNS, tag);
  if (props) Object.keys(props).forEach(function (k) {
    const v = props[k]; if (v == null || v === false) return;
    if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2).toLowerCase(), v); else if (k === 'text') el.textContent = v; else el.setAttribute(k, v);
  });
  for (let i = 2; i < arguments.length; i++) add(el, arguments[i]);
  return el;
}
function setProps(el, props) {
  if (!props) return;
  Object.keys(props).forEach(function (k) {
    const v = props[k]; if (v == null || v === false) return;
    if (k === 'class') el.className = v;
    else if (k === 'text') el.textContent = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.slice(0, 2) === 'on' && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'value') el.value = v;
    else if (k === 'checked') el.checked = !!v;
    else el.setAttribute(k, v === true ? '' : v);
  });
}
function add(el, c) {
  if (c == null || c === false) return;
  if (Array.isArray(c)) { c.forEach(function (x) { add(el, x); }); return; }
  if (typeof c === 'string' || typeof c === 'number') { el.appendChild(document.createTextNode(String(c))); return; }
  el.appendChild(c);
}
function pct(x) { return x == null ? '—' : Math.round(x * 100) + '%'; }
function plural(n, w) { return n + ' ' + w + (n === 1 ? '' : 's'); }
function fmtDate(k) { const d = MX.parseKey(k); return MX.DAY_NAMES[d.getDay()] + ' ' + d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); }
function relDay(k) { const n = MX.daysBetween(k, today()); return n === 0 ? 'Today' : n === 1 ? 'Yesterday' : n === -1 ? 'Tomorrow' : n > 0 ? n + ' days ago' : fmtDate(k); }

/* ---------- icons (constant markup) ---------- */
const ICONS = {
  home: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v9.5h13V10"/><path d="M10 19.5v-5h4v5"/>',
  train: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5v17M6 5.8c3 3 3 9.4 0 12.4M18 5.8c-3 3-3 9.4 0 12.4"/>',
  progress: '<circle cx="12" cy="5" r="2.2"/><circle cx="6" cy="13" r="2.2"/><circle cx="18" cy="13" r="2.2"/><circle cx="12" cy="20" r="2"/><path d="M11 6.8 7 11.2M13 6.8l4 4.4M7.2 14.8l3.6 3.6M16.8 14.8l-3.6 3.6"/>',
  schedule: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 9.5h17M8 3v4M16 3v4"/><path d="M7.5 13h3v3h-3z"/>',
  profile: '<circle cx="12" cy="8.5" r="3.8"/><path d="M4.5 20c1.2-4 4-5.8 7.5-5.8s6.3 1.8 7.5 5.8"/>',
  rim: '<ellipse cx="12" cy="9" rx="7" ry="2.4"/><path d="M5.5 9.5l2 9h9l2-9M9 11.5l.6 7M15 11.5l-.6 7M12 11.5v7"/>',
  target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1.2"/>',
  ball: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5v17M6 5.8c3 3 3 9.4 0 12.4M18 5.8c-3 3-3 9.4 0 12.4"/>',
  bolt: '<path d="M13.5 3 5 13.5h6L10 21l9-11h-6.2z"/>',
  eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
  shield: '<path d="M12 3 5 6v5.5c0 4.5 3 7.7 7 9.5 4-1.8 7-5 7-9.5V6z"/>',
  pulse: '<path d="M3 12h4l2.5-6 4 12 2.5-6H21"/>',
  iron: '<path d="M6.5 7v10M17.5 7v10M3.5 9.5v5M20.5 9.5v5M6.5 12h11"/>',
  lock: '<rect x="5.5" y="10.5" width="13" height="9.5" rx="2"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  chev: '<path d="M9 5l7 7-7 7"/>',
  left: '<path d="M15 5l-7 7 7 7"/>',
  star: '<path d="M12 3.8l2.5 5.2 5.7.8-4.1 4 1 5.6-5.1-2.7-5.1 2.7 1-5.6-4.1-4 5.7-.8z"/>',
  crown: '<path d="M4 17.5 3 7.5l5 4 4-6 4 6 5-4-1 10z"/>',
  flame: '<path d="M12 21c-4 0-6.5-2.6-6.5-6 0-4.2 4-6 4.5-10 3 2 3.5 4.5 3 6.5 1.2-.4 2-1.6 2.2-3 2.2 1.8 3.3 4.2 3.3 6.5 0 3.4-2.5 6-6.5 6z"/>',
  moon: '<path d="M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10z"/>',
  team: '<circle cx="8" cy="9" r="3"/><circle cx="16.5" cy="9.5" r="2.5"/><path d="M2.5 19c.8-3.4 3-5 5.5-5s4.7 1.6 5.5 5M13.5 14.6c.9-.4 1.9-.6 3-.6 2.2 0 4 1.4 4.8 4.5"/>',
  film: '<rect x="3.5" y="5.5" width="17" height="13" rx="2"/><path d="M10 9.5v5l4.5-2.5z"/>',
  cloud: '<path d="M7 18.5h10a4 4 0 0 0 .5-8A5.5 5.5 0 0 0 7 9a4.75 4.75 0 0 0 0 9.5z"/>',
  copy: '<rect x="8.5" y="8.5" width="11" height="11" rx="2"/><path d="M15.5 8.5V6a1.5 1.5 0 0 0-1.5-1.5H6A1.5 1.5 0 0 0 4.5 6v8A1.5 1.5 0 0 0 6 15.5h2.5"/>',
  trash: '<path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.5v.5"/>'
};
function icon(name, size) {
  const el = document.createElementNS(SVGNS, 'svg');
  el.setAttribute('viewBox', '0 0 24 24'); el.setAttribute('fill', 'none'); el.setAttribute('stroke', 'currentColor');
  el.setAttribute('stroke-width', '1.8'); el.setAttribute('stroke-linecap', 'round'); el.setAttribute('stroke-linejoin', 'round');
  el.setAttribute('aria-hidden', 'true');
  if (size) { el.setAttribute('width', size); el.setAttribute('height', size); }
  el.innerHTML = ICONS[name] || ICONS.info;
  return el;
}
function skillIcon(k, size) {
  const sk = MX.SKILLS[k] || { icon: 'info', color: '#8E9BB0' };
  const i = icon(sk.icon); i.style.color = sk.color;
  return h('span', { class: 'skillicon', style: size ? { width: size + 'px', height: size + 'px' } : null }, i);
}

/* ---------- toasts ---------- */
let toastTimer = null;
function toast(msg) {
  document.querySelectorAll('.toast').forEach(function (t) { t.remove(); });
  const t = h('div', { class: 'toast', role: 'status' }, msg);
  document.body.appendChild(t);
  clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.remove(); }, 2600);
}

/* ---------- sheets ---------- */
const sheets = [];
function openSheet(o) {
  const scrim = h('div', { class: 'scrim', onclick: function (e) { if (e.target === scrim && !o.modal) closeSheet(); } });
  const sheet = h('div', { class: 'sheet', role: 'dialog', 'aria-modal': 'true', 'aria-label': o.title || 'Details' });
  scrim.appendChild(sheet);
  const api = {
    o: o, el: sheet, scrim: scrim,
    refresh: function () {
      const body = sheet.querySelector('.body'); const top = body ? body.scrollTop : 0;
      sheet.replaceChildren();
      const head = h('div', { class: 'head' },
        h('div', { class: 'grow stack', style: { gap: '4px' } }, o.eyebrow ? h('div', { class: 'eyebrow' }, typeof o.eyebrow === 'function' ? o.eyebrow() : o.eyebrow) : null, h('h2', null, typeof o.title === 'function' ? o.title() : o.title), o.sub ? h('div', { class: 'muted small' }, typeof o.sub === 'function' ? o.sub() : o.sub) : null),
        h('button', { class: 'iconbtn', 'aria-label': 'Close', onclick: function () { closeSheet(); } }, icon('close', 20)));
      const b = h('div', { class: 'body' }, o.body(api));
      sheet.appendChild(head); sheet.appendChild(b);
      const f = o.foot ? o.foot(api) : null;
      if (f) sheet.appendChild(h('div', { class: 'foot' }, f));
      b.scrollTop = top;
    }
  };
  sheets.push(api);
  document.body.appendChild(scrim);
  api.refresh();
  document.body.style.overflow = 'hidden';
  return api;
}
function closeSheet() {
  const s1 = sheets.pop(); if (s1) s1.scrim.remove();
  if (!sheets.length) document.body.style.overflow = '';
  if (s1 && s1.o.onClose) s1.o.onClose();
}
function closeAllSheets() { while (sheets.length) closeSheet(); }
document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && sheets.length) closeSheet(); });

/* ---------- small controls ---------- */
function chip(label, pressed, onclick, extra) { return h('button', Object.assign({ class: 'chip' + (extra && extra.big ? ' big' : ''), 'aria-pressed': pressed ? 'true' : 'false', type: 'button', onclick: onclick }, extra && extra.attrs), label); }
function chipGroup(options, value, onPick, multi, big) {
  return h('div', { class: 'chips', role: 'group' }, options.map(function (o) {
    const v = o[0], label = o[1];
    const on = multi ? value.indexOf(v) >= 0 : value === v;
    return chip(label, on, function () {
      if (multi) { const i = value.indexOf(v); if (i >= 0) value.splice(i, 1); else value.push(v); onPick(value.slice()); }
      else onPick(v);
    }, { big: big });
  }));
}
function toggleRow(label, sub, on, onChange, id) {
  return h('div', { class: 'toggle' },
    h('div', { class: 'grow' }, h('div', { style: { fontWeight: 600 } }, label), sub ? h('div', { class: 'muted small' }, sub) : null),
    h('button', { class: 'switch', role: 'switch', id: id || null, 'aria-checked': on ? 'true' : 'false', 'aria-label': label, type: 'button', onclick: function () { onChange(!on); } }));
}
function field(label, input) { return h('label', { class: 'field' }, label, input); }
function seg(options, value, onPick, label) {
  return h('div', { class: 'seg', role: 'tablist', 'aria-label': label || 'View' }, options.map(function (o) {
    return h('button', { role: 'tab', 'aria-selected': value === o[0] ? 'true' : 'false', type: 'button', onclick: function () { onPick(o[0]); } }, o[1]);
  }));
}
function confBars(level) { return h('span', { class: 'conf', 'aria-hidden': 'true' }, [1, 2, 3].map(function (i) { return h('i', { class: i <= level ? 'on' : '' }); })); }

/* ---------- app state ---------- */
const A = {
  tab: 'home', train: 'quests', progress: 'trees',
  filters: { skill: 'all', dur: 0, space: 'all', partner: 'all', diff: 0, locked: false },
  schedDay: null, weekOffset: 0, zoom: 1, scroll: {}
};
function setTab(t) {
  A.scroll[A.tab] = window.scrollY;
  A.tab = t; closeAllSheets(); render();
  window.scrollTo(0, A.scroll[t] || 0);
}
function commit() { S.save(); render(); sheets.forEach(function (x) { x.refresh(); }); }

function todayCtx() {
  const s0 = st(), k = today();
  if (!s0.today || s0.today.date !== k) s0.today = { date: k, minutes: P().duration || 45, loc: 'auto', partner: P().partner === 'often' };
  return s0.today;
}

/* ---------- shell ---------- */
function render() {
  const root = document.getElementById('app');
  const y = window.scrollY;
  if (!S.state.onboarded) {
    if (!S.hadLocal && !S.resolved) { root.replaceChildren(splash()); return; }
    root.replaceChildren(onboarding()); return;
  }
  let view;
  try {
    view = A.tab === 'home' ? viewHome() : A.tab === 'train' ? viewTrain() : A.tab === 'progress' ? viewProgress() : A.tab === 'schedule' ? viewSchedule() : viewProfile();
  } catch (e) {
    console.error(e);
    view = h('div', { class: 'wrap' }, h('div', { class: 'card' }, h('h2', null, 'Something went wrong on this screen'), h('p', { class: 'muted' }, String(e && e.message || e)), h('p', { class: 'small muted' }, 'Your data is unchanged. Try another tab, or export a backup from Profile.')));
  }
  root.replaceChildren(view, nav());
  window.scrollTo(0, y);
}
function splash() {
  return h('div', { class: 'splash' }, h('div', { class: 'stack', style: { alignItems: 'center' } }, h('div', { class: 'jersey' }, '0'), h('h2', null, 'Project Maxey: Ascension'), h('p', { class: 'muted' }, 'Looking for your saved career…')));
}
function nav() {
  const tabs = [['home', 'Home'], ['train', 'Train'], ['progress', 'Progress'], ['schedule', 'Schedule'], ['profile', 'Profile']];
  return h('nav', { class: 'nav', 'aria-label': 'Main' }, h('div', { class: 'in' }, tabs.map(function (t) {
    return h('button', { 'aria-current': A.tab === t[0] ? 'page' : null, onclick: function () { setTab(t[0]); } }, icon(t[0]), t[1]);
  })));
}
function saveDot() { return h('span', { class: 'savedot ' + S.status, title: S.detail }); }
function saveLabel() { return S.status === 'cloud' ? 'Saved to account' : S.status === 'device' ? 'Saved on this device' : S.status === 'loading' ? 'Connecting…' : 'Not auto-saved'; }

function header(prog) {
  const L = prog.level, s0 = st();
  const shownTitle = s0.prefs.title && titlesAvailable(prog).indexOf(s0.prefs.title) >= 0 ? s0.prefs.title : L.title;
  return h('div', { class: 'topbar' },
    h('div', { class: 'jersey', 'aria-label': 'Career level ' + L.level }, h('div', null, String(L.level), h('small', null, 'LVL'))),
    h('div', { class: 'grow stack', style: { gap: '5px' } },
      h('div', { class: 'row between nowrap' }, h('div', { style: { minWidth: 0 } }, h('h2', { style: { fontSize: '22px' } }, P().name || 'Player'), h('div', { class: 'muted small' }, shownTitle + ' · ' + MX.SKILLS[P().primary].name)),
        h('button', { class: 'pill', onclick: function () { setTab('profile'); }, 'aria-label': 'Save status: ' + saveLabel() }, saveDot(), saveLabel())),
      h('div', { class: 'xpbar', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': L.need, 'aria-valuenow': L.into, 'aria-label': 'XP to next level' }, h('i', { style: { width: Math.min(100, L.into / L.need * 100) + '%' } })),
      h('div', { class: 'xs muted tnum' }, L.into + ' / ' + L.need + ' XP to level ' + (L.level + 1) + ' · Career XP tracks app progress, not verified ability')));
}
function titlesAvailable(prog) {
  const out = []; MX.LEVEL_TITLES.forEach(function (t) { if (prog.level.level >= t[0]) out.push(t[1]); });
  MX.ACHIEVEMENTS.forEach(function (a) { if (a.title && prog.achieved.indexOf(a.id) >= 0) out.push(a.title); });
  return out;
}

/* ---------- onboarding (steps double as profile editors) ---------- */
const POSITIONS = ['Point guard', 'Combo guard', 'Shooting guard', 'Wing', 'Forward', 'Post'];
const LEVELS = [['rec', 'Rec / house league'], ['school', 'School team'], ['club', 'School + club'], ['elite', 'Elite club / academy']];
const STYLES = ['Quick downhill guard', 'Strong first step', 'Comfortable handling', 'Aggressive rim attacker', 'Pull-up shooting', 'Catch-and-shoot', 'Pass-first', 'Lockdown defender', 'Transition pusher'];
const GOALS = ['Keep the advantage after my first step', 'Make pull-ups under pressure', 'Finish more consistently', 'Better decisions under pressure', 'Last longer in games', 'Get stronger safely', 'Make my school team rotation', 'Weak-hand finishing'];
const OB_STEPS = [
  { id: 'name', title: 'Create your player', skip: false },
  { id: 'background', title: 'Background', skip: true },
  { id: 'abilities', title: 'Strengths and needs', skip: true },
  { id: 'goals', title: 'Goals and session length', skip: true },
  { id: 'spec', title: 'Specializations', skip: false },
  { id: 'schedule', title: 'Your week', skip: true },
  { id: 'gym', title: 'Weight room and training setup', skip: true },
  { id: 'done', title: 'Ready', skip: false }
];
function stepBody(id, rerender) {
  const p = P();
  const upd = function (k, v) { p[k] = v; S.save(); rerender(); };
  if (id === 'name') return h('div', { class: 'stack' },
    h('p', { class: 'muted' }, 'A player-development RPG built around your real game. Drills, strength work, schedule and recovery feed one progression system.'),
    field('Player name', h('input', { type: 'text', id: 'ob-name', value: p.name, placeholder: 'What should we call you?', autocomplete: 'nickname', oninput: function (e) { p.name = e.target.value; S.save(); } })),
    h('div', { class: 'note info' }, 'Defaults are set for a competitive Grade 8 combo guard with club experience who plays fast and downhill. Change anything on the next screens.'));
  if (id === 'background') return h('div', { class: 'stack' },
    field('Grade or age', h('input', { type: 'text', id: 'ob-grade', value: p.grade, oninput: function (e) { p.grade = e.target.value; S.save(); } })),
    h('div', { class: 'eyebrow' }, 'Competitive level'), chipGroup(LEVELS, p.level, function (v) { upd('level', v); }),
    h('div', { class: 'eyebrow' }, 'Position'), chipGroup(POSITIONS.map(function (x) { return [x, x]; }), p.position, function (v) { upd('position', v); }),
    field('Role on your team', h('input', { type: 'text', id: 'ob-role', value: p.role, oninput: function (e) { p.role = e.target.value; S.save(); } })),
    h('div', { class: 'eyebrow' }, 'Playstyle'), chipGroup(STYLES.map(function (x) { return [x, x]; }), p.style, function (v) { upd('style', v); }, true),
    field('Player you study (optional)', h('input', { type: 'text', id: 'ob-insp', value: p.inspiration, oninput: function (e) { p.inspiration = e.target.value; S.save(); } })));
  if (id === 'abilities') return h('div', { class: 'stack' },
    h('div', { class: 'note info' }, 'These are your own starting self-reports, not ratings. The app never turns them into numbers. Measured results come from your sessions.'),
    h('div', { class: 'eyebrow' }, 'Current strengths'),
    chipGroup(MX.SKILL_KEYS.map(function (k) { return [k, MX.SKILLS[k].name]; }), p.strengths, function (v) { upd('strengths', v); }, true),
    field('In your words', h('textarea', { id: 'ob-sn', oninput: function (e) { p.strengthNotes = e.target.value; S.save(); } }, p.strengthNotes)),
    h('div', { class: 'eyebrow' }, 'Development needs'),
    chipGroup(MX.SKILL_KEYS.map(function (k) { return [k, MX.SKILLS[k].name]; }), p.needs, function (v) { upd('needs', v); }, true),
    field('In your words', h('textarea', { id: 'ob-nn', oninput: function (e) { p.needNotes = e.target.value; S.save(); } }, p.needNotes)));
  if (id === 'goals') return h('div', { class: 'stack' },
    h('div', { class: 'eyebrow' }, 'Development goals'),
    chipGroup(GOALS.map(function (x) { return [x, x]; }), p.goals, function (v) { upd('goals', v); }, true),
    field('Anything else (optional)', h('input', { type: 'text', id: 'ob-goal', value: p.goalText, oninput: function (e) { p.goalText = e.target.value; S.save(); } })),
    h('div', { class: 'eyebrow' }, 'Usual training time'),
    chipGroup([[20, '20 min'], [30, '30 min'], [45, '45 min'], [60, '60 min'], [90, '90 min']], p.duration, function (v) { upd('duration', v); }));
  if (id === 'spec') return specPicker(rerender);
  if (id === 'schedule') {
    const evs = st().schedule.events.slice().sort(function (a, b) { return a.day - b.day || MX.toMin(a.start) - MX.toMin(b.start); });
    return h('div', { class: 'stack' },
      h('p', { class: 'muted' }, 'A starter week is filled in. Remove what does not apply now. You can add and edit everything later in the Schedule tab.'),
      h('div', { class: 'list card', style: { padding: '4px 12px' } }, evs.length ? evs.map(function (e) {
        return h('div', { class: 'item' }, h('span', { class: 'evbar', style: { background: evColor(e.type), height: '28px' } }),
          h('div', { class: 'grow' }, h('div', { class: 'title' }, e.title), h('div', { class: 'muted small' }, (e.repeat === 'once' ? e.date : MX.DAY_NAMES[e.day]) + ' · ' + MX.fmtTime(e.start) + '–' + MX.fmtTime(e.end))),
          h('button', { class: 'iconbtn', 'aria-label': 'Remove ' + e.title, onclick: function () { st().schedule.events = st().schedule.events.filter(function (x) { return x.id !== e.id; }); S.save(); rerender(); } }, icon('close', 18)));
      }) : h('p', { class: 'muted', style: { padding: '12px 0' } }, 'No events. Add them in the Schedule tab.')),
      toggleRow('I can get on a court most days', 'Turn on if you have regular access beyond the windows above.', p.courtAnytime, function (v) { upd('courtAnytime', v); }),
      toggleRow('Hoop at home or nearby', 'Driveway or park hoop for shooting and finishing.', p.homeHoop, function (v) { upd('homeHoop', v); }),
      toggleRow('Open space to run', 'Field, track or quiet street for movement work.', p.openSpace, function (v) { upd('openSpace', v); }));
  }
  if (id === 'gym') return gymSetup(rerender);
  if (id === 'done') {
    return h('div', { class: 'stack' },
      h('div', { class: 'card hero court-hero' }, courtLines(),
        h('div', { class: 'eyebrow' }, 'Player card'), h('h1', null, p.name || 'Player'),
        h('div', { class: 'muted' }, p.grade + ' · ' + p.position + ' · ' + (LEVELS.find(function (l) { return l[0] === p.level; }) || ['', ''])[1]),
        h('div', { class: 'row' }, h('span', { class: 'tag blue' }, 'Primary: ' + MX.SKILLS[p.primary].name), h('span', { class: 'tag cyan' }, 'Secondary: ' + MX.SKILLS[p.secondary].name))),
      h('ul', { class: 'why' }, h('li', null, 'Home gives you one recommended session at a time, with the reasons.'), h('li', null, 'Log results with a few taps. Skill trees unlock from evidence, not just XP.'), h('li', null, 'Report how skills show up in games. Drill results and game results are tracked separately.'), h('li', null, 'Rest days are part of the plan. There are no streaks to protect.')));
  }
}
function specPicker(rerender) {
  const p = P();
  function tiles(cur, other, set) {
    return h('div', { class: 'tiles' }, MX.SKILL_KEYS.map(function (k) {
      return h('button', { class: 'tile', type: 'button', 'aria-pressed': cur === k ? 'true' : 'false', disabled: other === k ? true : null, onclick: function () { set(k); } }, skillIcon(k), h('span', null, MX.SKILLS[k].name));
    }));
  }
  return h('div', { class: 'stack' },
    h('p', { class: 'muted' }, 'Optional skill work is weighted about 45% primary, 25% secondary and 30% everything else, adjusted for practices, fatigue and your schedule. Changing these later never deletes progress.'),
    h('div', { class: 'eyebrow' }, 'Primary specialization'), tiles(p.primary, p.secondary, function (k) { p.primary = k; S.save(); rerender(); }),
    h('div', { class: 'eyebrow' }, 'Secondary specialization'), tiles(p.secondary, p.primary, function (k) { p.secondary = k; S.save(); rerender(); }),
    p.needs.indexOf(p.primary) < 0 && p.needs.indexOf(p.secondary) < 0 ? h('div', { class: 'note' }, 'Neither focus is one of your listed development needs. That is fine if it is intentional; the 30% general share still covers your needs.') : null);
}
function gymSetup(rerender) {
  const p = P(); const upd = function (k, v) { p[k] = v; S.save(); rerender(); };
  return h('div', { class: 'stack' },
    toggleRow('I can use a weight room', 'Set its open times in the Schedule tab ("Weight-room access").', p.gymAccess, function (v) { upd('gymAccess', v); }),
    p.gymAccess ? h('div', { class: 'stack' }, h('div', { class: 'eyebrow' }, 'Equipment available'),
      chipGroup(Object.keys(MX.EQUIPMENT).map(function (k) { return [k, MX.EQUIPMENT[k]]; }), p.equipment, function (v) { upd('equipment', v); }, true)) : null,
    h('div', { class: 'eyebrow' }, 'Strength-training experience'),
    chipGroup([['none', 'None'], ['little', 'A little'], ['some', 'Some (6+ months)'], ['regular', 'Regular, coached']], p.strengthExp, function (v) { upd('strengthExp', v); }),
    toggleRow('A coach or qualified adult supervises my lifting', 'Needed before loaded lifts such as trap-bar deadlifts.', p.supervision, function (v) { upd('supervision', v); }),
    h('div', { class: 'eyebrow' }, 'Partner or defender to train with'),
    chipGroup([['none', 'Rarely'], ['sometimes', 'Sometimes'], ['often', 'Usually']], p.partner, function (v) { upd('partner', v); }),
    field('Physical limitations to respect (optional)', h('textarea', { id: 'ob-lim', placeholder: 'For example: recovering ankle, told to avoid jumping for now', oninput: function (e) { p.limitations = e.target.value; S.save(); } }, p.limitations)),
    h('div', { class: 'note safety' }, 'This app does not diagnose injuries. If something hurts beyond normal soreness, or you have a condition a doctor told you about, follow their advice first and tell a parent or trusted adult.'));
}
function courtLines() {
  const el = document.createElementNS(SVGNS, 'svg'); el.setAttribute('class', 'lines'); el.setAttribute('viewBox', '0 0 200 200'); el.setAttribute('fill', 'none'); el.setAttribute('stroke', '#3CD3FF'); el.setAttribute('stroke-width', '1.5'); el.setAttribute('aria-hidden', 'true');
  el.innerHTML = '<path d="M20 0v80a80 80 0 0 0 160 0V0"/><rect x="70" y="0" width="60" height="95"/><circle cx="100" cy="95" r="30"/><circle cx="100" cy="18" r="7"/>';
  return el;
}
function onboarding() {
  const s0 = st(); let i = Math.min(s0.obStep || 0, OB_STEPS.length - 1);
  const root = h('div', { class: 'ob' });
  function draw() {
    const step = OB_STEPS[i];
    const body = h('div', { class: 'wrap', style: { paddingBottom: '0', flex: '1' } },
      h('div', { class: 'row between' }, h('span', { class: 'eyebrow' }, 'Step ' + (i + 1) + ' of ' + OB_STEPS.length), i > 0 ? h('button', { class: 'link', onclick: function () { i--; s0.obStep = i; S.save(); draw(); } }, 'Back') : null),
      h('div', { class: 'prog', 'aria-hidden': 'true' }, h('i', { style: { width: ((i + 1) / OB_STEPS.length * 100) + '%' } })),
      h('h1', null, step.title),
      stepBody(step.id, draw));
    const foot = h('div', { class: 'foot' },
      step.skip ? h('button', { class: 'btn ghost', onclick: next }, 'Skip') : null,
      h('button', { class: 'btn primary grow', id: 'ob-next', onclick: next }, i === OB_STEPS.length - 1 ? 'Start my career' : 'Continue'));
    root.replaceChildren(body, foot);
    window.scrollTo(0, 0);
  }
  function next() {
    if (OB_STEPS[i].id === 'name' && !P().name.trim()) { P().name = 'Player'; }
    if (i === OB_STEPS.length - 1) { s0.onboarded = true; s0.obStep = 0; S.save(); A.tab = 'home'; render(); toast('Career started. Welcome, ' + P().name + '.'); return; }
    i++; s0.obStep = i; S.save(); draw();
  }
  draw();
  return root;
}
function editProfileSection(id, title) {
  openSheet({ title: title, eyebrow: 'Profile', body: function (api) { return stepBody(id, function () { api.refresh(); render(); }); }, onClose: function () { render(); } });
}
function evColor(t) { return { school: '#4A5568', practice: '#2C7BFF', game: '#3CD3FF', sport: '#8B7CFF', free: '#3DDC97', court: '#5AA0E6', gym: '#C9D2DF', strength: '#8FC4FF', rest: '#6B7A90' }[t] || '#8E9BB0'; }
