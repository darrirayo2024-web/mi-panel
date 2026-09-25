// core.js — estado compartido, utilidades y piezas de interfaz reutilizables.
// Todas las páginas importan de aquí. No depende de ninguna página.

export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
export const pad = n => String(n).padStart(2, '0');
export const ymd = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
export const ymKey = d => d.getFullYear() + '-' + pad(d.getMonth() + 1);
export const today = () => ymd(new Date());
export const fmtT = s => { s = Math.max(0, Math.floor(s || 0)); return Math.floor(s / 60) + ':' + pad(Math.floor(s % 60)); };
export const fmtDur = s => { const h = Math.floor(s / 3600), m = Math.round((s % 3600) / 60); return h ? h + ' h ' + m + ' min' : m + ' min'; };
export const fmtDate = d => new Date(d + 'T00:00:00').toLocaleDateString('es', { day: 'numeric', month: 'short' });
export const fmtRel = ts => ymd(new Date(ts)) === today() ? 'Hoy' : new Date(ts).toLocaleDateString('es', { day: 'numeric', month: 'short' });
export const hash = s => { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
export const clone = o => JSON.parse(JSON.stringify(o));

// ---------- estado persistente (localStorage) ----------
// Se mantiene el mismo nombre de clave que la primera versión de Mi Panel
// para que, si alguien actualiza desde ese archivo, sus datos sigan intactos.
export const STORE_KEY = 'mipanel_v1';
export const DEF = {
  name: 'Isaias', theme: 'auto', currency: 'Q', budget: 0, country: 'GT',
  tasks: [], habits: [], notes: [], tx: [], tracks: [], playlists: [], events: [],
  holidaysCache: {},
  p: { vol: 1, shuffle: false, repeat: 'off', rate: 1, last: null, eq: [0, 0, 0], viz: false }
};
let S;
try {
  const raw = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
  S = Object.assign(clone(DEF), raw || {});
  S.p = Object.assign({}, DEF.p, S.p || {});
  if (!Array.isArray(S.p.eq) || S.p.eq.length !== 3) S.p.eq = [0, 0, 0];
  if (!S.holidaysCache) S.holidaysCache = {};
  if (!S.events) S.events = [];
} catch (e) { S = clone(DEF); }
export { S };

let st;
export const saveNow = () => { try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); } catch (e) {} };
export const save = () => { clearTimeout(st); st = setTimeout(saveNow, 250); };
addEventListener('pagehide', saveNow);
addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') saveNow(); });

export const applyTheme = () => document.documentElement.setAttribute('data-theme', S.theme);

// ---------- almacenamiento de audio (IndexedDB) ----------
// Mismo nombre de base de datos que la primera versión: las canciones ya
// importadas se siguen leyendo sin que el usuario tenga que hacer nada.
const mem = new Map();
let dbp = null;
function db() {
  if (dbp) return dbp;
  dbp = new Promise((res, rej) => {
    try {
      const r = indexedDB.open('mipanel_audio', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('audio');
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    } catch (e) { rej(e); }
  }).catch(() => null);
  return dbp;
}
export async function idbPut(id, blob) {
  const d = await db(); if (!d) return false;
  return new Promise(ok => { try {
    const t = d.transaction('audio', 'readwrite'); t.objectStore('audio').put(blob, id);
    t.oncomplete = () => ok(true); t.onerror = () => ok(false); t.onabort = () => ok(false);
  } catch (e) { ok(false); } });
}
export async function idbGet(id) {
  if (mem.has(id)) return mem.get(id);
  const d = await db(); if (!d) return null;
  return new Promise(ok => { try {
    const r = d.transaction('audio').objectStore('audio').get(id);
    r.onsuccess = () => ok(r.result || null); r.onerror = () => ok(null);
  } catch (e) { ok(null); } });
}
export async function idbDel(id) {
  mem.delete(id); const d = await db(); if (!d) return;
  try { d.transaction('audio', 'readwrite').objectStore('audio').delete(id); } catch (e) {}
}
export const idbSetMem = (id, blob) => mem.set(id, blob);

// ---------- iconos (Feather-like, inline SVG) ----------
const P = {
  home: '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
  checkc: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
  tick: '<polyline points="20 6 9 17 4 12"/>',
  target: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
  note: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>',
  dollar: '<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
  music: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
  cal: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
  play: '<polygon points="6 3 20 12 6 21 6 3"/>',
  pause: '<rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>',
  next: '<polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19"/>',
  prev: '<polygon points="19 20 9 12 19 4 19 20"/><line x1="5" y1="19" x2="5" y2="5"/>',
  shuffle: '<polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/><line x1="4" y1="4" x2="9" y2="9"/>',
  repeat: '<polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>',
  repeat1: '<polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/><path d="M11 10h1v4"/>',
  heart: '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>',
  plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  trash: '<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>',
  sliders: '<line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>',
  x: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
  more: '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
  vol: '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>',
  search: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
  clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  down: '<polyline points="6 9 12 15 18 9"/>',
  left: '<polyline points="15 18 9 12 15 6"/>',
  right: '<polyline points="9 18 15 12 9 6"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>',
  pin: '<line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24z"/>',
  list: '<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>',
  wifi: '<path d="M5 12.55a11 11 0 0 1 14 0"/><path d="M8.5 16.26a6 6 0 0 1 7 0"/><line x1="12" y1="20" x2="12.01" y2="20"/>',
  wifioff: '<line x1="1" y1="1" x2="23" y2="23"/><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/><path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/><path d="M10.71 5.05A16 16 0 0 1 22.58 9"/><path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/>',
  star: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
  refresh: '<polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>'
};
export const ic = (n, s = 22, f = false) => `<svg class="ic" width="${s}" height="${s}" viewBox="0 0 24 24" fill="${f ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n] || ''}</svg>`;

// ---------- toast ----------
let tt;
export const toast = m => {
  const t = $('#toast'); if (!t) return;
  t.textContent = m; t.classList.add('on');
  clearTimeout(tt); tt = setTimeout(() => t.classList.remove('on'), 2400);
};

// ---------- hojas modales (bottom sheet), compartidas por todas las páginas ----------
export const sheetState = { onClose: null, yes: null };
export function sheet(html, onClose, cls) {
  const b = $('#sheetBody'); b.className = 'sheet ' + (cls || ''); b.innerHTML = html;
  $('#sheetBg').classList.add('on'); sheetState.onClose = onClose || null;
}
export function closeSheet() {
  $('#sheetBg').classList.remove('on');
  const f = sheetState.onClose; sheetState.onClose = null; if (f) f();
}
export function confirmSheet(msg, label, fn) {
  sheetState.yes = fn;
  sheet(`<p class="cmsg">${esc(msg)}</p><div class="row2"><button class="btn" data-a="closeSheet">Cancelar</button><button class="btn bad" data-a="yes">${esc(label)}</button></div>`);
}

export const money = n => S.currency + ' ' + Number(n || 0).toLocaleString('es', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ---------- estado de conexión ----------
export const isOnline = () => navigator.onLine;
