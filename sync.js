// =============================================================
// Shared cloud-sync helper. Each page calls initCloudSync({...}).
// Talks to our own /api/app-state route (cookie-authenticated,
// service_role key stays server-side) instead of Supabase directly —
// the browser never holds a Supabase key at all. Cross-device updates
// arrive via short polling instead of Supabase Realtime, since the
// anon/publishable role has no table access anymore.
// =============================================================
(function () {
  'use strict';
  const POLL_MS = 5000;

  window.initCloudSync = function (config) {
    const appKey = config && config.appKey;
    const syncedKeys = (config && config.syncedKeys) || [];
    const syncedPrefixes = (config && config.syncedPrefixes) || [];
    const onApplied = config && config.onApplied;
    if (!appKey) return;

    let pushTimer = null, pollTimer = null, suppressSync = false, lastSyncedJson = null, disabled = false;

    function matches(k) {
      if (!k) return false;
      if (syncedKeys.indexOf(k) !== -1) return true;
      for (let i = 0; i < syncedPrefixes.length; i++) {
        if (k.indexOf(syncedPrefixes[i]) === 0) return true;
      }
      return false;
    }
    function listAllKeys() {
      const out = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (matches(k)) out.push(k);
      }
      return out;
    }
    function collect() {
      const out = {};
      for (const k of listAllKeys()) {
        const v = localStorage.getItem(k);
        if (v == null) continue;
        try { out[k] = JSON.parse(v); } catch (e) { out[k] = v; }
      }
      return out;
    }
    const origSet = localStorage.setItem.bind(localStorage);
    const origRemove = localStorage.removeItem.bind(localStorage);
    localStorage.setItem = function (k, v) {
      origSet(k, v);
      try { if (!suppressSync && matches(k)) schedulePush(); } catch (e) {}
    };
    localStorage.removeItem = function (k) {
      origRemove(k);
      try { if (!suppressSync && matches(k)) schedulePush(); } catch (e) {}
    };
    function applyRemote(remote) {
      if (!remote || typeof remote !== 'object') return false;
      suppressSync = true;
      let changed = false;
      try {
        for (const k of Object.keys(remote)) {
          if (!matches(k)) continue;
          const incoming = JSON.stringify(remote[k]);
          const local = localStorage.getItem(k);
          if (local !== incoming) { try { origSet(k, incoming); changed = true; } catch (e) {} }
        }
        for (const k of listAllKeys()) {
          if (!(k in remote)) { try { origRemove(k); changed = true; } catch (e) {} }
        }
      } finally { suppressSync = false; }
      if (changed && typeof onApplied === 'function') { try { onApplied(); } catch (e) {} }
      return changed;
    }
    async function pullNow() {
      if (disabled) return;
      try {
        const r = await fetch('/api/app-state?key=' + encodeURIComponent(appKey));
        if (r.status === 500) { disabled = true; return; }
        if (!r.ok) return;
        const json = await r.json();
        const data = json && json.data;
        if (!data || Object.keys(data).length === 0) return;
        const incoming = JSON.stringify(data);
        if (incoming === lastSyncedJson) return;
        lastSyncedJson = incoming;
        applyRemote(data);
      } catch (e) {}
    }
    async function pushNow() {
      if (disabled) return;
      const state = collect();
      const json = JSON.stringify(state);
      if (json === lastSyncedJson) return;
      try {
        const r = await fetch('/api/app-state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: appKey, data: state }),
        });
        if (r.status === 500) { disabled = true; return; }
        if (r.ok) lastSyncedJson = json;
      } catch (e) {}
    }
    function schedulePush() { clearTimeout(pushTimer); pushTimer = setTimeout(pushNow, 250); }
    function flushOnUnload() {
      if (disabled) return;
      const state = collect();
      const json = JSON.stringify(state);
      if (json === lastSyncedJson) return;
      try {
        fetch('/api/app-state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: appKey, data: state }),
          keepalive: true,
        }).catch(() => {});
        lastSyncedJson = json;
      } catch (e) {}
    }
    function schedulePoll() {
      clearInterval(pollTimer);
      pollTimer = setInterval(() => {
        if (document.visibilityState === 'visible') pullNow();
      }, POLL_MS);
    }

    (async function init() {
      await pullNow();
      if (lastSyncedJson == null && Object.keys(collect()).length > 0) schedulePush();
      schedulePoll();
    })();
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') pullNow(); });
    window.addEventListener('beforeunload', flushOnUnload);
    window.addEventListener('pagehide', flushOnUnload);
    window.addEventListener('storage', (e) => { if (e.key && matches(e.key)) schedulePush(); });
  };
})();
