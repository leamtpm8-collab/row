// =============================================================
// Persistent dashboard top bar + bottom tab bar.
// Drop this on any page with:
//     <script src="topbar.js" defer></script>
// It self-injects HTML + CSS: a header (avatar w/ Roger+Logout menu,
// HEUTE/calendar pill, water quick-add, Bücher link) and a bottom
// nav pill (Start/Gesundheit/Fitness + a second avatar circle).
// Skips chrome on finance.html and inside iframes (so the water
// tracker can embed cleanly).
// =============================================================
(function () {
  'use strict';

  // -------- CSS --------
  const css = `
.topbar {
  position: sticky; top: 0; z-index: 40;
  display: flex; justify-content: space-between; align-items: center;
  gap: 10px;
  padding: max(12px, env(safe-area-inset-top)) 14px 10px;
  font-family: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, sans-serif;
}
.tb-avatar-wrap { position: relative; flex-shrink: 0; }
.tb-avatar {
  width: 38px; height: 38px; border-radius: 50%;
  border: 1.5px solid var(--accent, #4ADE80);
  background: rgba(255,255,255,0.05);
  color: #FAFAFA; font-size: 13px; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; -webkit-tap-highlight-color: transparent;
}
.tb-avatar-menu {
  display: none; position: absolute; top: calc(100% + 8px); left: 0; z-index: 60;
  min-width: 160px; padding: 6px;
  background: rgba(14,14,16,0.92);
  border: 1px solid var(--glass-border, rgba(255,255,255,0.08));
  border-radius: 16px;
  backdrop-filter: blur(24px) saturate(1.2); -webkit-backdrop-filter: blur(24px) saturate(1.2);
  box-shadow: 0 16px 40px rgba(0,0,0,0.5);
}
.tb-bottom-wrap .tb-avatar-menu { top: auto; bottom: calc(100% + 8px); left: auto; right: 0; }
.tb-avatar-menu.open { display: block; }
.tb-avatar-menu-item {
  display: flex; align-items: center; gap: 8px; width: 100%;
  padding: 10px 12px; border: none; background: transparent;
  color: var(--text-1, #FAFAFA); font-size: 13.5px; font-weight: 600;
  border-radius: 10px; text-decoration: none; cursor: pointer; text-align: left;
  -webkit-tap-highlight-color: transparent;
}
.tb-avatar-menu-item:hover { background: rgba(255,255,255,0.06); }
.tb-today-pill {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 9px 14px;
  background: var(--glass-bg, rgba(255,255,255,0.04));
  border: 1px solid var(--glass-border, rgba(255,255,255,0.08));
  border-radius: 999px;
  backdrop-filter: blur(20px) saturate(1.2); -webkit-backdrop-filter: blur(20px) saturate(1.2);
  color: var(--text-1, #FAFAFA); font-family: inherit;
  cursor: pointer; -webkit-tap-highlight-color: transparent;
}
.tb-today-label {
  font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
  font-size: 11.5px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase;
}
.tb-today-arrow { font-size: 13px; color: var(--text-3, rgba(255,255,255,0.4)); line-height: 1; }
.tb-today-cal { font-size: 13px; line-height: 1; }
.tb-icons { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
.tb-icon-circle {
  position: relative;
  display: inline-flex; align-items: center; justify-content: center;
  width: 38px; height: 38px; flex-shrink: 0;
  border: 1px solid var(--glass-border, rgba(255,255,255,0.08));
  background: var(--glass-bg, rgba(255,255,255,0.04));
  border-radius: 50%; text-decoration: none;
  backdrop-filter: blur(20px) saturate(1.2); -webkit-backdrop-filter: blur(20px) saturate(1.2);
  -webkit-tap-highlight-color: transparent;
  transition: background 0.15s, transform 0.10s;
}
.tb-icon-circle:active { transform: scale(0.94); }
.tb-icon-circle.flash { background: var(--accent-dim, rgba(74,222,128,0.18)); border-color: var(--border-strong, rgba(74,222,128,0.3)); }
.tb-icon-glyph { font-size: 16px; line-height: 1; }
.tb-icon-circle .tb-water-dot {
  position: absolute; top: 3px; right: 3px; width: 8px; height: 8px; border-radius: 50%;
  background: var(--accent, #4ADE80); border: 1.5px solid #08090a;
}
.tb-icon-circle .tb-water-dot.warn { background: #fbbf24; }
.tb-icon-circle .tb-water-dot.miss { background: #F87171; animation: topbar-miss-pulse 1.6s ease-in-out infinite; }
@keyframes topbar-miss-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(248, 113, 113, 0.5); }
  50%      { box-shadow: 0 0 0 5px rgba(248, 113, 113, 0); }
}
.topbar-quote {
  padding: 9px 16px 0;
  font-family: var(--font-serif, Georgia, 'Times New Roman', serif);
  font-style: italic;
  font-size: 12.5px;
  color: var(--text-3, rgba(255,255,255,0.42));
  text-align: center;
}
.cal-modal-bg {
  display: none; position: fixed; inset: 0; z-index: 200;
  background: rgba(0,0,0,0.62); backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
  align-items: center; justify-content: center; padding: 20px;
}
.cal-modal-bg.show { display: flex; }
.cal-sheet {
  width: 100%; max-width: 360px;
  background: var(--bg-card, #0e0e10);
  border: 1px solid var(--border, rgba(110,231,183,0.12));
  border-radius: var(--radius, 22px);
  padding: 18px;
}
.cal-head { display: flex; align-items: center; justify-content: space-between; gap: 4px; margin-bottom: 14px; }
.cal-nav {
  background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08);
  color: var(--text-1, #FAFAFA); width: 30px; height: 30px; border-radius: 8px;
  font-size: 14px; cursor: pointer; -webkit-tap-highlight-color: transparent; flex-shrink: 0;
}
.cal-nav:hover { border-color: var(--border-strong, rgba(110,231,183,0.3)); }
.cal-title {
  font-family: var(--font-serif, Georgia, 'Times New Roman', serif);
  font-style: italic; font-weight: 700; font-size: 17px;
  color: var(--text-1, #FAFAFA); flex: 1; text-align: center;
}
.cal-weekdays {
  display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px;
  font-family: var(--font-mono, ui-monospace, monospace); font-size: 10px;
  color: var(--text-3, rgba(255,255,255,0.4)); text-transform: uppercase;
  text-align: center; margin-bottom: 6px;
}
.cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 3px; }
.cal-day {
  aspect-ratio: 1; display: flex; align-items: center; justify-content: center;
  border-radius: 9px; font-size: 13px; color: var(--text-1, #FAFAFA);
  font-variant-numeric: tabular-nums;
}
.cal-day.is-other-month { color: var(--text-4, rgba(255,255,255,0.18)); }
.cal-day.is-today { background: var(--accent, #6ee7b7); color: #06110c; font-weight: 800; }
.cal-close {
  width: 100%; margin-top: 16px; padding: 11px;
  border: 1px solid var(--border, rgba(255,255,255,0.1));
  background: rgba(255,255,255,0.04); color: var(--text-1, #FAFAFA);
  border-radius: 12px; font-size: 13px; font-weight: 700; cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.tb-bottom-wrap {
  position: fixed; bottom: 0; left: 0; right: 0; z-index: 40;
  display: flex; align-items: center; justify-content: center; gap: 10px;
  padding: 10px 14px calc(10px + env(safe-area-inset-bottom));
}
.bottombar {
  display: flex; align-items: stretch;
  padding: 6px; gap: 2px;
  background: var(--glass-bg, rgba(255,255,255,0.05));
  border: 1px solid var(--glass-border, rgba(255,255,255,0.08));
  border-radius: 999px;
  backdrop-filter: blur(24px) saturate(1.2); -webkit-backdrop-filter: blur(24px) saturate(1.2);
  box-shadow: 0 12px 34px rgba(0,0,0,0.4);
  font-family: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, sans-serif;
}
.bottombar-tab {
  display: flex; align-items: center; justify-content: center; gap: 6px;
  padding: 10px 16px; text-decoration: none; border-radius: 999px;
  color: rgba(255, 255, 255, 0.45);
  font-size: 12px; font-weight: 700; letter-spacing: 0.01em;
  -webkit-tap-highlight-color: transparent; transition: color 0.15s;
}
.bottombar-tab-icon { font-size: 17px; line-height: 1; opacity: 0.6; transition: opacity 0.15s, transform 0.10s; }
.bottombar-tab.active { color: var(--accent, #4ADE80); }
.bottombar-tab.active .bottombar-tab-icon { opacity: 1; filter: drop-shadow(0 0 6px var(--accent-glow, rgba(74,222,128,0.5))); }
.bottombar-tab:active .bottombar-tab-icon { transform: scale(0.92); }
.tb-bottom-wrap .tb-avatar { width: 46px; height: 46px; flex-shrink: 0; }
body.has-bottombar {
  padding-bottom: calc(84px + env(safe-area-inset-bottom)) !important;
}
@media (max-width: 480px) {
  .topbar { padding-left: 10px; padding-right: 10px; gap: 6px; }
  .tb-today-label { font-size: 10.5px; }
  .tb-avatar { width: 34px; height: 34px; font-size: 12px; }
  .tb-icon-circle { width: 34px; height: 34px; }
  .bottombar-tab { padding: 9px 12px; font-size: 11px; }
  .bottombar-tab-icon { font-size: 16px; }
}
html, body { -webkit-text-size-adjust: 100%; }
@media (max-width: 768px) {
  html { touch-action: pan-y; }
  ::-webkit-scrollbar { width: 0; height: 0; display: none; }
  html, body { scrollbar-width: none; -ms-overflow-style: none; }
}
.modal-bg, .modal, .po-modal-bg, .po-modal, .wt-overlay, .wt-viewer {
  overscroll-behavior: contain;
}
body.topbar-modal-open { overflow: hidden; touch-action: none; }
@media (max-width: 480px) {
  .modal-bg, .po-modal-bg {
    padding: 0 !important;
    align-items: stretch !important;
    justify-content: stretch !important;
  }
  .modal, .po-modal {
    width: 100% !important; max-width: 100% !important;
    max-height: 100vh !important; height: 100vh !important;
    border-radius: 0 !important;
    padding-top: max(20px, env(safe-area-inset-top)) !important;
    padding-bottom: max(28px, env(safe-area-inset-bottom)) !important;
    overflow-y: auto !important; overscroll-behavior: contain;
  }
}
`;

  function avatarMenuHtml(idSuffix) {
    return `<div class="tb-avatar-menu" id="tbAvatarMenu${idSuffix}">
      <a href="roger.html" class="tb-avatar-menu-item">🎾 Roger</a>
      <button class="tb-avatar-menu-item" data-logout type="button">🚪 Abmelden</button>
    </div>`;
  }

  const topbarHtml = `
<header class="topbar" id="topbar" role="navigation" aria-label="Kopfzeile">
  <div class="tb-avatar-wrap">
    <button class="tb-avatar" id="tbAvatarBtnTop" type="button" aria-label="Profil">M</button>
    ${avatarMenuHtml('Top')}
  </div>
  <button class="tb-today-pill" id="topbarCalendar" type="button" aria-label="Kalender öffnen">
    <span class="tb-today-arrow">‹</span>
    <span class="tb-today-label">HEUTE</span>
    <span class="tb-today-cal">📅</span>
    <span class="tb-today-arrow">›</span>
  </button>
  <div class="tb-icons">
    <button class="tb-icon-circle" id="topbarWater" type="button" aria-label="Ein Getränk erfassen">
      <span class="tb-icon-glyph">💧</span>
      <span class="tb-water-dot" id="topbarWaterDot"></span>
    </button>
    <a href="books.html" class="tb-icon-circle" aria-label="Bücher">
      <span class="tb-icon-glyph">📚</span>
    </a>
  </div>
</header>
<div class="topbar-quote" id="topbarQuote"></div>
<div class="cal-modal-bg" id="calModalBg">
  <div class="cal-sheet">
    <div class="cal-head">
      <button class="cal-nav" id="calPrevYear" type="button" aria-label="Vorheriges Jahr">«</button>
      <button class="cal-nav" id="calPrevMonth" type="button" aria-label="Vorheriger Monat">‹</button>
      <div class="cal-title" id="calTitle">—</div>
      <button class="cal-nav" id="calNextMonth" type="button" aria-label="Nächster Monat">›</button>
      <button class="cal-nav" id="calNextYear" type="button" aria-label="Nächstes Jahr">»</button>
    </div>
    <div class="cal-weekdays"><span>Mo</span><span>Di</span><span>Mi</span><span>Do</span><span>Fr</span><span>Sa</span><span>So</span></div>
    <div class="cal-grid" id="calGrid"></div>
    <button class="cal-close" id="calCloseBtn" type="button">Schließen</button>
  </div>
</div>`;

  const bottombarHtml = `
<div class="tb-bottom-wrap" id="bottombar">
  <nav class="bottombar" role="navigation" aria-label="Hauptbereiche">
    <a href="main.html" class="bottombar-tab" data-page="main">
      <span class="bottombar-tab-icon">🏠</span><span>Start</span>
    </a>
    <a href="wellness.html" class="bottombar-tab" data-page="health">
      <span class="bottombar-tab-icon">💊</span><span>Gesundheit</span>
    </a>
    <a href="fitness.html" class="bottombar-tab" data-page="fitness">
      <span class="bottombar-tab-icon">💪</span><span>Fitness</span>
    </a>
  </nav>
  <div class="tb-avatar-wrap">
    <button class="tb-avatar" id="tbAvatarBtnBottom" type="button" aria-label="Profil">M</button>
    ${avatarMenuHtml('Bottom')}
  </div>
</div>`;

  function isFinancePage() {
    const p = (window.location.pathname || '').toLowerCase();
    return p.endsWith('/finance.html') || p.endsWith('finance.html');
  }
  function isEmbedded() {
    try { return window.self !== window.top; } catch (e) { return true; }
  }
  function shouldShowChrome() { return !isFinancePage() && !isEmbedded(); }
  function currentPageKey() {
    const p = (window.location.pathname || '').toLowerCase();
    if (p.endsWith('health.html')) return 'health';
    if (p.endsWith('wellness.html')) return 'health';
    if (p.endsWith('recovery.html')) return 'health';
    if (p.endsWith('recommendations.html')) return 'health';
    if (p.endsWith('peak-tracker.html')) return 'health';
    if (p.endsWith('nutrition.html')) return 'health';
    if (p.endsWith('caffeine.html')) return 'health';
    if (p.endsWith('sleep.html')) return 'health';
    if (p.endsWith('gym.html')) return 'fitness';
    if (p.endsWith('fitness.html')) return 'fitness';
    if (p.endsWith('activities.html')) return 'fitness';
    if (p.endsWith('start-activity.html')) return 'fitness';
    if (p.endsWith('progress.html')) return 'fitness';
    if (p.endsWith('fitness-recommendations.html')) return 'fitness';
    if (p.endsWith('main.html')) return 'main';
    return '';
  }

  function injectStyleAndHTML() {
    if (!document.getElementById('topbar-style')) {
      const style = document.createElement('style');
      style.id = 'topbar-style';
      style.textContent = css;
      document.head.appendChild(style);
    }
    if (shouldShowChrome() && !document.getElementById('topbar') && !document.getElementById('bottombar')) {
      const topWrap = document.createElement('div');
      topWrap.innerHTML = topbarHtml.trim();
      const topNodes = Array.from(topWrap.childNodes);
      const anchor = document.body.firstChild;
      topNodes.forEach((node) => document.body.insertBefore(node, anchor));
      const bottomWrap = document.createElement('div');
      bottomWrap.innerHTML = bottombarHtml.trim();
      document.body.appendChild(bottomWrap.firstChild);
      const active = currentPageKey();
      document.querySelectorAll('.bottombar-tab').forEach((t) => {
        t.classList.toggle('active', t.getAttribute('data-page') === active);
      });
      document.body.classList.add('has-bottombar');
    }
  }

  function calendarDateKey() {
    const d = new Date();
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }
  function getWaterProgress() {
    let state = null;
    try { state = JSON.parse(localStorage.getItem('po_water_v1')); } catch (e) {}
    if (!state) return { done: 0, total: 0 };
    const todayKey = calendarDateKey();
    const done = (state.logs || {})[todayKey] || 0;
    const p = state.profile || { weightKg: 75 };
    const wKg = state.weightUnit === 'lb' ? (p.weightKg || 0) / 2.20462 : (p.weightKg || 0);
    const base = wKg * 35;
    const exercise = (p.activityHrsPerWeek || 0) / 7 * 500;
    const caffeine = Math.max(0, (state.caffeineMgPerDay || 0) - 200) * 1.5;
    const subs = (state.substances || []).reduce((s, x) => {
      const dose = (x && x.dose != null ? x.dose : (x && x.defaultDose)) || 0;
      return s + Math.max(0, dose * ((x && x.mlPerUnit) || 0));
    }, 0);
    let adjust = 0;
    if (p.sex === 'm') adjust += 200;
    if ((p.age || 0) >= 50) adjust += 100;
    const totalMl = base + exercise + caffeine + subs + adjust;
    let unitVol;
    if (state.unit === 'glass') unitVol = state.glassMl || 250;
    else if (state.unit === 'oz') unitVol = 30;
    else if (state.unit === 'ml') unitVol = 1;
    else unitVol = state.bottleMl || 500;
    const total = Math.max(1, Math.ceil(totalMl / unitVol));
    return { done, total };
  }
  function classifyStatus(done, total) {
    if (total === 0) return 'idle';
    if (done >= total) return 'good';
    if (done >= total * 0.5) return 'warn';
    const h = new Date().getHours();
    if (h >= 18 && done < total * 0.5) return 'miss';
    return 'warn';
  }
  function setDotStatus(dotEl, status) {
    dotEl.classList.remove('warn', 'miss');
    if (status === 'warn' || status === 'miss') dotEl.classList.add(status);
  }
  function render() {
    const dotEl = document.getElementById('topbarWaterDot');
    if (!dotEl) return;
    const w = getWaterProgress();
    setDotStatus(dotEl, classifyStatus(w.done, w.total));
  }

  function defaultWaterState() {
    return {
      unit: 'bottle', bottleMl: 500, glassMl: 250, weightUnit: 'kg',
      profile: { weightKg: 75, age: 25, sex: 'm', activityHrsPerWeek: 5 },
      caffeineMgPerDay: 200, substances: [], logs: {}
    };
  }
  async function pushWaterMergedToSupabase(localWater) {
    if (window.location.pathname.endsWith('/health.html') ||
        window.location.pathname.endsWith('health.html')) return;
    try {
      const r = await fetch('/api/app-state?key=health');
      const json = r.ok ? await r.json() : null;
      const current = (json && json.data) || {};
      const merged = Object.assign({}, current, { po_water_v1: localWater });
      await fetch('/api/app-state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'health', data: merged }),
      });
    } catch (e) {}
  }

  // -------- WHOOP token cross-device sync --------
  // Tokens are saved to plain localStorage by every page's own connect/refresh
  // flow, which is per-device. This mirrors that one key into its own Supabase
  // row so connecting WHOOP on one device makes it show up everywhere else.
  const WHOOP_TOKENS_KEY = 'whoop_tokens_v1';
  const WHOOP_SYNC_ROW_KEY = 'whoop_tokens';

  function loadWhoopTokensLocal() {
    try { return JSON.parse(localStorage.getItem(WHOOP_TOKENS_KEY)); } catch (e) { return null; }
  }

  function initWhoopSync() {
    let lastSyncedJson = null;
    const POLL_MS = 5000;

    async function pushWhoopTokens(tokens) {
      const json = JSON.stringify(tokens);
      if (json === lastSyncedJson) return;
      try {
        await fetch('/api/app-state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: WHOOP_SYNC_ROW_KEY, data: { whoop_tokens_v1: tokens } }),
        });
        lastSyncedJson = json;
      } catch (e) {}
    }

    async function pull() {
      try {
        const r = await fetch('/api/app-state?key=' + WHOOP_SYNC_ROW_KEY);
        const json = r.ok ? await r.json() : null;
        const remote = json && json.data && json.data[WHOOP_TOKENS_KEY];
        const local = loadWhoopTokensLocal();
        if (remote && remote.access) {
          const remoteJson = JSON.stringify(remote);
          if (!local || !local.access) {
            if (remoteJson !== lastSyncedJson) {
              lastSyncedJson = remoteJson;
              localStorage.setItem(WHOOP_TOKENS_KEY, remoteJson);
              location.reload();
            }
            return;
          }
          if ((remote.expires || 0) > (local.expires || 0) && remoteJson !== JSON.stringify(local)) {
            lastSyncedJson = remoteJson;
            localStorage.setItem(WHOOP_TOKENS_KEY, remoteJson);
            return;
          }
        }
        if (local && local.access) pushWhoopTokens(local);
      } catch (e) {}
    }

    pull();
    setInterval(() => { if (document.visibilityState === 'visible') pull(); }, POLL_MS);

    const origSet = localStorage.setItem.bind(localStorage);
    localStorage.setItem = function (k, v) {
      origSet(k, v);
      if (k === WHOOP_TOKENS_KEY) {
        try { pushWhoopTokens(JSON.parse(v)); } catch (e) {}
      }
    };
  }
  function addWater() {
    let state = null;
    try { state = JSON.parse(localStorage.getItem('po_water_v1')); } catch (e) {}
    if (!state || typeof state !== 'object') state = defaultWaterState();
    state.logs = state.logs || {};
    const k = calendarDateKey();
    state.logs[k] = (state.logs[k] || 0) + 1;
    try { localStorage.setItem('po_water_v1', JSON.stringify(state)); } catch (e) {}
    render();
    const btn = document.getElementById('topbarWater');
    if (btn) { btn.classList.add('flash'); setTimeout(() => btn.classList.remove('flash'), 220); }
    pushWaterMergedToSupabase(state);
  }

  function blockGesture(e) { e.preventDefault(); }
  function lockGestures() {
    document.addEventListener('gesturestart', blockGesture, { passive: false });
    document.addEventListener('gesturechange', blockGesture, { passive: false });
    document.addEventListener('gestureend', blockGesture, { passive: false });
    let lastTouch = 0;
    document.addEventListener('touchend', (e) => {
      const now = Date.now();
      if (now - lastTouch <= 300) e.preventDefault();
      lastTouch = now;
    }, { passive: false });
  }
  function startModalLock() {
    const MODAL_SELECTORS = ['.modal-bg', '.po-modal-bg', '.wt-overlay', '.wt-viewer', '.wt-cam', '.cal-modal-bg'];
    function anyOpen() {
      for (const sel of MODAL_SELECTORS) {
        const els = document.querySelectorAll(sel);
        for (const el of els) {
          if (el.classList.contains('show') || el.classList.contains('is-open')) return true;
        }
      }
      return false;
    }
    function sync() { document.body.classList.toggle('topbar-modal-open', anyOpen()); }
    const observer = new MutationObserver(sync);
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'], subtree: true });
    sync();
  }

  function logout() {
    fetch('/api/logout', { method: 'POST' }).catch(() => {}).then(() => {
      window.location.href = '/login.html';
    });
  }

  function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }

  // -------- Calendar (pure month/year browser, no per-day linkage) --------
  const MONTH_NAMES = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
  let calView = null; // { year, month } — month is 0-11

  function renderCalendar() {
    const grid = document.getElementById('calGrid');
    const title = document.getElementById('calTitle');
    if (!grid || !title || !calView) return;
    const { year, month } = calView;
    title.textContent = MONTH_NAMES[month] + ' ' + year;

    const today = new Date();
    const firstOfMonth = new Date(year, month, 1);
    // Monday-first offset: JS getDay() is 0=Sunday..6=Saturday.
    const startOffset = (firstOfMonth.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    let html = '';
    for (let i = 0; i < startOffset; i++) {
      html += '<div class="cal-day is-other-month">' + (daysInPrevMonth - startOffset + i + 1) + '</div>';
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const isToday = d === today.getDate() && month === today.getMonth() && year === today.getFullYear();
      html += '<div class="cal-day' + (isToday ? ' is-today' : '') + '">' + d + '</div>';
    }
    const totalCells = startOffset + daysInMonth;
    const trailing = (7 - (totalCells % 7)) % 7;
    for (let d = 1; d <= trailing; d++) {
      html += '<div class="cal-day is-other-month">' + d + '</div>';
    }
    grid.innerHTML = html;
  }
  function shiftCalendar(deltaMonths, deltaYears) {
    if (!calView) return;
    let { year, month } = calView;
    if (deltaYears) year += deltaYears;
    if (deltaMonths) {
      month += deltaMonths;
      while (month > 11) { month -= 12; year++; }
      while (month < 0) { month += 12; year--; }
    }
    calView = { year, month };
    renderCalendar();
  }
  function initCalendar() {
    const openBtn = document.getElementById('topbarCalendar');
    const bg = document.getElementById('calModalBg');
    const closeBtn = document.getElementById('calCloseBtn');
    if (!openBtn || !bg) return;
    openBtn.addEventListener('click', () => {
      const now = new Date();
      calView = { year: now.getFullYear(), month: now.getMonth() };
      renderCalendar();
      bg.classList.add('show');
    });
    const close = () => bg.classList.remove('show');
    if (closeBtn) closeBtn.addEventListener('click', close);
    bg.addEventListener('click', (e) => { if (e.target === bg) close(); });
    const on = (id, fn) => { const el = document.getElementById(id); if (el) el.addEventListener('click', fn); };
    on('calPrevMonth', () => shiftCalendar(-1, 0));
    on('calNextMonth', () => shiftCalendar(1, 0));
    on('calPrevYear', () => shiftCalendar(0, -1));
    on('calNextYear', () => shiftCalendar(0, 1));
  }

  // -------- Motivational quote of the day (deterministic, tasteful) --------
  const MOTIVATION_QUOTES = [
    'Jeden Tag ein Punkt besser.',
    'Kleine Fortschritte werden zu großen Ergebnissen.',
    'Trainiere heute für den Spieler, der du morgen sein willst.',
    'Disziplin schlägt Motivation — jeden Tag.',
    'Der nächste Punkt zählt mehr als der letzte.',
    'Form folgt Wiederholung.',
    'Ruhe ist Teil des Trainings.',
    'Konstanz schlägt Intensität.',
    'Was du heute übst, spielst du morgen automatisch.',
    'Große Ziele werden in kleinen Sessions erreicht.',
    'Fokus ist eine Entscheidung, keine Stimmung.',
    'Der Unterschied liegt in den Details.',
    'Gute Gewohnheiten schlagen gute Vorsätze.',
    'Heute zählt — nicht irgendwann.',
    'Kein perfekter Tag, nur der nächste richtige Schritt.',
    'Wer die Grundlagen beherrscht, gewinnt die engen Punkte.',
    'Erholung ist die stille Hälfte des Fortschritts.',
    'Ein Prozent besser ist immer noch besser.',
  ];
  function initQuote() {
    const el = document.getElementById('topbarQuote');
    if (!el) return;
    const d = new Date();
    const seed = d.getFullYear() * 372 + d.getMonth() * 31 + d.getDate();
    el.textContent = '"' + MOTIVATION_QUOTES[seed % MOTIVATION_QUOTES.length] + '"';
  }

  function initAvatarMenus() {
    const pairs = [
      ['tbAvatarBtnTop', 'tbAvatarMenuTop'],
      ['tbAvatarBtnBottom', 'tbAvatarMenuBottom'],
    ];
    const menus = [];
    pairs.forEach(([btnId, menuId]) => {
      const btn = document.getElementById(btnId);
      const menu = document.getElementById(menuId);
      if (!btn || !menu) return;
      menus.push(menu);
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const willOpen = !menu.classList.contains('open');
        menus.forEach((m) => m.classList.remove('open'));
        if (willOpen) menu.classList.add('open');
      });
      menu.querySelectorAll('[data-logout]').forEach((el) => {
        el.addEventListener('click', (e) => { e.preventDefault(); logout(); });
      });
    });
    document.addEventListener('click', () => menus.forEach((m) => m.classList.remove('open')));
  }

  function boot() {
    injectStyleAndHTML();
    registerServiceWorker();
    const btn = document.getElementById('topbarWater');
    if (btn) btn.addEventListener('click', (e) => { e.preventDefault(); addWater(); });
    initAvatarMenus();
    render();
    lockGestures();
    startModalLock();
    initWhoopSync();
    initCalendar();
    initQuote();
    window.addEventListener('storage', render);
    window.addEventListener('focus', render);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) render(); });
    setInterval(render, 30 * 1000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
