// app.js — une todas las páginas. Para agregar una página nueva: escribe su
// archivo en js/pages/, impórtalo aquí abajo y añade una línea al arreglo PAGES.
import { $, $$, S, save, ic, sheet, closeSheet, sheetState, toast, applyTheme, isOnline } from './core.js';
import { audio, state, curTrack, next, prev, toggle, cov, artURL, initMediaSession, restoreLast, graph, applyEq, needsGraph, resumeCtx, getAnalyser, setSleep } from './audio.js';
import { importFiles } from './pages/musica.js';
import { refreshHolidays, resetToMonth } from './pages/calendario.js';

import inicio from './pages/inicio.js';
import tareas from './pages/tareas.js';
import habitos from './pages/habitos.js';
import notas from './pages/notas.js';
import dinero from './pages/dinero.js';
import musica from './pages/musica.js';
import calendario from './pages/calendario.js';
import ajustes from './pages/ajustes.js';

const PAGES = [inicio, tareas, habitos, notas, dinero, musica, calendario, ajustes];
const byId = Object.fromEntries(PAGES.map(p => [p.id, p]));

// registro global de acciones / inputs / cambios de todas las páginas + del núcleo
const ACTIONS = {};
const INPUTS = {};
const CHANGES = {};
PAGES.forEach(p => { Object.assign(ACTIONS, p.actions || {}); Object.assign(INPUTS, p.inputs || {}); Object.assign(CHANGES, p.changes || {}); });

let curPage = (location.hash || '#inicio').slice(1);
if (!byId[curPage]) curPage = 'inicio';

async function render() {
  const page = byId[curPage];
  $('#title').textContent = typeof page.title === 'function' ? page.title() : page.title;
  const html = await page.render();
  $('#main').innerHTML = html;
  $$('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.t === curPage));
  if (page.mount) page.mount();
}
document.addEventListener('app:rerender', render);
document.addEventListener('app:closePlayer', closePlayer);

function goTab(t) { if (t === 'calendario') resetToMonth(); curPage = t; location.hash = t; render(); $('#main').scrollTop = 0; }

// ---------- acciones del núcleo (pestañas, hojas, reproductor) ----------
Object.assign(ACTIONS, {
  tab: b => goTab(b.dataset.t),
  closeSheet,
  yes: () => { const f = sheetState.yes; sheetState.yes = null; closeSheet(); if (f) f(); },
  playerOpen: openPlayer, playerClose: closePlayer,
  pp: () => toggle(), next: () => next(false), prev,
  shuffle: () => { S.p.shuffle = !S.p.shuffle; save(); updPlayerUI(); },
  repeat: () => { S.p.repeat = S.p.repeat === 'off' ? 'all' : S.p.repeat === 'all' ? 'one' : 'off'; save(); updPlayerUI(); },
  rate: () => { const r = [0.75, 1, 1.25, 1.5, 2], i = r.indexOf(S.p.rate); S.p.rate = r[(i + 1) % r.length]; audio.playbackRate = S.p.rate; save(); updPlayerUI(); },
  pFav: () => { const t = curTrack(); if (t) { t.fav = !t.fav; save(); updPlayerUI(); } },
  sleep: () => sheet(`<div class="sh-h"><b>Pausar la música en…</b><button class="ib" data-a="closeSheet" aria-label="Cerrar">${ic('x')}</button></div>
    ${[15, 30, 45, 60].map(m => `<button class="opt" data-a="sleepSet" data-m="${m}">${ic('clock', 22)} ${m} minutos</button>`).join('')}
    <button class="opt" data-a="sleepSet" data-m="0">${ic('x', 22)} Desactivar</button>`),
  sleepSet: b => { closeSheet(); setSleep(+b.dataset.m); },
  fx: () => { $('#fxPanel').classList.toggle('on'); $('#pFx').classList.toggle('on', $('#fxPanel').classList.contains('on')); },
  viz: () => {
    S.p.viz = !S.p.viz;
    if (S.p.viz && !graph()) { S.p.viz = false; toast('Tu navegador no admite el visualizador'); }
    resumeCtx(); save(); updPlayerUI(); vLoop();
  },
  preset: b => {
    const v = b.dataset.v.split(',').map(Number); S.p.eq = v;
    if (v.some(x => x !== 0) && !graph()) { toast('Tu navegador no admite el ecualizador'); S.p.eq = [0, 0, 0]; }
    applyEq(); save();
    $$('.eqs').forEach(e => { const x = S.p.eq[+e.dataset.i]; e.value = x; e.nextElementSibling.textContent = x; e.style.setProperty('--p', ((x + 10) / 20 * 100) + '%'); });
  },
  pQueue: () => {
    const up = state.queue.slice(state.qi + 1, state.qi + 31).map((id, k) => ({ t: S.tracks.find(x => x.id === id), i: state.qi + 1 + k })).filter(x => x.t);
    sheet(`<div class="sh-h"><b>A continuación</b><button class="ib" data-a="closeSheet" aria-label="Cerrar">${ic('x')}</button></div>
      ${up.length ? up.map(x => `<button class="qrow" data-a="qPlay" data-i="${x.i}"><span class="cov" style="${cov(x.t)};width:40px;height:40px">${ic('music', 16)}</span><span class="tt"><b>${x.t.title}</b><small>${x.t.artist || 'Artista desconocido'}</small></span></button>`).join('') : '<div class="empty">No hay más canciones en la cola.</div>'}`);
  },
  qPlay: b => { state.qi = +b.dataset.i; closeSheet(); import('./audio.js').then(m => m.load(state.queue[state.qi])); },
  holUpdate: () => refreshHolidays(true)
});

document.addEventListener('click', e => {
  if (e.target.id === 'sheetBg') { closeSheet(); return; }
  const b = e.target.closest('[data-a]');
  if (b && ACTIONS[b.dataset.a]) ACTIONS[b.dataset.a](b, e);
});
document.addEventListener('input', e => { if (INPUTS[e.target.id]) INPUTS[e.target.id](e.target); });
document.addEventListener('change', e => { if (CHANGES[e.target.id]) CHANGES[e.target.id](e.target); });
document.addEventListener('keydown', e => {
  if (e.key !== 'Enter') return;
  const map = { tInput: 'taskAdd', qInput: 'quickAdd', hName: 'habitAdd', plName: 'plCreate', xAmt: 'txSave', xNote: 'txSave', evTitle: 'evSave' };
  const a = map[e.target.id]; if (a && ACTIONS[a]) ACTIONS[a]();
});
addEventListener('keydown', e => { if (e.key === 'Escape') { if ($('#sheetBg').classList.contains('on')) closeSheet(); else closePlayer(); } });

// ---------- entrada de archivos (importar música) ----------
document.addEventListener('change', e => { if (e.target.id === 'fileIn') { importFiles(e.target.files); e.target.value = ''; } });

// ---------- reproductor: interfaz ----------
let dragging = false, vraf = 0;
function updPlayerUI() {
  const t = curTrack();
  $('#mini').classList.toggle('on', !!t);
  $('#miniPP').innerHTML = ic(audio.paused ? 'play' : 'pause', 22, true);
  $('#miniNx').innerHTML = ic('next', 22, true);
  if (t) {
    $('#miniCov').style.cssText = cov(t); $('#miniCov').innerHTML = ic('music', 18);
    artURL(t).then(u => { if (u) { $('#miniCov').style.backgroundImage = `url(${u})`; $('#miniCov').style.backgroundSize = 'cover'; $('#miniCov').innerHTML = ''; } });
    $('#miniT').textContent = t.title; $('#miniA').textContent = t.artist || 'Artista desconocido';
    $('#player').style.setProperty('--h', t.hue);
    $('#pCov').style.cssText = cov(t);
    $('#pInit').textContent = (t.title[0] || '♪').toUpperCase();
    artURL(t).then(u => { if (u) { $('#pCov').style.backgroundImage = `url(${u})`; $('#pCov').style.backgroundSize = 'cover'; $('#pInit').style.display = 'none'; } else { $('#pInit').style.display = ''; $('#pCov').style.backgroundImage = ''; } });
    $('#pTitle').textContent = t.title; $('#pArtist').textContent = t.artist || 'Artista desconocido';
    $('#pFav').innerHTML = ic('heart', 24, !!t.fav); $('#pFav').classList.toggle('on', !!t.fav);
  } else if ($('#player').classList.contains('on')) closePlayer();
  $('#pPP').innerHTML = ic(audio.paused ? 'play' : 'pause', 30, true);
  $('#pPrev').innerHTML = ic('prev', 26, true); $('#pNext').innerHTML = ic('next', 26, true);
  $('#pShuf').innerHTML = ic('shuffle', 22); $('#pShuf').classList.toggle('on', S.p.shuffle);
  $('#pRep').innerHTML = ic(S.p.repeat === 'one' ? 'repeat1' : 'repeat', 22); $('#pRep').classList.toggle('on', S.p.repeat !== 'off');
  $('#pRate').textContent = S.p.rate + '×';
  $('#vizBtn') && $('#vizBtn').classList.toggle('on', S.p.viz);
  const mp = byId.musica; if (curPage === 'musica' && mp.onPlayerUpdate) mp.onPlayerUpdate();
  if (curPage === 'inicio') render();
  updSleepUI();
}
function updTime() {
  const d = (isFinite(audio.duration) && audio.duration) || (curTrack() && curTrack().dur) || 0, c = audio.currentTime || 0;
  const p = d ? Math.min(100, c / d * 100) : 0;
  $('#miniBar').style.width = p + '%';
  if (!dragging) { const s = $('#seek'); s.value = p * 10; s.style.setProperty('--p', p + '%'); }
  $('#tCur').textContent = fmtT(dragging ? ($('#seek').value / 1000 * d) : c); $('#tDur').textContent = fmtT(d);
}
function fmtT(s) { s = Math.max(0, Math.floor(s || 0)); return Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0'); }
function updSleepUI() {
  const rem = state.sleepAt ? Math.ceil((state.sleepAt - Date.now()) / 60000) : 0;
  const el = $('#pSleep span:last-child'); if (!el) return;
  el.textContent = rem > 0 ? rem + ' min' : 'Dormir';
  $('#pSleep').classList.toggle('on', rem > 0);
}
function openPlayer() {
  if (!curTrack()) return;
  $('#player').classList.add('on');
  $('#vol').value = S.p.vol; $('#vol').style.setProperty('--p', S.p.vol * 100 + '%');
  $$('.eqs').forEach(e => { const v = S.p.eq[+e.dataset.i] || 0; e.value = v; e.nextElementSibling.textContent = v; e.style.setProperty('--p', ((v + 10) / 20 * 100) + '%'); });
  updTime(); vLoop();
}
function closePlayer() { $('#player').classList.remove('on'); cancelAnimationFrame(vraf); }
function vLoop() {
  cancelAnimationFrame(vraf);
  const cv = $('#viz'); if (!cv) return;
  const c = cv.getContext('2d'), W = cv.width, H = cv.height;
  const an = getAnalyser();
  if (!S.p.viz || !an || audio.paused || !$('#player').classList.contains('on')) { c.clearRect(0, 0, W, H); return; }
  const data = new Uint8Array(an.frequencyBinCount); an.getByteFrequencyData(data);
  c.clearRect(0, 0, W, H);
  const n = 28, bw = W / n; c.fillStyle = 'rgba(255,255,255,.82)';
  for (let i = 0; i < n; i++) {
    const v = data[i + 1] / 255, h = Math.max(4, v * H * .75);
    c.beginPath();
    if (c.roundRect) c.roundRect(i * bw + 2, H - h, bw - 4, h, 4); else c.rect(i * bw + 2, H - h, bw - 4, h);
    c.fill();
  }
  vraf = requestAnimationFrame(vLoop);
}
document.addEventListener('input', e => {
  const t = e.target, id = t.id;
  if (id === 'seek') { dragging = true; t.style.setProperty('--p', (t.value / 10) + '%'); const d = audio.duration || 0; $('#tCur').textContent = fmtT(t.value / 1000 * d); }
  else if (id === 'vol') { S.p.vol = +t.value; audio.volume = S.p.vol; t.style.setProperty('--p', (t.value * 100) + '%'); save(); }
  else if (t.classList.contains('eqs')) {
    const v = +t.value; S.p.eq[+t.dataset.i] = v; t.nextElementSibling.textContent = v; t.style.setProperty('--p', ((v + 10) / 20 * 100) + '%');
    if (!graph()) { toast('Tu navegador no admite el ecualizador'); return; }
    applyEq(); save();
  }
});
document.addEventListener('change', e => {
  if (e.target.id === 'seek') { const d = audio.duration || 0; if (d) audio.currentTime = e.target.value / 1000 * d; dragging = false; updTime(); }
});
audio.addEventListener('timeupdate', updTime);
document.addEventListener('player:update', updPlayerUI);
document.addEventListener('player:time', updTime);
document.addEventListener('player:sleep', updSleepUI);

// ---------- conexión ----------
addEventListener('online', () => { toast('Conectado. Actualizando feriados…'); refreshHolidays(false); });
addEventListener('offline', () => toast('Sin conexión: sigues viendo todo lo guardado en tu teléfono'));

// ---------- arranque ----------
applyTheme();
$('#tabs').innerHTML = PAGES.filter(p => p.id !== 'ajustes').map(p => `<button data-a="tab" data-t="${p.id}">${ic(p.tabIcon, 22)}<span>${p.label}</span></button>`).join('');
$('#gear').innerHTML = ic('gear', 22);
$('#pClose').innerHTML = ic('down', 26); $('#pQ').innerHTML = ic('list', 22);
$('#pSleepI').innerHTML = ic('clock', 16); $('#pFxI').innerHTML = ic('sliders', 16); $('#volI').innerHTML = ic('vol', 20);
addEventListener('hashchange', () => { const h = (location.hash || '#inicio').slice(1); if (byId[h]) { curPage = h; render(); } });
initMediaSession();
(async () => { await restoreLast(); updPlayerUI(); })();
render();

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
