import { S, save, ic, esc, uid, hash, fmtT, fmtDur, sheet, closeSheet, confirmSheet, toast, idbPut, idbDel } from '../core.js';
import { audio, state, curTrack, playFrom, cov, artURL, removeTrack } from '../audio.js';
import { extractCoverArt } from '../coverart.js';

const rerender = () => document.dispatchEvent(new CustomEvent('app:rerender'));
const ui = { q: '', f: 'todas', pend: null };

function vis() {
  let l = S.tracks.slice();
  if (ui.f === 'fav') l = l.filter(t => t.fav);
  else if (ui.f !== 'todas') { const pl = S.playlists.find(p => p.id === ui.f); if (pl) l = pl.ids.map(id => S.tracks.find(t => t.id === id)).filter(Boolean); }
  const q = ui.q.trim().toLowerCase();
  if (q) l = l.filter(t => (t.title + ' ' + (t.artist || '')).toLowerCase().includes(q));
  return l;
}

function trackCov(t) {
  // se resuelve de forma asíncrona porque la portada real vive en IndexedDB
  const id = 'art-' + t.id;
  setTimeout(async () => {
    if (!t.hasCover) return;
    const url = await artURL(t);
    const els = document.querySelectorAll(`[data-cov="${t.id}"]`);
    if (url) els.forEach(el => { el.style.backgroundImage = `url(${url})`; el.style.backgroundSize = 'cover'; el.style.backgroundPosition = 'center'; el.innerHTML = ''; });
  }, 0);
  return `<span class="cov" data-cov="${t.id}" style="${cov(t)}">${state.curId === t.id && !audio.paused ? '<span class="eqb"><i></i><i></i><i></i></span>' : ic('music', 18)}</span>`;
}

function trackRows() {
  const l = vis();
  if (!l.length) return `<div class="empty"><b>${S.tracks.length ? 'No hay canciones aquí' : 'Aún no hay canciones'}</b>${S.tracks.length ? 'Prueba con otro filtro o búsqueda.' : 'Toca "Importar" y elige los audios de tu teléfono.'}</div>`;
  return l.map(t => {
    const cur = state.curId === t.id;
    return `<li class="trk ${cur ? 'cur' : ''}"><button class="trk-main" data-a="play" data-id="${t.id}">${trackCov(t)}<span class="tt"><b>${esc(t.title)}</b><small>${esc(t.artist || 'Artista desconocido')}${t.dur ? '  ' + fmtT(t.dur) : ''}</small></span></button>${t.fav ? `<span class="fv">${ic('heart', 16, true)}</span>` : ''}<button class="ib" data-a="trackMenu" data-id="${t.id}" aria-label="Más opciones">${ic('more', 20)}</button></li>`;
  }).join('');
}

export default {
  id: 'musica', label: 'Música', tabIcon: 'music', title: () => 'Música',
  render() {
    const tot = S.tracks.length, dur = S.tracks.reduce((a, t) => a + (t.dur || 0), 0);
    const chips = [['todas', 'Todas'], ['fav', 'Favoritas'], ...S.playlists.map(p => [p.id, p.name])];
    const pl = S.playlists.find(p => p.id === ui.f);
    return `<div class="card imp"><div><b>${tot ? tot + (tot === 1 ? ' canción' : ' canciones') : 'Tu música, sin anuncios'}</b><small>${tot ? fmtDur(dur) + ' de música' : 'Importa MP3, M4A, FLAC u OGG desde tu teléfono.'}</small></div><button class="btn ac" data-a="import">${ic('upload', 18)} Importar</button></div>
    <div class="chips">${chips.map(([k, v]) => `<button class="chip ${ui.f === k ? 'on' : ''}" data-a="mFilter" data-f="${k}">${esc(v)}</button>`).join('')}<button class="chip" data-a="plNew">${ic('plus', 14)} Lista</button></div>
    <div class="srch" style="margin-top:0">${ic('search', 18)}<input id="musicQ" placeholder="Buscar canción o artista" value="${esc(ui.q)}"></div>
    ${tot ? `<div class="mrow"><button class="btn sm" data-a="playAll">${ic('play', 15, true)} Reproducir</button><button class="btn sm" data-a="playShuf">${ic('shuffle', 15)} Aleatorio</button>${pl ? `<button class="btn sm bad" data-a="plDel" data-id="${pl.id}">Eliminar lista</button>` : ''}</div>` : ''}
    <ul id="trackList">${trackRows()}</ul>`;
  },
  onPlayerUpdate() { const l = document.getElementById('trackList'); if (l) l.innerHTML = trackRows(); },
  actions: {
    import: () => document.getElementById('fileIn').click(),
    mFilter: b => { ui.f = b.dataset.f; rerender(); },
    play: b => { const l = vis(); playFrom(b.dataset.id, l.map(t => t.id)); },
    playAll: () => { const l = vis(); if (l.length) playFrom(l[0].id, l.map(t => t.id)); },
    playShuf: () => { const l = vis(); if (!l.length) return; S.p.shuffle = true; save(); playFrom(l[Math.floor(Math.random() * l.length)].id, l.map(t => t.id)); },
    trackMenu: b => {
      const t = S.tracks.find(x => x.id === b.dataset.id), inPl = ui.f !== 'todas' && ui.f !== 'fav';
      sheet(`<div class="sh-h"><b>${esc(t.title)}</b><button class="ib" data-a="closeSheet" aria-label="Cerrar">${ic('x')}</button></div>
        <button class="opt" data-a="tFav" data-id="${t.id}">${ic('heart', 22, t.fav)} ${t.fav ? 'Quitar de favoritas' : 'Añadir a favoritas'}</button>
        <button class="opt" data-a="tPl" data-id="${t.id}">${ic('list', 22)} Añadir a una lista</button>
        ${inPl ? `<button class="opt" data-a="tPlRem" data-id="${t.id}">${ic('x', 22)} Quitar de esta lista</button>` : ''}
        <button class="opt bad" data-a="tDel" data-id="${t.id}">${ic('trash', 22)} Eliminar de la biblioteca</button>`);
    },
    tFav: b => { const t = S.tracks.find(x => x.id === b.dataset.id); t.fav = !t.fav; save(); closeSheet(); rerender(); },
    tPl: b => {
      sheet(`<div class="sh-h"><b>Añadir a una lista</b><button class="ib" data-a="closeSheet" aria-label="Cerrar">${ic('x')}</button></div>
        ${S.playlists.map(p => `<button class="opt" data-a="tPlPick" data-pl="${p.id}" data-id="${b.dataset.id}">${ic('music', 22)} ${esc(p.name)}</button>`).join('')}
        <button class="opt" data-a="plNew" data-id="${b.dataset.id}">${ic('plus', 22)} Nueva lista</button>`);
    },
    tPlPick: b => { const p = S.playlists.find(x => x.id === b.dataset.pl); if (!p.ids.includes(b.dataset.id)) p.ids.push(b.dataset.id); save(); closeSheet(); toast('Añadida a "' + p.name + '"'); },
    tPlRem: b => { const p = S.playlists.find(x => x.id === ui.f); if (p) { p.ids = p.ids.filter(x => x !== b.dataset.id); save(); } closeSheet(); rerender(); },
    tDel: b => { const t = S.tracks.find(x => x.id === b.dataset.id); confirmSheet('¿Eliminar "' + t.title + '" de tu biblioteca?', 'Eliminar', () => removeTrack(t.id)); },
    plNew: b => { ui.pend = (b && b.dataset && b.dataset.id) || null; sheet(`<div class="sh-h"><b>Nueva lista</b><button class="ib" data-a="closeSheet" aria-label="Cerrar">${ic('x')}</button></div><input id="plName" placeholder="Nombre de la lista" maxlength="30"><button class="btn ac wide" data-a="plCreate">Crear lista</button>`); },
    plCreate: () => {
      const n = document.getElementById('plName').value.trim(); if (!n) { toast('Ponle un nombre a la lista'); return; }
      const p = { id: uid(), name: n, ids: ui.pend ? [ui.pend] : [] }; S.playlists.push(p); ui.pend = null; ui.f = p.id; save(); closeSheet(); rerender();
    },
    plDel: b => { const p = S.playlists.find(x => x.id === b.dataset.id); confirmSheet('¿Eliminar la lista "' + p.name + '"? Las canciones se quedan en tu biblioteca.', 'Eliminar', () => { S.playlists = S.playlists.filter(x => x !== p); ui.f = 'todas'; save(); rerender(); }); }
  },
  inputs: { musicQ: el => { ui.q = el.value; const l = document.getElementById('trackList'); if (l) l.innerHTML = trackRows(); } }
};

// ---------- importar archivos ----------
function getDur(file) {
  return new Promise(res => {
    const a = new Audio(), u = URL.createObjectURL(file); let done = false;
    const fin = v => { if (done) return; done = true; URL.revokeObjectURL(u); res(v); };
    a.preload = 'metadata'; a.onloadedmetadata = () => fin(isFinite(a.duration) ? a.duration : 0); a.onerror = () => fin(0);
    setTimeout(() => fin(0), 4000); a.src = u;
  });
}
export async function importFiles(files) {
  const list = [...files].filter(f => /^audio\//.test(f.type) || /\.(mp3|m4a|aac|wav|ogg|oga|opus|flac|weba)$/i.test(f.name));
  if (!list.length) { toast('No se encontraron archivos de audio'); return; }
  toast('Importando ' + list.length + (list.length === 1 ? ' archivo…' : ' archivos…'));
  let n = 0, dup = 0;
  for (const f of list) {
    if (S.tracks.some(t => t.name === f.name && t.size === f.size)) { dup++; continue; }
    const [dur, coverBlob] = await Promise.all([getDur(f), extractCoverArt(f)]);
    const id = uid();
    await idbPut(id, f);
    let hasCover = false;
    if (coverBlob) { hasCover = await idbPut('cov_' + id, coverBlob); }
    const raw = f.name.replace(/\.[^.]+$/, '').replace(/_+/g, ' ').trim();
    let title = raw, artist = ''; const m = raw.match(/^(.+?)\s+-\s+(.+)$/);
    if (m) { artist = m[1].trim(); title = m[2].trim(); }
    S.tracks.push({ id, name: f.name, title, artist, dur, size: f.size, fav: false, added: Date.now(), hue: hash(raw) % 360, hasCover, coverMime: coverBlob ? coverBlob.type : '' });
    n++;
  }
  save();
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) {}
  toast(n ? (n + (n === 1 ? ' canción añadida' : ' canciones añadidas')) : (dup ? 'Esas canciones ya estaban' : 'No se añadió nada'));
  rerender();
}
