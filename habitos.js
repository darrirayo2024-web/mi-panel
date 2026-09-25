import { S, save, ic, esc, uid, ymd, today, confirmSheet, toast } from '../core.js';

const rerender = () => document.dispatchEvent(new CustomEvent('app:rerender'));
function streak(h) {
  let n = 0; const d = new Date();
  if (!h.days.includes(ymd(d))) d.setDate(d.getDate() - 1);
  while (h.days.includes(ymd(d))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}
function habitCard(h) {
  const days = []; for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); days.push(d); }
  const s = streak(h);
  return `<div class="card hb"><div class="hb-h"><span class="hi">${esc(h.icon || '✅')}</span><div><b>${esc(h.name)}</b><small>${s ? (s === 1 ? '1 día seguido' : s + ' días seguidos') : 'Empieza hoy'}</small></div>
    <button class="ib" data-a="habitDel" data-id="${h.id}" aria-label="Eliminar hábito">${ic('trash', 18)}</button></div>
    <div class="wk">${days.map(d => { const k = ymd(d), on = h.days.includes(k); return `<button class="dy ${on ? 'on' : ''} ${k === today() ? 'td' : ''}" data-a="habitDay" data-id="${h.id}" data-d="${k}" aria-label="${k}"><small>${'DLMMJVS'[d.getDay()]}</small><span>${on ? ic('tick', 14) : d.getDate()}</span></button>`; }).join('')}</div></div>`;
}

export default {
  id: 'habitos', label: 'Hábitos', tabIcon: 'target', title: () => 'Hábitos',
  render() {
    return `<div class="card"><div class="hab-add"><input id="hIcon" placeholder="🙂" maxlength="4" aria-label="Emoji"><input id="hName" placeholder="Nuevo hábito (ej. Leer 20 min)" maxlength="40"><button class="btn ac" data-a="habitAdd">Crear</button></div></div>
    <div style="margin-top:14px">${S.habits.length ? S.habits.map(habitCard).join('') : `<div class="empty"><b>Aún no tienes hábitos</b>Crea uno y marca cada día que lo cumplas.</div>`}</div>`;
  },
  actions: {
    habitAdd: () => {
      const n = document.getElementById('hName').value.trim();
      if (!n) { toast('Ponle un nombre al hábito'); return; }
      S.habits.push({ id: uid(), name: n, icon: document.getElementById('hIcon').value.trim() || '✅', days: [] });
      save(); rerender();
    },
    habitDay: b => {
      const h = S.habits.find(x => x.id === b.dataset.id); if (!h) return;
      const d = b.dataset.d, i = h.days.indexOf(d);
      i >= 0 ? h.days.splice(i, 1) : h.days.push(d);
      save(); rerender();
    },
    habitDel: b => {
      const h = S.habits.find(x => x.id === b.dataset.id);
      confirmSheet('¿Eliminar el hábito "' + h.name + '" y su historial?', 'Eliminar', () => { S.habits = S.habits.filter(x => x !== h); save(); rerender(); });
    }
  }
};
