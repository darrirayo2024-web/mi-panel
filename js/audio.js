// audio.js — todo lo relacionado a reproducir música. No conoce las páginas;
// avisa cambios disparando eventos ('player:update', 'player:time') que
// app.js y la página de música escuchan para redibujarse.
import { S, save, idbGet, idbDel, hash, toast } from './core.js';

export const audio = new Audio();
audio.preload = 'auto';
audio.volume = S.p.vol;

export const state = { base: [], queue: [], qi: -1, curId: null, curUrl: null, sleepAt: 0 };
let sleepT = 0, sleepI = 0, lastPos = 0;

export const curTrack = () => S.tracks.find(t => t.id === state.curId) || null;
const shuf = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[a[i], a[j]] = [a[j], a[i]]; } return a; };
const emit = (name, detail) => document.dispatchEvent(new CustomEvent(name, { detail }));

function buildQueue(startId) {
  state.queue = S.p.shuffle ? [startId, ...shuf(state.base.filter(x => x !== startId))] : state.base.slice();
  state.qi = state.queue.indexOf(startId);
}

export async function load(id, autoplay = true) {
  const t = S.tracks.find(x => x.id === id); if (!t) return false;
  const blob = await idbGet(id);
  if (!blob) { toast('No se encontró el archivo de "' + t.title + '". Impórtalo de nuevo.'); return false; }
  if (state.curUrl) URL.revokeObjectURL(state.curUrl);
  state.curUrl = URL.createObjectURL(blob); state.curId = id;
  audio.src = state.curUrl; audio.playbackRate = S.p.rate;
  S.p.last = id; save();
  await setMedia(t);
  emit('player:update');
  if (autoplay) { try { await audio.play(); } catch (e) {} }
  return true;
}
export async function playFrom(id, ids) { state.base = ids.slice(); buildQueue(id); await load(id); }
export function next(auto) {
  if (!state.queue.length) return;
  if (auto && S.p.repeat === 'one') { audio.currentTime = 0; audio.play().catch(() => {}); return; }
  let n = state.qi + 1;
  if (n >= state.queue.length) {
    if (S.p.repeat === 'all' || !auto) n = 0;
    else { audio.pause(); audio.currentTime = 0; emit('player:update'); return; }
  }
  state.qi = n; load(state.queue[state.qi]);
}
export function prev() {
  if (!state.queue.length) return;
  if (audio.currentTime > 3 || state.queue.length < 2) { audio.currentTime = 0; return; }
  state.qi = (state.qi - 1 + state.queue.length) % state.queue.length; load(state.queue[state.qi]);
}
export function toggle(fallbackList) {
  if (!state.curId) {
    const l = fallbackList && fallbackList.length ? fallbackList : S.tracks;
    if (!l.length) { toast('Importa canciones primero'); return; }
    playFrom(l[0].id, l.map(t => t.id)); return;
  }
  if (audio.paused) audio.play().catch(() => {}); else audio.pause();
}
export function removeTrack(id) {
  idbDel(id); idbDel('cov_' + id);
  S.tracks = S.tracks.filter(t => t.id !== id);
  S.playlists.forEach(p => { p.ids = p.ids.filter(x => x !== id); });
  state.base = state.base.filter(x => x !== id); state.queue = state.queue.filter(x => x !== id);
  if (state.curId === id) {
    audio.pause(); audio.removeAttribute('src'); audio.load();
    state.curId = null; if (state.curUrl) { URL.revokeObjectURL(state.curUrl); state.curUrl = null; } S.p.last = null; state.qi = -1;
  } else state.qi = state.queue.indexOf(state.curId);
  save(); emit('player:update');
}
export function setSleep(min) {
  clearTimeout(sleepT); clearInterval(sleepI); state.sleepAt = 0;
  if (min) {
    state.sleepAt = Date.now() + min * 60000;
    sleepT = setTimeout(() => { audio.pause(); state.sleepAt = 0; emit('player:sleep'); toast('Temporizador: música en pausa'); }, min * 60000);
    sleepI = setInterval(() => emit('player:sleep'), 20000);
    toast('Se pausará en ' + min + ' min');
  } else toast('Temporizador desactivado');
  emit('player:sleep');
}

// ---------- efectos: ecualizador y visualizador (se activan solo si se usan) ----------
let ac = null, fxN = [], an = null;
export function graph() {
  if (ac) return true;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    ac = new AC();
    const s = ac.createMediaElementSource(audio);
    const mk = (type, f, q) => { const b = ac.createBiquadFilter(); b.type = type; b.frequency.value = f; if (q) b.Q.value = q; return b; };
    fxN = [mk('lowshelf', 200), mk('peaking', 1200, 1), mk('highshelf', 4000)];
    an = ac.createAnalyser(); an.fftSize = 128; an.smoothingTimeConstant = .8;
    s.connect(fxN[0]); fxN[0].connect(fxN[1]); fxN[1].connect(fxN[2]); fxN[2].connect(an); an.connect(ac.destination);
    applyEq();
    ac.onstatechange = () => { if (ac.state === 'suspended' && !audio.paused) ac.resume().catch(() => {}); };
    return true;
  } catch (e) { ac = null; return false; }
}
export function applyEq() { if (ac) fxN.forEach((f, i) => { f.gain.value = S.p.eq[i] || 0; }); }
export const needsGraph = () => S.p.viz || S.p.eq.some(v => v !== 0);
export function resumeCtx() { if (ac && ac.state === 'suspended') ac.resume().catch(() => {}); }
export function getAnalyser() { return an; }

// ---------- portada, MediaSession (pantalla de bloqueo / notificación) ----------
export const cov = t => `background:linear-gradient(135deg,hsl(${t.hue} 85% 62%),hsl(${(t.hue + 55) % 360} 80% 45%))`;
const artCache = new Map();
export async function artURL(t) {
  if (artCache.has(t.id)) return artCache.get(t.id);
  if (t.hasCover) {
    const blob = await idbGet('cov_' + t.id);
    if (blob) { const u = URL.createObjectURL(blob); artCache.set(t.id, u); return u; }
  }
  return null;
}
function fallbackArt(t) {
  try {
    const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
    const gr = g.createLinearGradient(0, 0, 256, 256);
    gr.addColorStop(0, `hsl(${t.hue} 85% 62%)`); gr.addColorStop(1, `hsl(${(t.hue + 55) % 360} 80% 45%)`);
    g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
    g.fillStyle = 'rgba(255,255,255,.92)'; g.font = '800 120px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText((t.title[0] || '♪').toUpperCase(), 128, 136);
    return c.toDataURL('image/png');
  } catch (e) { return ''; }
}
async function setMedia(t) {
  if (!('mediaSession' in navigator) || typeof MediaMetadata === 'undefined') return;
  const url = await artURL(t);
  try {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: t.title, artist: t.artist || 'Mi música', album: 'Mi Panel',
      artwork: [{ src: url || fallbackArt(t), sizes: '256x256', type: url ? (t.coverMime || 'image/jpeg') : 'image/png' }]
    });
  } catch (e) {}
}
export function initMediaSession() {
  if (!('mediaSession' in navigator)) return;
  const h = (a, f) => { try { navigator.mediaSession.setActionHandler(a, f); } catch (e) {} };
  h('play', () => audio.play()); h('pause', () => audio.pause());
  h('previoustrack', prev); h('nexttrack', () => next(false));
  h('seekto', d => { audio.currentTime = d.seekTime; });
  h('seekbackward', () => { audio.currentTime = Math.max(0, audio.currentTime - 10); });
  h('seekforward', () => { audio.currentTime = Math.min(audio.duration || 1e9, audio.currentTime + 10); });
}

audio.addEventListener('play', () => {
  if (needsGraph()) graph();
  resumeCtx();
  if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
  emit('player:update');
});
audio.addEventListener('pause', () => { if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused'; emit('player:update'); });
audio.addEventListener('timeupdate', () => emit('player:time'));
audio.addEventListener('loadedmetadata', () => {
  const t = curTrack(); if (t && isFinite(audio.duration) && !t.dur) { t.dur = audio.duration; save(); }
  audio.playbackRate = S.p.rate;
  emit('player:time');
  const now = Date.now();
  if (now - lastPos > 1000 && 'mediaSession' in navigator && navigator.mediaSession.setPositionState) {
    lastPos = now;
    try { navigator.mediaSession.setPositionState({ duration: audio.duration || 0, playbackRate: audio.playbackRate, position: Math.min(audio.currentTime, audio.duration || 0) }); } catch (e) {}
  }
});
audio.addEventListener('ended', () => next(true));
audio.addEventListener('error', () => { if (state.curId) toast('No se pudo reproducir este archivo'); });

// al abrir la app, retoma la última canción (sin reproducir sola)
export async function restoreLast() {
  const last = S.p.last;
  if (last && S.tracks.some(t => t.id === last)) {
    state.base = S.tracks.map(t => t.id); buildQueue(last); await load(last, false);
  }
}
