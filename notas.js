import { S, save, ic, esc, uid, fmtRel, sheet, closeSheet, confirmSheet, $ , $$} from '../core.js';

const NC = ['#E8365F', '#F0A23A', '#3DBE8B', '#4C9BE8', '#8C6AE8', '#8E8AA3'];
const rerender = () => document.dispatchEvent(new CustomEvent('app:rerender'));
const ui = { q: '', id: null };

function noteCards() {
  let l = S.notes.slice().sort((a, b) => (b.pin ? 1 : 0) - (a.pin ? 1 : 0) || b.upd - a.upd);
  const q = ui.q.trim().toLowerCase();
  if (q) l = l.filter(n => (n.title + ' ' + n.body).toLowerCase().includes(q));
  if (!l.length) return `<div class="empty"><b>${S.notes.length ? 'Sin resultados' : 'No hay notas todavía'}</b>${S.notes.length ? 'Prueba con otra palabra.' : 'Toca "Nueva nota" para escribir la primera.'}</div>`;
  return l.map(n => `<button class="note" data-a="noteOpen" data-id="${n.id}" style="--nc:${NC[n.c || 0]}">${n.pin ? `<span class="pn">${ic('pin', 14)}</span>` : ''}<b>${esc(n.title || 'Sin título')}</b><span>${esc(n.body.slice(0, 160))}</span><small>${fmtRel(n.upd)}</small></button>`).join('');
}

function openNote(id) {
  ui.id = id; const n = S.notes.find(x => x.id === id);
  sheet(`<div class="sh-h"><b>Nota</b><div><button class="ib ${n.pin ? 'on' : ''}" data-a="notePin" aria-label="Fijar">${ic('pin', 20)}</button><button class="ib" data-a="noteDel" aria-label="Eliminar">${ic('trash', 20)}</button><button class="btn ac sm" data-a="closeSheet">Listo</button></div></div>
    <input id="nTitle" class="ntitle" placeholder="Título" value="${esc(n.title)}" maxlength="80">
    <textarea id="nBody" class="big" placeholder="Escribe aquí…">${esc(n.body)}</textarea>
    <div class="colors">${NC.map((c, i) => `<button class="${(n.c || 0) === i ? 'on' : ''}" style="--c:${c}" data-a="noteColor" data-c="${i}" aria-label="Color ${i + 1}"></button>`).join('')}</div>`,
    () => {
      const x = S.notes.find(q => q.id === ui.id);
      if (x && !x.title.trim() && !x.body.trim()) S.notes = S.notes.filter(q => q !== x);
      ui.id = null; save(); rerender();
    }, 'tall');
}

export default {
  id: 'notas', label: 'Notas', tabIcon: 'note', title: () => 'Notas',
  render() {
    return `<button class="btn ac wide" style="margin-top:0" data-a="noteNew">${ic('plus', 18)} Nueva nota</button>
    <div class="srch">${ic('search', 18)}<input id="noteQ" placeholder="Buscar en tus notas" value="${esc(ui.q)}"></div>
    <div class="notes" id="noteList">${noteCards()}</div>`;
  },
  actions: {
    noteNew: () => { const n = { id: uid(), title: '', body: '', c: 0, pin: false, upd: Date.now() }; S.notes.push(n); openNote(n.id); },
    noteOpen: b => openNote(b.dataset.id),
    notePin: b => { const n = S.notes.find(x => x.id === ui.id); n.pin = !n.pin; b.classList.toggle('on', n.pin); save(); },
    noteColor: b => { const n = S.notes.find(x => x.id === ui.id); n.c = +b.dataset.c; document.querySelectorAll('.colors button').forEach((x, i) => x.classList.toggle('on', i === n.c)); save(); },
    noteDel: () => { const n = S.notes.find(x => x.id === ui.id); confirmSheet('¿Eliminar esta nota?', 'Eliminar', () => { S.notes = S.notes.filter(x => x !== n); ui.id = null; save(); closeSheet(); rerender(); }); }
  },
  inputs: {
    noteQ: el => { ui.q = el.value; const l = document.getElementById('noteList'); if (l) l.innerHTML = noteCards(); },
    nTitle: el => { const n = S.notes.find(x => x.id === ui.id); if (n) { n.title = el.value; n.upd = Date.now(); save(); } },
    nBody: el => { const n = S.notes.find(x => x.id === ui.id); if (n) { n.body = el.value; n.upd = Date.now(); save(); } }
  }
};
