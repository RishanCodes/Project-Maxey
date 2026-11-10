/* Persistence.
 * 1. Claude account storage (the artifact `db` capability), private to the signed-in viewer under data/users/<id>/.
 *    Core state in one document, logs split into one document per month (keeps each document well under 256 KiB).
 * 2. Browser storage as an instant-start cache and fallback (may be unavailable or cleared).
 * 3. Export / import of a JSON save file as a manual backup that works everywhere.
 * The UI shows which of these is actually working; it never claims more than that. */
(function (MX) {
  const LS_KEY = 'project-maxey-save-v1';
  const S = MX.Store = {
    state: null, status: 'loading', detail: '', uid: null, db: null, listeners: [], lastCloud: null,
    written: {}, timer: null, writing: false, pending: false
  };
  function lsGet() { try { const r = window.localStorage.getItem(LS_KEY); return r ? JSON.parse(r) : null; } catch (e) { return null; } }
  function lsSet(s) { try { window.localStorage.setItem(LS_KEY, JSON.stringify(s)); return true; } catch (e) { return false; } }
  S.localOk = (function () { try { const k = '__pmx_t'; window.localStorage.setItem(k, '1'); window.localStorage.removeItem(k); return true; } catch (e) { return false; } })();

  function notify() { S.listeners.forEach(function (f) { try { f(); } catch (e) { console.error(e); } }); }
  S.onChange = function (f) { S.listeners.push(f); };
  function setStatus(st, detail) { S.status = st; S.detail = detail || ''; notify(); }

  function split(state) {
    const core = Object.assign({}, state); delete core.logs;
    const months = {};
    state.logs.forEach(function (l) { const m = 'logs-' + l.date.slice(0, 7); (months[m] = months[m] || []).push(l); });
    return { core: core, months: months };
  }

  S.init = function (done) {
    const local = lsGet();
    S.state = MX.migrate(local && local.state ? local.state : null);
    S.hadLocal = !!local; S.resolved = false;
    if (!local) S.state.updatedAt = 0; // a fresh default should never overwrite a cloud save
    setStatus(S.localOk ? 'device' : 'none', S.localOk ? 'Saved in this browser. Connecting to account storage…' : 'Connecting to account storage…');
    done();
    if (!window.claude || typeof window.claude.use !== 'function') {
      S.resolved = true;
      setStatus(S.localOk ? 'device' : 'none', S.localOk ? 'Saved in this browser only.' : 'Not saved automatically here. Use Export to keep a backup.');
      return;
    }
    Promise.all([window.claude.use('db'), window.claude.use('user')]).then(function (r) {
      const db = r[0], user = r[1];
      if (!db || !user) throw { code: 'absent' };
      return user.id().then(function (id) {
        if (!id) throw { code: 'absent' };
        S.uid = id; S.db = db;
        return db.collection('data/users/' + id).get();
      });
    }).then(function (snap) {
      let core = null; const logs = [];
      snap.docs.forEach(function (d) {
        if (!d.exists) return; const body = d.data();
        if (d.id === 'core' && body && body.json) { try { core = JSON.parse(body.json); } catch (e) { } }
        else if (d.id.indexOf('logs-') === 0 && body && body.json) { try { const arr = JSON.parse(body.json); if (Array.isArray(arr)) arr.forEach(function (l) { logs.push(l); }); } catch (e) { } S.written[d.id] = body.json; }
        if (d.id === 'core' && body) S.written.core = body.json;
      });
      if (core) {
        core.logs = logs;
        const remote = MX.migrate(core);
        if ((remote.updatedAt || 0) >= (S.state.updatedAt || 0)) { S.state = remote; lsSet({ state: S.state }); }
        else { S.queue(); }
      } else if (S.state.onboarded || S.state.logs.length) { S.queue(); }
      S.lastCloud = Date.now(); S.resolved = true;
      setStatus('cloud', 'Saved to your Claude account. Available when you reopen this page on any device signed in to the same account.');
      notify();
    }).catch(function (e) {
      S.resolved = true;
      setStatus(S.localOk ? 'device' : 'none', S.localOk ? 'Saved in this browser only. Export a backup now and then.' : 'Automatic saving is not available here. Use Export to keep your progress.');
    });
  };

  S.save = function () {
    S.state.updatedAt = Date.now();
    lsSet({ state: S.state });
    S.queue();
    notify();
  };
  S.queue = function () {
    if (!S.db || !S.uid) return;
    clearTimeout(S.timer);
    S.timer = setTimeout(S.flush, 900);
  };
  S.flush = function () {
    if (!S.db || !S.uid) return;
    if (S.writing) { S.pending = true; return; }
    const parts = split(S.state), col = S.db.collection('data/users/' + S.uid), jobs = [];
    const coreJson = JSON.stringify(parts.core);
    if (S.written.core !== coreJson) jobs.push(['core', coreJson]);
    Object.keys(parts.months).forEach(function (m) { const j = JSON.stringify(parts.months[m]); if (S.written[m] !== j) jobs.push([m, j]); });
    Object.keys(S.written).forEach(function (m) { if (m.indexOf('logs-') === 0 && !parts.months[m] && S.written[m] !== '[]') jobs.push([m, '[]']); });
    if (!jobs.length) return;
    S.writing = true;
    let chain = Promise.resolve();
    jobs.forEach(function (j) {
      chain = chain.then(function () {
        return col.doc(j[0]).set({ json: j[1], updatedAt: S.state.updatedAt }).then(function () { S.written[j[0]] = j[1]; });
      });
    });
    chain.then(function () {
      S.writing = false; S.lastCloud = Date.now();
      if (S.status !== 'cloud') setStatus('cloud', 'Saved to your Claude account.');
      if (S.pending) { S.pending = false; S.flush(); }
    }).catch(function (e) {
      S.writing = false;
      const code = e && e.code;
      if (code === 'unavailable') { setTimeout(S.flush, 2500 + Math.random() * 2000); return; }
      if (code === 'invalid_argument' || code === 'revoked' || code === 'not_granted') { S.db = null; }
      setStatus(S.localOk ? 'device' : 'none', (code === 'quota_exceeded' ? 'Account storage is full. ' : 'Account storage is not accepting saves right now. ') + (S.localOk ? 'Your progress is saved in this browser. Export a backup.' : 'Export a backup to keep your progress.'));
    });
  };

  S.exportText = function () {
    return JSON.stringify({ app: 'project-maxey-ascension', v: 1, exportedAt: new Date().toISOString(), state: S.state });
  };
  S.parseImport = function (text) {
    let o; try { o = JSON.parse(text); } catch (e) { return { error: 'That is not valid save data. Paste the full text you exported.' }; }
    if (!o || o.app !== 'project-maxey-ascension' || !o.state || !Array.isArray(o.state.logs)) return { error: 'This does not look like a Project Maxey save file.' };
    return { state: MX.migrate(o.state), exportedAt: o.exportedAt };
  };
  S.replace = function (state) { S.state = state; S.save(); };
})(globalThis.MX = globalThis.MX || {});
