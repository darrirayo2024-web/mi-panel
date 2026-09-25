import { S, save, ic, esc, today, ymKey, money, toast } from '../core.js';
import { curTrack, audio, cov } from '../audio.js';

const PO = { alta: 0, media: 1, baja: 2 };
const greet = () => { const h = new Date().getHours(); return h < 6 ? 'Buenas noches' : h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches'; };

function sumTx(l) { let i = 0, g = 0; l.forEach(t => { t.type === 'ingreso' ? i += t.amt : g += t.amt; }); return { i, g, b: i - g }; }
function monthTx(ym) { return S.tx.filter(t => t.date.startsWith(ym)); }
const PRI = { alta: 'var(--bad)', media: 'var(--warn)', baja: 'var(--ok)' };

function taskItem(t) {
  const od = t.due && !t.done && t.due < today();
  return `<li class="task ${t.done ? 'done' : ''}">
    <button class="chk" data-a="taskToggle" data-id="${t.id}" aria-label="Marcar como hecha">${t.done ? ic('tick', 16) : ''}</button>
    <div class="tx"><span>${esc(t.text)}</span><small><i class="dot" style="background:${PRI[t.pri]}"></i>${t.pri}${t.due ? `<span class="${od ? 'od' : ''}">${t.due}</span>` : ''}</small></div>
  </li>`;
}

export default {
  id: 'inicio', label: 'Inicio', tabIcon: 'home',
  title: () => greet() + ', ' + S.name,
  render() {
    const t = today(), pend = S.tasks.filter(x => !x.done);
    const due = pend.filter(x => x.due && x.due <= t).length;
    const hd = S.habits.filter(h => h.days.includes(t)).length, ht = S.habits.length;
    const C = 2 * Math.PI * 22, pct = ht ? hd / ht : 0;
    const ms = sumTx(monthTx(ymKey(new Date())));
    const cur = curTrack();
    const nxt = pend.slice().sort((a, b) => PO[a.pri] - PO[b.pri] || (a.due || '9').localeCompare(b.due || '9')).slice(0, 4);
    return `<p class="mu" style="margin:2px 0 0">${new Date().toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
    <div class="quick" style="margin-top:14px"><input id="qInput" placeholder="Anota una tarea rápida" maxlength="120"><button class="btn ac" data-a="quickAdd" aria-label="Añadir tarea">${ic('plus')}</button></div>
    <div class="grid2">
      <button class="card stat" data-a="tab" data-t="tareas"><span class="k">Tareas pendientes</span><b>${pend.length}</b><small>${due ? due + (due === 1 ? ' vence hoy o antes' : ' vencen hoy o antes') : 'Nada urgente'}</small></button>
      <button class="card stat" data-a="tab" data-t="habitos"><span class="k">Hábitos de hoy</span>
        <span style="display:flex;align-items:center;width:100%"><b>${hd}/${ht}</b><svg class="ring" width="52" height="52" viewBox="0 0 52 52"><circle cx="26" cy="26" r="22" fill="none" stroke="var(--s2)" stroke-width="6"/><circle cx="26" cy="26" r="22" fill="none" stroke="var(--ok)" stroke-width="6" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - pct)}" transform="rotate(-90 26 26)"/></svg></span>
        <small>${ht ? (hd === ht ? 'Todo listo por hoy' : 'Faltan ' + (ht - hd)) : 'Crea tu primer hábito'}</small></button>
      <button class="card stat m" data-a="tab" data-t="dinero"><span class="k">Balance del mes</span><b class="${ms.b < 0 ? 'neg' : ''}">${money(ms.b)}</b><small>Gastos ${money(ms.g)}</small></button>
      <button class="card stat m" data-a="${cur ? 'playerOpen' : 'tab'}" data-t="musica"><span class="k">Música</span><b style="font-size:17px;line-height:1.25;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical">${cur ? esc(cur.title) : 'Sin canciones'}</b><small>${cur ? (audio.paused ? 'En pausa' : 'Reproduciendo') : (S.tracks.length ? S.tracks.length + ' en tu biblioteca' : 'Importa las tuyas')}</small></button>
    </div>
    <h2>Próximas tareas</h2>
    ${nxt.length ? `<ul>${nxt.map(taskItem).join('')}</ul>` : `<div class="empty"><b>Sin tareas pendientes</b>Anota algo arriba para empezar.</div>`}
    ${ht ? `<h2>Hábitos de hoy</h2><div class="hchips">${S.habits.map(h => `<button class="hchip ${h.days.includes(t) ? 'on' : ''}" data-a="habitDay" data-id="${h.id}" data-d="${t}">${esc(h.icon || '✅')} ${esc(h.name)}</button>`).join('')}</div>` : ''}`;
  },
  actions: {
    quickAdd: () => {
      const i = document.getElementById('qInput'); const v = i.value.trim();
      if (!v) { toast('Escribe una tarea'); return; }
      S.tasks.push({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7), text: v, pri: 'media', due: '', done: false, created: Date.now() });
      save(); toast('Tarea añadida'); document.dispatchEvent(new CustomEvent('app:rerender'));
    }
  }
};
