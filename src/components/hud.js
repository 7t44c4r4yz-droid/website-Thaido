// แถบสถานะด้านบน: ชื่อนักสืบ คะแนน ดาวความคืบหน้า 3 ภารกิจ ปุ่มเสียง ปุ่มเริ่มใหม่

import { h } from './dom.js';
import { state } from '../state.js';
import { isMuted, setMuted, onMuteChange } from './sound.js';

let root = null;
let onHome = null;

export function initHud(el, { onRequestHome }) {
  root = el;
  onHome = onRequestHome;
  onMuteChange(updateHud);
  updateHud();
}

function missionStar(n) {
  const res = state.results[n];
  const cur = state.currentMission === n;
  const cls = res ? 'done' : cur ? 'current' : '';
  return h(
    'span',
    { class: `hud-star ${cls}`, title: `ภารกิจที่ ${n}${res ? ' สำเร็จแล้ว' : ''}` },
    res ? '★' : '☆',
    h('small', {}, n)
  );
}

export function updateHud() {
  if (!root) return;
  const muteBtn = h(
    'button',
    {
      class: 'hud-btn',
      'aria-label': isMuted() ? 'เปิดเสียง' : 'ปิดเสียง',
      title: isMuted() ? 'เปิดเสียง' : 'ปิดเสียง',
      onClick: () => setMuted(!isMuted()),
    },
    isMuted() ? '🔇' : '🔊'
  );
  const inGame = Boolean(state.name);
  root.replaceChildren(
    h(
      'div',
      { class: 'hud-inner' },
      h('div', { class: 'hud-left' }, h('span', { class: 'hud-logo' }, '🔍'), inGame ? h('span', { class: 'hud-name' }, `นักสืบ ${state.name}`) : h('span', { class: 'hud-name' }, 'ภารกิจนักสืบไข่เป็ดปริศนา')),
      inGame
        ? h(
            'div',
            { class: 'hud-mid' },
            h('span', { class: 'hud-score' }, '🏅 ', h('b', {}, state.score), ' คะแนน'),
            h('span', { class: 'hud-stars' }, [1, 2, 3].map(missionStar))
          )
        : null,
      h(
        'div',
        { class: 'hud-right' },
        muteBtn,
        inGame ? h('button', { class: 'hud-btn', title: 'กลับหน้าแรก', 'aria-label': 'กลับหน้าแรก', onClick: () => onHome?.() }, '🏠') : null
      )
    )
  );
}
