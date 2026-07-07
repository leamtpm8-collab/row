// =============================================================
// Persistent dashboard top bar + bottom tab bar.
// Drop this on any page with:
//     <script src="topbar.js" defer></script>
// It self-injects HTML + CSS, reads progress from localStorage,
// and renders the water +1 button in the top bar plus the
// Main/Health/Fitness bottom tabs. Skips chrome on finance.html
// and inside iframes (so the water tracker can embed cleanly).
// =============================================================
(function () {
  'use strict';

  // -------- Supabase config (same project as the rest of the dashboard) --------
  const TOPBAR_SUPABASE_URL = 'https://pwklhcijhzlsggwrpcfn.supabase.co';
  const TOPBAR_SUPABASE_KEY = 'sb_publishable_JOCItyLAFHHpUM5ogSX2vw_miQ9_ig9';

  // -------- CSS --------
  const css = `
.topbar {
  position: sticky; top: 0; z-index: 40;
  display: flex; justify-content: flex-end; align-items: center;
  gap: 8px;
  padding: max(10px, env(safe-area-inset-top)) 14px 8px;
  background: #0a0a0b;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  font-family: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, sans-serif;
}
.topbar-water-wrap { display: flex; align-items: stretch; }
.topbar-water-pill {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 9px 14px;
  background: rgba(125, 211, 252, 0.08);
  border: 1px solid rgba(125, 211, 252, 0.16);
  border-right: none;
  border-radius: 12px 0 0 12px;
  text-decoration: none; color: #FAFAFA;
  -webkit-tap-highlight-color: transparent;
}
.topbar-water-pill .topbar-pill-dot {
  width: 8px; height: 8px; border-radius: 50%;
  background: #7DD3FC; flex-shrink: 0;
}
.topbar-water-pill.warn .topbar-pill-dot { background: #fbbf24; }
.topbar-water-pill.miss .topbar-pill-dot {
  background: #ff8a8a;
  animation: topbar-miss-pulse 1.6s ease-in-out infinite;
}
@keyframes topbar-miss-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.5); }
  50%      { box-shadow: 0 0 0 5px rgba(239, 68, 68, 0); }
}
.topbar-pill-count {
  font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
  font-size: 13px; font-weight: 700; color: #FAFAFA;
  font-variant-numeric: tabular-nums; white-space: nowrap;
}
.topbar-water-add {
  width: 44px;
  border: 1px solid rgba(125, 211, 252, 0.16);
  background: linear-gradient(180deg, rgba(125, 211, 252, 0.28), rgba(110, 231, 183, 0.28));
  color: #FFFFFF; font-family: inherit;
  font-size: 20px; font-weight: 700; line-height: 1;
  cursor: pointer; border-radius: 0 12px 12px 0;
  -webkit-tap-highlight-color: transparent;
  transition: background 0.15s, transform 0.10s;
}
.topbar-water-add:active { transform: scale(0.94); }
.topbar-water-add.flash {
  background: linear-gradient(180deg, rgba(125, 211, 252, 0.7), rgba(110, 231, 183, 0.7));
}
.topbar-finance-btn {
  display: inline-flex; align-items: center; justify-content: center;
  width: 44px; height: 42px;
  border: 1px solid rgba(255, 255, 255, 0.10);
  background: rgba(255, 255, 255, 0.04);
  border-radius: 12px; text-decoration: none;
  -webkit-tap-highlight-color: transparent;
  transition: background 0.15s;
}
.topbar-finance-btn:hover { background: rgba(255, 255, 255, 0.08); }
.topbar-finance-icon {
  font-size: 20px; line-height: 1;
  filter: grayscale(100%) brightness(1.4); opacity: 0.85;
}
.bottombar {
  position: fixed; bottom: 0; left: 0; right: 0; z-index: 40;
  display: flex; justify-content: space-around; align-items: stretch;
  padding: 6px 0 calc(6px + env(safe-area-inset-bottom));
  background: #0a0a0b;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  font-family: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, sans-serif;
}
.bottombar-tab {
  flex: 1;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 3px; padding: 6px 0 4px; text-decoration: none;
  color: rgba(255, 255, 255, 0.45);
  font-size: 10px; font-weight: 600; letter-spacing: 0.04em;
  -webkit-tap-highlight-color: transparent; transition: color 0.15s;
}
.bottombar-tab-icon {
  font-size: 24px; line-height: 1;
  filter: grayscale(100%) brightness(1.2); opacity: 0.55;
  transition: opacity 0.15s, filter 0.15s, transform 0.10s;
}
.bottombar-tab.active { color: #FAFAFA; }
.bottombar-tab.active .bottombar-tab-icon {
  filter: grayscale(100%) brightness(1.6); opacity: 1;
}
.bottombar-tab:active .bottombar-tab-icon { transform: scale(0.92); }
body.has-bottombar {
  padding-bottom: calc(72px + env(safe-area-inset-bottom)) !important;
}
@media (max-width: 480px) {
  .topbar { padding-left: 10px; padding-right: 10px; gap: 6px; }
  .topbar-water-pill { padding: 8px 11px; gap: 6px; }
  .topbar-pill-count { font-size: 12px; }
  .topbar-water-add { width: 40px; font-size: 18px; }
  .topbar-finance-btn { width: 40px; height: 38px; }
  .topbar-finance-icon { font-size: 18px; }
  .bottombar-tab-icon { font-size: 22px; }
  .bottombar-tab { font-size: 10px; }
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
.roger-fab {
  position: fixed; right: 18px; bottom: calc(20px + env(safe-area-inset-bottom));
  z-index: 55; width: 58px; height: 58px; padding: 0; border: none; background: transparent;
  cursor: pointer; -webkit-tap-highlight-color: transparent;
  filter: drop-shadow(0 6px 16px rgba(0, 0, 0, 0.45));
  transition: bottom 0.2s ease;
}
body.has-bottombar .roger-fab, body.has-page-tabs .roger-fab { bottom: calc(84px + env(safe-area-inset-bottom)); }
.roger-fab-ballwrap {
  position: relative; width: 100%; height: 100%; display: block;
  animation: rogerFabFloat 4.2s ease-in-out infinite;
  transform-origin: 50% 60%; will-change: transform;
}
.roger-fab-ball { width: 100%; height: 100%; display: block; }
.roger-fab-face {
  position: absolute; top: 28%; left: 50%; width: 56%; height: 24%;
  transform: translateX(-50%); display: flex; justify-content: space-between;
  pointer-events: none;
}
.roger-fab-eye {
  position: relative; width: 44%; aspect-ratio: 1 / 1;
  background: #fdfff0; border-radius: 50%;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.25);
  display: flex; align-items: center; justify-content: center;
  transition: transform 0.1s ease;
}
.roger-fab-eye.blink { transform: scaleY(0.12); }
.roger-fab-pupil { width: 48%; height: 48%; background: #182408; border-radius: 50%; position: relative; }
.roger-fab-pupil::after {
  content: ''; position: absolute; top: 14%; left: 18%;
  width: 32%; height: 32%; background: rgba(255, 255, 255, 0.9); border-radius: 50%;
}
@keyframes rogerFabFloat {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  50%      { transform: translateY(-4px) rotate(-3deg); }
}
@media (max-width: 480px) {
  .roger-fab { width: 52px; height: 52px; right: 14px; }
}

/* ---- Roger chat popup ---- */
.roger-popup {
  position: fixed; right: 18px; bottom: calc(90px + env(safe-area-inset-bottom));
  width: min(380px, calc(100vw - 28px));
  height: min(560px, calc(100vh - 150px));
  background: #0a0a0b; border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 22px; box-shadow: 0 24px 64px rgba(0, 0, 0, 0.6);
  z-index: 56; display: flex; flex-direction: column; overflow: hidden;
  opacity: 0; transform: translateY(18px) scale(0.94); transform-origin: bottom right;
  pointer-events: none; transition: opacity 0.22s ease, transform 0.28s cubic-bezier(0.22, 1, 0.36, 1), bottom 0.2s ease;
  font-family: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, sans-serif;
}
.roger-popup.open { opacity: 1; transform: translateY(0) scale(1); pointer-events: auto; }
body.has-bottombar .roger-popup, body.has-page-tabs .roger-popup { bottom: calc(154px + env(safe-area-inset-bottom)); }
@media (max-width: 480px) {
  .roger-popup { right: 10px; width: calc(100vw - 20px); bottom: calc(84px + env(safe-area-inset-bottom)); }
  body.has-bottombar .roger-popup, body.has-page-tabs .roger-popup { bottom: calc(148px + env(safe-area-inset-bottom)); }
}
.roger-popup-header {
  display: flex; align-items: center; gap: 10px; padding: 14px 14px 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08); flex-shrink: 0;
}
.roger-popup-avatar { width: 30px; height: 30px; flex-shrink: 0; }
.roger-popup-name { font-size: 14px; font-weight: 700; color: #fff; font-family: 'Times New Roman', Georgia, serif; font-style: italic; }
.roger-popup-status { font-size: 10px; color: rgba(255, 255, 255, 0.4); font-family: ui-monospace, monospace; text-transform: uppercase; letter-spacing: 0.08em; }
.roger-popup-actions { margin-left: auto; display: flex; gap: 4px; }
.roger-popup-iconbtn {
  width: 30px; height: 30px; border-radius: 9px; border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.03); color: rgba(255, 255, 255, 0.6); font-size: 14px;
  cursor: pointer; display: flex; align-items: center; justify-content: center;
}
.roger-popup-iconbtn:hover { background: rgba(255, 255, 255, 0.08); color: #fff; }
.roger-popup-keypanel { display: none; padding: 12px 14px; border-bottom: 1px solid rgba(255, 255, 255, 0.08); flex-shrink: 0; }
.roger-popup-keypanel.open { display: block; }
.roger-popup-keybar { display: flex; gap: 6px; }
.roger-popup-keybar input {
  flex: 1; background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.1);
  color: #fff; border-radius: 8px; padding: 8px 9px; font-size: 12px; outline: none; min-width: 0;
}
.roger-popup-keybar button {
  border: 0; border-radius: 8px; padding: 0 12px; cursor: pointer; color: #10160a;
  background: #c6e937; font-weight: 700; font-size: 12px;
}
.roger-popup-hint { font-size: 10.5px; color: rgba(255, 255, 255, 0.4); line-height: 1.4; margin-top: 7px; }
.roger-popup-hint a { color: #c6e937; }
.roger-popup-hint.saved { color: #c6e937; }
.roger-popup-feed { flex: 1; overflow-y: auto; padding: 12px 14px; display: flex; flex-direction: column; gap: 9px; overscroll-behavior: contain; }
.roger-popup-msg { max-width: 92%; }
.roger-popup-msg.user { align-self: flex-end; }
.roger-popup-msg.coach { align-self: flex-start; width: 100%; }
.roger-popup-bubble { border-radius: 12px; padding: 9px 11px; font-size: 13px; line-height: 1.5; color: #e9ecf5; }
.roger-popup-msg.user .roger-popup-bubble { background: rgba(255, 255, 255, 0.06); border: 1px solid rgba(255, 255, 255, 0.08); }
.roger-popup-msg.coach .roger-popup-bubble { background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(198, 233, 55, 0.3); border-left: 2px solid #c6e937; }
.roger-popup-tag {
  display: inline-block; margin-bottom: 6px; font-family: ui-monospace, monospace; font-size: 8.5px;
  font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #10160a;
  background: #c6e937; padding: 2px 7px; border-radius: 999px;
}
.roger-popup-bubble b, .roger-popup-pill { color: #c6e937; font-weight: 700; }
.roger-popup-pill { background: rgba(198, 233, 55, 0.16); padding: 1px 5px; border-radius: 5px; font-weight: 600; }
.roger-popup-list { margin: 5px 0 0; padding-left: 15px; display: grid; gap: 4px; }
.roger-popup-dots { display: inline-flex; gap: 4px; }
.roger-popup-dots i { width: 5px; height: 5px; border-radius: 50%; background: #c6e937; opacity: 0.4; animation: rogerPopupDot 1.2s ease-in-out infinite; }
.roger-popup-dots i:nth-child(2) { animation-delay: 0.2s; } .roger-popup-dots i:nth-child(3) { animation-delay: 0.4s; }
@keyframes rogerPopupDot { 0%, 100% { opacity: 0.35; transform: scale(1); } 50% { opacity: 1; transform: scale(1.4); } }
.roger-popup-chips { display: flex; flex-wrap: wrap; gap: 6px; padding: 0 14px 10px; flex-shrink: 0; }
.roger-chip {
  border: 1px solid rgba(198, 233, 55, 0.3); background: rgba(198, 233, 55, 0.08); color: #e9ecf5;
  font-size: 11px; font-family: inherit; padding: 6px 10px; border-radius: 999px; cursor: pointer;
  text-align: left; transition: background 0.15s ease, border-color 0.15s ease; max-width: 100%;
}
.roger-chip:hover { background: rgba(198, 233, 55, 0.16); border-color: rgba(198, 233, 55, 0.5); }
.roger-popup-composer { display: flex; gap: 7px; padding: 10px 14px; border-top: 1px solid rgba(255, 255, 255, 0.08); flex-shrink: 0; }
.roger-popup-composer input {
  flex: 1; background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.1);
  color: #fff; border-radius: 10px; padding: 9px 11px; font-size: 12.5px; outline: none; min-width: 0;
}
.roger-popup-composer input:focus { border-color: rgba(198, 233, 55, 0.5); }
.roger-popup-composer button {
  width: 36px; flex-shrink: 0; border: 0; border-radius: 10px; cursor: pointer;
  color: #10160a; background: #c6e937; font-size: 15px;
}
`;

  const topbarHtml = `
<header class="topbar" id="topbar" role="navigation" aria-label="Schnellzugriff">
  <div class="topbar-water-wrap">
    <a href="health.html#water" class="topbar-water-pill" id="topbarWater" aria-label="Wasser-Fortschritt">
      <span class="topbar-pill-dot"></span>
      <span class="topbar-pill-count" id="topbarWaterCount">0/0</span>
    </a>
    <button class="topbar-water-add" id="topbarWaterAdd" aria-label="Ein Getränk erfassen" type="button">+</button>
  </div>
  <a href="finance.html" class="topbar-finance-btn" id="topbarFinance" aria-label="Finanzen">
    <span class="topbar-finance-icon">📊</span>
  </a>
  <button class="topbar-finance-btn" id="topbarLogout" aria-label="Abmelden" type="button">
    <span class="topbar-finance-icon">🚪</span>
  </button>
</header>`;

  const bottombarHtml = `
<nav class="bottombar" id="bottombar" role="navigation" aria-label="Hauptbereiche">
  <a href="main.html" class="bottombar-tab" data-page="main">
    <span class="bottombar-tab-icon">🏠</span><span>Start</span>
  </a>
  <a href="wellness.html" class="bottombar-tab" data-page="health">
    <span class="bottombar-tab-icon">💊</span><span>Gesundheit</span>
  </a>
  <a href="fitness.html" class="bottombar-tab" data-page="fitness">
    <span class="bottombar-tab-icon">💪</span><span>Fitness</span>
  </a>
</nav>`;

  const rogerFabHtml = `
<button class="roger-fab" id="rogerFab" type="button" aria-label="Roger öffnen — KI-Assistent">
  <span class="roger-fab-ballwrap">
    <svg class="roger-fab-ball" viewBox="0 0 200 200" aria-hidden="true">
      <defs>
        <radialGradient id="rogerFabShade" cx="35%" cy="30%" r="75%">
          <stop offset="0%" stop-color="#eaff7a"/>
          <stop offset="55%" stop-color="#c6e937"/>
          <stop offset="100%" stop-color="#9dbf1f"/>
        </radialGradient>
      </defs>
      <circle cx="100" cy="100" r="94" fill="url(#rogerFabShade)"/>
      <path d="M 10 66 C 55 6, 145 6, 190 66" stroke="#fdfff0" stroke-width="10" fill="none" stroke-linecap="round"/>
      <path d="M 10 134 C 55 194, 145 194, 190 134" stroke="#fdfff0" stroke-width="10" fill="none" stroke-linecap="round"/>
    </svg>
    <span class="roger-fab-face">
      <span class="roger-fab-eye" id="rogerFabEyeL"><span class="roger-fab-pupil" id="rogerFabPupilL"></span></span>
      <span class="roger-fab-eye" id="rogerFabEyeR"><span class="roger-fab-pupil" id="rogerFabPupilR"></span></span>
    </span>
  </span>
</button>`;

  const rogerPopupHtml = `
<div class="roger-popup" id="rogerPopup" aria-hidden="true">
  <div class="roger-popup-header">
    <svg class="roger-popup-avatar" viewBox="0 0 200 200" aria-hidden="true">
      <defs>
        <radialGradient id="rogerPopupShade" cx="35%" cy="30%" r="75%">
          <stop offset="0%" stop-color="#eaff7a"/>
          <stop offset="55%" stop-color="#c6e937"/>
          <stop offset="100%" stop-color="#9dbf1f"/>
        </radialGradient>
      </defs>
      <circle cx="100" cy="100" r="94" fill="url(#rogerPopupShade)"/>
      <path d="M 10 66 C 55 6, 145 6, 190 66" stroke="#fdfff0" stroke-width="12" fill="none" stroke-linecap="round"/>
      <path d="M 10 134 C 55 194, 145 194, 190 134" stroke="#fdfff0" stroke-width="12" fill="none" stroke-linecap="round"/>
    </svg>
    <div>
      <div class="roger-popup-name">Roger</div>
      <div class="roger-popup-status">KI-Assistent</div>
    </div>
    <div class="roger-popup-actions">
      <button class="roger-popup-iconbtn" id="rogerPopupKeyBtn" type="button" aria-label="API-Schlüssel" title="API-Schlüssel">🔑</button>
      <button class="roger-popup-iconbtn" id="rogerPopupCloseBtn" type="button" aria-label="Schließen" title="Schließen">✕</button>
    </div>
  </div>
  <div class="roger-popup-keypanel" id="rogerPopupKeypanel">
    <div class="roger-popup-keybar">
      <input id="rogerPopupKeyInput" type="password" placeholder="sk-ant-…" autocomplete="off">
      <button id="rogerPopupKeySave" type="button">Speichern</button>
    </div>
    <div class="roger-popup-hint" id="rogerPopupHint">
      Dein Schlüssel wird nur in diesem Browser gespeichert und direkt an Anthropic gesendet.
      Einen Schlüssel bekommst du unter <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener">console.anthropic.com</a>.
    </div>
  </div>
  <div class="roger-popup-feed" id="rogerPopupFeed"></div>
  <div class="roger-popup-chips" id="rogerPopupChips"></div>
  <div class="roger-popup-composer">
    <input id="rogerPopupInput" placeholder="Frag Roger etwas…" autocomplete="off">
    <button id="rogerPopupSend" type="button" aria-label="Senden">→</button>
  </div>
</div>`;

  function isFinancePage() {
    const p = (window.location.pathname || '').toLowerCase();
    return p.endsWith('/finance.html') || p.endsWith('finance.html');
  }
  function isRogerPage() {
    const p = (window.location.pathname || '').toLowerCase();
    return p.endsWith('/roger.html') || p.endsWith('roger.html');
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
    if (p.endsWith('gym.html')) return 'fitness';
    if (p.endsWith('fitness.html')) return 'fitness';
    if (p.endsWith('activities.html')) return 'fitness';
    if (p.endsWith('start-activity.html')) return 'fitness';
    if (p.endsWith('progress.html')) return 'fitness';
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
      document.body.insertBefore(topWrap.firstChild, document.body.firstChild);
      const bottomWrap = document.createElement('div');
      bottomWrap.innerHTML = bottombarHtml.trim();
      document.body.appendChild(bottomWrap.firstChild);
      const active = currentPageKey();
      document.querySelectorAll('.bottombar-tab').forEach((t) => {
        t.classList.toggle('active', t.getAttribute('data-page') === active);
      });
      document.body.classList.add('has-bottombar');
    }
    if (!isRogerPage() && !isEmbedded() && !document.getElementById('rogerFab')) {
      const fabWrap = document.createElement('div');
      fabWrap.innerHTML = rogerFabHtml.trim();
      document.body.appendChild(fabWrap.firstChild);
      const popupWrap = document.createElement('div');
      popupWrap.innerHTML = rogerPopupHtml.trim();
      document.body.appendChild(popupWrap.firstChild);
      if (isFinancePage()) document.body.classList.add('has-page-tabs');
    }
  }

  function initRogerFab() {
    const fab = document.getElementById('rogerFab');
    if (!fab) return;
    const eyeL = document.getElementById('rogerFabEyeL');
    const eyeR = document.getElementById('rogerFabEyeR');
    const pupilL = document.getElementById('rogerFabPupilL');
    const pupilR = document.getElementById('rogerFabPupilR');

    const MAX_PUPIL_OFFSET = 2.6;
    const MAX_TILT_DEG = 10;
    const EASE = 0.16;

    let hovering = false;
    let targetTilt = 0, curTilt = 0;
    let targetPupilX = 0, targetPupilY = 0, curPupilX = 0, curPupilY = 0;
    let idlePupilTarget = { x: 0, y: 0 };

    function scheduleIdleLook() {
      const delay = 1600 + Math.random() * 2400;
      setTimeout(() => {
        if (!hovering) {
          idlePupilTarget = {
            x: (Math.random() * 2 - 1) * MAX_PUPIL_OFFSET * 0.6,
            y: (Math.random() * 2 - 1) * MAX_PUPIL_OFFSET * 0.5,
          };
        }
        scheduleIdleLook();
      }, delay);
    }
    function blinkOnce() {
      eyeL.classList.add('blink'); eyeR.classList.add('blink');
      setTimeout(() => { eyeL.classList.remove('blink'); eyeR.classList.remove('blink'); }, 140);
    }
    function scheduleBlink() {
      const delay = 2400 + Math.random() * 3800;
      setTimeout(() => { blinkOnce(); scheduleBlink(); }, delay);
    }
    function onPointerMove(e) {
      const rect = fab.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = e.clientX - cx, dy = e.clientY - cy;
      const dist = Math.max(Math.hypot(dx, dy), 1);
      const nx = dx / dist, ny = dy / dist;
      targetPupilX = nx * MAX_PUPIL_OFFSET;
      targetPupilY = ny * MAX_PUPIL_OFFSET;
      targetTilt = nx * MAX_TILT_DEG;
    }
    function onEnter() { hovering = true; }
    function onLeave() { hovering = false; targetTilt = 0; }
    function onClick() { rogerTogglePopup(); }

    function tick() {
      curTilt += (targetTilt - curTilt) * EASE;
      fab.style.transform = 'rotate(' + curTilt.toFixed(2) + 'deg)';
      const px = hovering ? targetPupilX : idlePupilTarget.x;
      const py = hovering ? targetPupilY : idlePupilTarget.y;
      curPupilX += (px - curPupilX) * EASE;
      curPupilY += (py - curPupilY) * EASE;
      const t = 'translate(' + curPupilX.toFixed(2) + 'px,' + curPupilY.toFixed(2) + 'px)';
      pupilL.style.transform = t;
      pupilR.style.transform = t;
      requestAnimationFrame(tick);
    }

    fab.addEventListener('mouseenter', onEnter);
    fab.addEventListener('mousemove', onPointerMove);
    fab.addEventListener('mouseleave', onLeave);
    fab.addEventListener('click', onClick);
    scheduleIdleLook();
    scheduleBlink();
    requestAnimationFrame(tick);
  }

  // ============================================================
  // Roger chat popup — bring-your-own-Anthropic-key chat, same
  // localStorage key (roger_api_key_v1) as roger.html so a saved
  // key works in both places. Reads whatever the dashboard has
  // saved in localStorage as context, plus a live WHOOP pull
  // (recovery/sleep/cycle) when a WHOOP connection exists, so the
  // suggested questions about recovery/sleep/strain have real data
  // to answer from.
  // ============================================================
  const ROGER_KEY_LS = 'roger_api_key_v1';
  let rogerChipTimer = null;
  let rogerBusy = false;

  function rogerSavedKey() { try { return localStorage.getItem(ROGER_KEY_LS) || ''; } catch (e) { return ''; } }
  function rogerEsc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
  function rogerInlineMarks(s) { return rogerEsc(s).replace(/\*\*(.+?)\*\*/g, '<span class="roger-popup-pill">$1</span>'); }
  function rogerRenderMd(text) {
    const lines = String(text).split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const items = [], loose = [];
    for (const l of lines) {
      if (/^[-•*]\s+/.test(l)) items.push('<li>' + rogerInlineMarks(l.replace(/^[-•*]\s+/, '')) + '</li>');
      else loose.push(rogerInlineMarks(l));
    }
    let html = loose.join('<br>');
    if (items.length) html += (html ? '<br>' : '') + '<ul class="roger-popup-list">' + items.join('') + '</ul>';
    return html;
  }
  function rogerAddUser(t) {
    const feed = document.getElementById('rogerPopupFeed');
    if (!feed) return;
    const el = document.createElement('div');
    el.className = 'roger-popup-msg user';
    el.innerHTML = '<div class="roger-popup-bubble">' + rogerEsc(t) + '</div>';
    feed.appendChild(el);
    feed.scrollTop = feed.scrollHeight;
  }
  function rogerAddCoach(html) {
    const feed = document.getElementById('rogerPopupFeed');
    if (!feed) return null;
    const el = document.createElement('div');
    el.className = 'roger-popup-msg coach';
    el.innerHTML = '<div class="roger-popup-bubble"><span class="roger-popup-tag">Roger</span><div>' + html + '</div></div>';
    feed.appendChild(el);
    feed.scrollTop = feed.scrollHeight;
    return el;
  }

  async function rogerRefreshWhoopToken(t) {
    if (!t.refresh) return null;
    try {
      const r = await fetch('/api/whoop-refresh', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: t.refresh }) });
      const j = await r.json();
      if (j.access_token) {
        const next = { access: j.access_token, refresh: j.refresh_token || t.refresh, expires: Date.now() + (j.expires_in || 3500) * 1000 };
        try { localStorage.setItem('whoop_tokens_v1', JSON.stringify(next)); } catch (e) {}
        return next;
      }
    } catch (e) {}
    return null;
  }
  async function rogerWhoopFetch(path, t) {
    const [p, qs] = path.split('?');
    const params = new URLSearchParams(qs || ''); params.set('path', p);
    const r = await fetch('/api/whoop-data?' + params.toString(), { headers: { Authorization: 'Bearer ' + t.access, Accept: 'application/json' } });
    if (r.status === 401) { const n = await rogerRefreshWhoopToken(t); if (n) return rogerWhoopFetch(path, n); throw new Error('unauthorized'); }
    if (!r.ok) throw new Error('WHOOP ' + r.status);
    return await r.json();
  }
  async function rogerGatherContext() {
    const out = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k === ROGER_KEY_LS) continue;
      try { out[k] = JSON.parse(localStorage.getItem(k)); } catch (e) { out[k] = localStorage.getItem(k); }
    }
    let tokens = null;
    try { tokens = JSON.parse(localStorage.getItem('whoop_tokens_v1')); } catch (e) {}
    if (tokens && tokens.access) {
      try {
        let t = tokens;
        if (t.expires && Date.now() > t.expires - 60000) { const n = await rogerRefreshWhoopToken(t); if (n) t = n; }
        const [rec, sleep, cycle] = await Promise.all([
          rogerWhoopFetch('/recovery?limit=1', t).catch(() => null),
          rogerWhoopFetch('/activity/sleep?limit=1', t).catch(() => null),
          rogerWhoopFetch('/cycle?limit=1', t).catch(() => null),
        ]);
        out.whoop_live = {
          recovery: rec && rec.records && rec.records[0] && rec.records[0].score,
          sleep: sleep && sleep.records && sleep.records[0],
          cycle: cycle && cycle.records && cycle.records[0] && cycle.records[0].score,
        };
      } catch (e) { /* not connected / offline — Roger just answers from local data */ }
    }
    return out;
  }

  function rogerTodayKey() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function rogerBuildChipPool() {
    const pool = [
      'Wie hoch sollte mein heutiger Strain sein?',
      'Habe ich heute genug Bewegung?',
      'Wie sieht mein aktueller Gesundheitszustand aus?',
      'Was sollte ich heute tun, um mich besser zu regenerieren?',
      'Gib mir Tipps für einen besseren Schlaf.',
    ];
    let tokens = null;
    try { tokens = JSON.parse(localStorage.getItem('whoop_tokens_v1')); } catch (e) {}
    if (tokens && tokens.access) {
      pool.push('Wie hat sich mein Schlaf heute auf meine Erholung ausgewirkt?');
      pool.push('Wie gut passt mein heutiges Training zu meiner Recovery?');
      pool.push('Was bedeutet meine aktuelle Herzfrequenzvariabilität?');
    }
    try {
      const acts = JSON.parse(localStorage.getItem('fitness_activities_v1')) || [];
      const todays = acts.filter((a) => (a.startTime || '').slice(0, 10) === rogerTodayKey());
      if (todays.length) {
        const last = todays[todays.length - 1];
        pool.push('Du hast heute bereits ' + last.type + ' gemacht. Wie wirkt sich das auf morgen aus?');
      }
    } catch (e) {}
    try {
      if (JSON.parse(localStorage.getItem('po_water_v1'))) pool.push('Sollte ich heute mehr Wasser trinken?');
    } catch (e) {}
    try {
      const taken = JSON.parse(localStorage.getItem('stack:taken:' + rogerTodayKey()));
      if (taken && Object.keys(taken).length) pool.push('Welche Auswirkungen könnten meine Medikamente auf meine Erholung haben?');
    } catch (e) {}
    try {
      const ds = JSON.parse(localStorage.getItem('daily_score_v1'));
      if (ds && ds.date === rogerTodayKey() && ds.score != null) {
        pool.push('Warum ist mein Tagesscore heute nur ' + ds.score + '%?');
        pool.push('Was bringt mir heute die meisten zusätzlichen Punkte?');
        pool.push('Wie schaffe ich heute noch über 90% Tagesscore?');
        pool.push('Welche Gewohnheit verbessert meinen Tagesscore langfristig am meisten?');
      }
    } catch (e) {}
    return pool;
  }
  function rogerRenderChips() {
    const chipsEl = document.getElementById('rogerPopupChips');
    if (!chipsEl) return;
    const pool = rogerBuildChipPool();
    const chips = pool.slice().sort(() => Math.random() - 0.5).slice(0, 4);
    chipsEl.innerHTML = chips.map((c) => '<button class="roger-chip" type="button">' + rogerEsc(c) + '</button>').join('');
    chipsEl.querySelectorAll('.roger-chip').forEach((btn) => {
      btn.addEventListener('click', () => rogerAsk(btn.textContent));
    });
  }
  function rogerStartChipRotation() {
    clearInterval(rogerChipTimer);
    rogerChipTimer = setInterval(rogerRenderChips, 25000);
  }

  const ROGER_SYS =
    "You are Roger, a friendly, motivating personal AI assistant living inside the user's life-tracking dashboard. " +
    "You can see their saved data (food, water, gym, finance, sleep, goals, activities, etc.) and, when connected, live WHOOP recovery/sleep/cycle data under 'whoop_live'. " +
    "'daily_score_v1' holds their composite Tagesscore (0-100%) for today with a 'breakdown' of per-category ratios (0-1) and the 'weights' used — this is one of the most important things to them, so when asked about it, explain concretely which breakdown categories are pulling the score down or up and what a realistic next step would change. " +
    "Give honest, specific, encouraging guidance grounded in that data. " +
    "Always answer in German (Deutsch). " +
    "Answer in short bullet points starting with '- ', few words each, plain language. " +
    "Wrap key words and numbers in **double asterisks**. " +
    "End with one '- Heute tun:' bullet giving the single action. " +
    "Dashboard data as JSON:\n";

  async function rogerAsk(rawText) {
    const input = document.getElementById('rogerPopupInput');
    const text = (rawText || (input && input.value) || '').trim();
    if (!text || rogerBusy) return;
    const key = rogerSavedKey();
    if (!key) {
      rogerAddCoach('- Füge zuerst oben deinen **Anthropic-API-Schlüssel** ein und frag mich dann erneut.');
      document.getElementById('rogerPopupKeypanel').classList.add('open');
      return;
    }
    rogerBusy = true;
    rogerAddUser(text);
    if (input) input.value = '';
    const loading = rogerAddCoach('<span class="roger-popup-dots"><i></i><i></i><i></i></span>');
    try {
      const context = await rogerGatherContext();
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-opus-4-8',
          max_tokens: 1024,
          system: ROGER_SYS + JSON.stringify(context),
          messages: [{ role: 'user', content: text }],
        }),
      });
      const json = await res.json();
      if (json.error) {
        loading.querySelector('div:last-child').innerHTML = rogerRenderMd('- ' + (json.error.message || 'Etwas ist schiefgelaufen — prüfe deinen API-Schlüssel.'));
      } else {
        const reply = (json.content && json.content[0] && json.content[0].text) || 'Hmm, keine Antwort.';
        loading.querySelector('div:last-child').innerHTML = rogerRenderMd(reply);
      }
    } catch (e) {
      loading.querySelector('div:last-child').innerHTML = rogerRenderMd('- Konnte Anthropic nicht erreichen — prüfe deine Verbindung und deinen Schlüssel.');
    }
    rogerBusy = false;
  }

  function rogerOpenPopup() {
    const popup = document.getElementById('rogerPopup');
    if (!popup) return;
    popup.classList.add('open');
    popup.setAttribute('aria-hidden', 'false');
    rogerRenderChips();
    rogerStartChipRotation();
    document.addEventListener('click', rogerOutsideClick, true);
  }
  function rogerClosePopup() {
    const popup = document.getElementById('rogerPopup');
    if (!popup) return;
    popup.classList.remove('open');
    popup.setAttribute('aria-hidden', 'true');
    clearInterval(rogerChipTimer);
    document.removeEventListener('click', rogerOutsideClick, true);
  }
  function rogerTogglePopup() {
    const popup = document.getElementById('rogerPopup');
    if (!popup) return;
    if (popup.classList.contains('open')) rogerClosePopup(); else rogerOpenPopup();
  }
  function rogerOutsideClick(e) {
    const popup = document.getElementById('rogerPopup');
    const fab = document.getElementById('rogerFab');
    if (!popup || !popup.classList.contains('open')) return;
    if (popup.contains(e.target) || (fab && fab.contains(e.target))) return;
    rogerClosePopup();
  }

  function initRogerPopup() {
    const popup = document.getElementById('rogerPopup');
    if (!popup) return;
    const keyToggle = document.getElementById('rogerPopupKeyBtn');
    const keypanel = document.getElementById('rogerPopupKeypanel');
    const keyInput = document.getElementById('rogerPopupKeyInput');
    const hint = document.getElementById('rogerPopupHint');
    if (rogerSavedKey()) {
      hint.classList.add('saved');
      hint.innerHTML = '✓ Schlüssel gespeichert in diesem Browser.';
      keyInput.placeholder = '•••• Schlüssel gespeichert ••••';
      keyToggle.style.opacity = '1';
    }
    keyToggle.addEventListener('click', () => keypanel.classList.toggle('open'));
    document.getElementById('rogerPopupKeySave').addEventListener('click', () => {
      const k = keyInput.value.trim();
      if (!k) return;
      try { localStorage.setItem(ROGER_KEY_LS, k); } catch (e) {}
      keyInput.value = '';
      keyInput.placeholder = '•••• Schlüssel gespeichert ••••';
      hint.classList.add('saved');
      hint.innerHTML = '✓ Schlüssel gespeichert in diesem Browser.';
      keypanel.classList.remove('open');
    });
    document.getElementById('rogerPopupCloseBtn').addEventListener('click', rogerClosePopup);
    document.getElementById('rogerPopupSend').addEventListener('click', () => rogerAsk());
    document.getElementById('rogerPopupInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') rogerAsk(); });
    rogerAddCoach('Hey — ich bin <b>Roger</b>. Frag mich zu Ernährung, Training, Schlaf oder wo du anfangen sollst.');
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
  function setPillStatus(pillEl, status) {
    pillEl.classList.remove('good', 'warn', 'miss');
    if (status === 'warn' || status === 'miss') pillEl.classList.add(status);
  }
  function render() {
    const waterEl = document.getElementById('topbarWater');
    if (!waterEl) return;
    const w = getWaterProgress();
    const countEl = document.getElementById('topbarWaterCount');
    if (countEl) countEl.textContent = w.total ? w.done + '/' + w.total : '0/0';
    setPillStatus(waterEl, classifyStatus(w.done, w.total));
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
    if (!window.supabase || !TOPBAR_SUPABASE_URL || !TOPBAR_SUPABASE_KEY) return;
    if (TOPBAR_SUPABASE_URL.indexOf('PASTE-') === 0) return;
    try {
      const supa = window.supabase.createClient(TOPBAR_SUPABASE_URL, TOPBAR_SUPABASE_KEY);
      const { data } = await supa
        .from('app_state').select('data').eq('key', 'health').maybeSingle();
      const current = (data && data.data) || {};
      const merged = Object.assign({}, current, { po_water_v1: localWater });
      await supa.from('app_state').upsert(
        { key: 'health', data: merged, updated_at: new Date().toISOString() },
        { onConflict: 'key' }
      );
    } catch (e) {}
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
    const btn = document.getElementById('topbarWaterAdd');
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
    const MODAL_SELECTORS = ['.modal-bg', '.po-modal-bg', '.wt-overlay', '.wt-viewer', '.wt-cam'];
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

  function boot() {
    injectStyleAndHTML();
    const btn = document.getElementById('topbarWaterAdd');
    if (btn) btn.addEventListener('click', (e) => { e.preventDefault(); addWater(); });
    const logoutBtn = document.getElementById('topbarLogout');
    if (logoutBtn) logoutBtn.addEventListener('click', (e) => { e.preventDefault(); logout(); });
    initRogerFab();
    initRogerPopup();
    render();
    lockGestures();
    startModalLock();
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
