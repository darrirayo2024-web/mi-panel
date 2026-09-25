import { S, save, ic, esc, uid, today, toast } from '../core.js';

const PO = { alta: 0, media: 1, baja: 2 }, PRI = { alta: 'var(--bad)', media: 'var(--warn)', baja: 'var(--ok)' };
const ui = { tf: 'todas' };

function taskItem(t) {
  const od = t.due && !t.done && t.due < today();
  return `<li class="task ${t.done ? 'done' : ''}">
    <button class="chk" data-a="taskToggle" data-id="${t.id}" aria-label="Marcar como hecha">${t.done ? ic('tick', 16) : ''}</button>
    <div class="tx"><span>${esc(t.text)}</span><small><i class="dot" style="background:${PRI[t.pri]}"></i>${t.pri}${t.due ? `<span class="${od ? 'od' : ''}">${t.due}</span>` : ''}</small></div>
    <button class="ib" data-a="taskDel" data-id="${t.id}" aria-label="Eliminar">${ic('trash', 18)}</button></li>`;
}

export default {
  id: 'tareas', label: 'Tareas', tabIcon: 'checkc', title: () => 'Tareas',
  render() {
    let l = S.tasks.slice();
    if (ui.tf === 'pendientes') l = l.filter(x => !x.done);
    if (ui.tf === 'hechas') l = l.filter(x => x.done);
    l.sort((a, b) => (a.done - b.done) || PO[a.pri] - PO[b.pri] || (a.due || '9').localeCompare(b.due || '9'));
    const done = S.tasks.filter(x => x.done).length, tot = S.tasks.length;
    return `<div class="card add">
      <input id="tInput" placeholder="¿Qué tienes que hacer?" maxlength="120">
      <div class="row"><select id="tPri" aria-label="Prioridad"><option value="alta">Prioridad alta</option><option value="media" selected>Prioridad media</option><option value="baja">Prioridad baja</option></select><input id="tDue" type="date" aria-label="Fecha límite"><button class="btn ac" data-a="taskAdd">Añadir</button></div>
    </div>
    ${tot ? `<div class="prog"><small>${done} de ${tot} hechas</small><div><i style="width:${done / tot * 100}%"></i></div></div>` : ''}
    <div class="chips">${[['todas', 'Todas'], ['pendientes', 'Pendientes'], ['hechas', 'Hechas']].map(([k, v]) => `<button class="chip ${ui.tf === k ? 'on' : ''}" data-a="taskFilter" data-f="${k}">${v}</button>`).join('')}</div>
    ${l.length ? `<ul>${l.map(taskItem).join('')}</ul>` : `<div class="empty"><b>${tot ? 'Nada por aquí' : 'Tu lista está vacía'}</b>${tot ? 'Prueba con otro filtro.' : 'Añade tu primera tarea arriba.'}</div>`}
    ${done ? `<button class="btn wide" data-a="taskClear">Quitar las ${done} hechas</button>` : ''}`;
  },
  actions: {
    taskAdd: () => {
      const text = document.getElementById('tInput').value.trim();
      if (!text) { toast('Escribe una tarea'); return; }
      S.tasks.push({ id: uid(), text, pri: document.getElementById('tPri').value, due: document.getElementById('tDue').value, done: false, created: Date.now() });
      save(); document.dispatchEvent(new CustomEvent('app:rerender'));
    },
    taskToggle: b => { const t = S.tasks.find(x => x.id === b.dataset.id); if (t) { t.done = !t.done; save(); document.dispatchEvent(new CustomEvent('app:rerender')); } },
    taskDel: b => { S.tasks = S.tasks.filter(x => x.id !== b.dataset.id); save(); document.dispatchEvent(new CustomEvent('app:rerender')); },
    taskFilter: b => { ui.tf = b.dataset.f; document.dispatchEvent(new CustomEvent('app:rerender')); },
    taskClear: () => { S.tasks = S.tasks.filter(x => !x.done); save(); document.dispatchEvent(new CustomEvent('app:rerender')); }
  }
};
