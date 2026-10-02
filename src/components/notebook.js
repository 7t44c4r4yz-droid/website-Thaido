// สมุดบันทึกนักสืบ: ตารางคำที่ตอบผิดตลอดเกม

import { h } from './dom.js';
import { mascotSVG } from './mascot.js';
import { state, MISSION_NAMES } from '../state.js';

function missionLabel(key) {
  return key === 'review' ? MISSION_NAMES.review : `ภารกิจที่ ${key}: ${MISSION_NAMES[key]}`;
}

export function renderNotebook() {
  const entries = state.notebook;
  const today = new Date().toLocaleDateString('th-TH', { dateStyle: 'long' });

  const header = h(
    'div',
    { class: 'nb-header' },
    h('h2', {}, '📒 สมุดบันทึกนักสืบ'),
    h(
      'div',
      { class: 'nb-meta' },
      h('span', {}, 'ชื่อนักสืบ: ', h('b', {}, state.name || '-')),
      h('span', {}, 'วันที่: ', today),
      h('span', {}, 'คะแนน: ', h('b', {}, `${state.score}/${state.maxScore}`))
    )
  );

  let body;
  if (!entries.length) {
    body = h(
      'div',
      { class: 'nb-empty' },
      h('div', { class: 'mascot mascot-md', html: mascotSVG('cheer') }),
      h('p', { class: 'big' }, '🌟 ไม่มีคำผิดเลยสักคำ! 🌟'),
      h('p', {}, `สุดยอดนักสืบ ${state.name}! สายตาคมกริบ สะกดคำได้ถูกต้องทุกคำ`)
    );
  } else {
    body = h(
      'div',
      { class: 'nb-table-wrap' },
      h('p', { class: 'nb-intro' }, `คำที่ควรทบทวน ${entries.length} รายการ — อ่านคำที่ถูกต้องออกเสียงดังๆ แล้วลองเขียนตามนะ ✍️`),
      h(
        'table',
        { class: 'nb-table' },
        h(
          'thead',
          {},
          h('tr', {}, h('th', {}, '#'), h('th', {}, 'ภารกิจ'), h('th', {}, 'สิ่งที่นักเรียนเลือก/เขียน'), h('th', {}, 'คำที่ถูกต้อง'), h('th', {}, 'หลักการสะกด'))
        ),
        h(
          'tbody',
          {},
          entries.map((e, i) =>
            h(
              'tr',
              {},
              h('td', { 'data-label': '#' }, i + 1),
              h('td', { 'data-label': 'ภารกิจ' }, missionLabel(e.mission)),
              h(
                'td',
                { 'data-label': 'นักเรียนเลือก/เขียน', class: 'nb-chosen' },
                h('span', { class: 'strike' }, e.chosen),
                e.note ? h('small', {}, e.note) : null
              ),
              h('td', { 'data-label': 'คำที่ถูกต้อง', class: 'nb-correct' }, e.correct),
              h('td', { 'data-label': 'หลักการสะกด', class: 'nb-expl' }, h('span', { class: 'chip' }, e.category), ' ', e.explanation)
            )
          )
        )
      )
    );
  }

  return h('div', { class: 'notebook' }, h('div', { class: 'nb-rings', 'aria-hidden': 'true' }), h('div', { class: 'nb-page' }, header, body));
}
