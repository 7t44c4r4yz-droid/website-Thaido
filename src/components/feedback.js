// กล่องผลลัพธ์หลังตอบ ใช้ร่วมกันทุกภารกิจ

import { h } from './dom.js';
import { mascotSVG } from './mascot.js';

const CHEERS = ['เก่งมาก! ✨', 'ยอดเยี่ยม นักสืบ!', 'ถูกต้อง! สายตาคมมาก', 'เยี่ยมไปเลย!'];
const ENCOURAGE = ['ไม่เป็นไรนะ ลองใหม่ข้อต่อไป', 'เกือบแล้ว! จำคำนี้ไว้นะ', 'นักสืบเก่งๆ ก็พลาดได้ สู้ๆ!', 'ไม่เป็นไร เรียนรู้ไปด้วยกัน'];

const rand = (a) => a[Math.floor(Math.random() * a.length)];

/**
 * @param {object} o
 * @param {boolean} o.ok        ตอบถูกหรือไม่
 * @param {string}  [o.title]   หัวข้อ (ถ้าไม่ใส่จะสุ่มคำชม/คำให้กำลังใจ)
 * @param {Node|string} [o.detail]
 * @param {string}  o.correct   คำที่ถูกต้อง
 * @param {string}  o.explanation
 * @param {string}  o.nextLabel
 * @param {Function} o.onNext
 */
export function feedbackPanel({ ok, title, detail, correct, explanation, nextLabel = 'ข้อต่อไป ➜', onNext }) {
  const btn = h('button', { class: 'btn btn-primary btn-next', onClick: onNext }, nextLabel);
  const panel = h(
    'div',
    { class: `feedback ${ok ? 'is-ok' : 'is-bad'}`, role: 'status', 'aria-live': 'polite' },
    h('div', { class: 'feedback-mascot mascot', html: mascotSVG(ok ? 'cheer' : 'encourage') }),
    h(
      'div',
      { class: 'feedback-body' },
      h('div', { class: 'feedback-title' }, title || (ok ? rand(CHEERS) : rand(ENCOURAGE))),
      detail ? h('div', { class: 'feedback-detail' }, detail) : null,
      h('div', { class: 'feedback-word' }, h('span', { class: 'label' }, 'คำที่ถูกต้อง'), h('b', {}, correct)),
      h('div', { class: 'feedback-expl' }, '💡 ', explanation),
      btn
    )
  );
  requestAnimationFrame(() => {
    panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    btn.focus({ preventScroll: true });
  });
  return panel;
}
