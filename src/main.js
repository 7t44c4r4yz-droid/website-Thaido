// จุดเริ่มต้นของเกม: จัดลำดับหน้าจอ หน้าแรก → ภารกิจ 1 → 2 → 3 → สรุปผล/สมุดบันทึก

import { WORDS } from './data/words.js';
import { state, resetState, MISSION_NAMES } from './state.js';
import { h } from './components/dom.js';
import { initHud, updateHud } from './components/hud.js';
import { mascotSVG, mascotWithBubble } from './components/mascot.js';
import { sfx } from './components/sound.js';
import { confetti, clearEffects } from './components/effects.js';
import { renderNotebook } from './components/notebook.js';
import { runMission1 } from './missions/mission1.js';
import { runMission2 } from './missions/mission2.js';
import { runMission3 } from './missions/mission3.js';

const app = document.getElementById('app');
let cleanup = null;

/** เปลี่ยนหน้าจอ: เรียก cleanup ของหน้าก่อนหน้า (เช่น ปิดกล้อง) เสมอ */
function mount(render) {
  try {
    cleanup?.();
  } finally {
    cleanup = null;
  }
  clearEffects();
  app.replaceChildren();
  window.scrollTo({ top: 0 });
  const result = render(app);
  if (typeof result === 'function') cleanup = result;
  updateHud();
}

// ------------------------------------------------------------------ หน้าแรก
function showHome() {
  state.currentMission = null;
  mount((root) => {
    const input = h('input', {
      id: 'player-name',
      class: 'name-input',
      type: 'text',
      maxlength: '30',
      autocomplete: 'off',
      placeholder: 'พิมพ์ชื่อของหนูที่นี่',
      'aria-label': 'ชื่อนักเรียน',
    });
    const err = h('p', { class: 'error', role: 'alert' });
    const start = () => {
      const name = input.value.trim();
      if (!name) {
        err.textContent = 'กรุณากรอกชื่อก่อนเริ่มภารกิจนะ 😊';
        input.focus();
        return;
      }
      sfx.click();
      state.name = name;
      showMissionIntro(1);
    };
    input.addEventListener('keydown', (e) => e.key === 'Enter' && start());

    root.append(
      h(
        'section',
        { class: 'home' },
        h('div', { class: 'home-badge' }, 'ภาษาไทย ป.5'),
        h('h1', { class: 'game-title' }, h('span', {}, 'ภารกิจนักสืบ'), h('span', { class: 'accent' }, 'ไข่เป็ดปริศนา')),
        h('p', { class: 'game-subtitle' }, 'คำผิด คำถูกต้อง'),
        h('div', { class: 'mascot mascot-hero bob', html: mascotSVG('happy') }),
        h('p', { class: 'home-intro' }, 'สวัสดีจ้ะ! ฉันคือ "ไข่เป็ดนักสืบ" มาช่วยกันไขคดีคำเขียนผิด 3 ภารกิจกันเถอะ'),
        h(
          'div',
          { class: 'name-box' },
          h('label', { for: 'player-name' }, '🕵️ ชื่อนักสืบ'),
          input,
          err,
          h('button', { class: 'btn btn-primary btn-big', onClick: start }, '🔍 เริ่มภารกิจ')
        ),
        h(
          'ul',
          { class: 'mission-list' },
          [1, 2, 3].map((n) => h('li', {}, h('b', {}, `ภารกิจที่ ${n}`), ' ', MISSION_NAMES[n]))
        )
      )
    );
    requestAnimationFrame(() => input.focus());
  });
}

// ---------------------------------------------------------- ก่อนเริ่มภารกิจ
const INTRO = {
  1: { text: 'จะมีคำ 2 คำ แตะเลือกคำที่เขียนถูก! มีทั้งหมด 8 ข้อ', emoji: '⚖️' },
  2: { text: 'อ่านคำใบ้ แล้วหยิบตัวอักษรมาเรียงเป็นคำที่ถูกต้อง ใช้มือผ่านกล้องหรือเมาส์ก็ได้ 5 ข้อ', emoji: '🤏' },
  3: { text: 'มีคำ 4 คำ แต่มีคนร้าย (คำเขียนผิด) แฝงอยู่ 1 คำ แตะจับตัวคนร้าย! 8 คดี', emoji: '🚨' },
};

function showMissionIntro(n) {
  state.currentMission = n;
  mount((root) => {
    const prev = n > 1 ? state.results[n - 1] : null;
    root.append(
      h(
        'section',
        { class: 'intro' },
        prev
          ? h('div', { class: 'prev-result' }, `🎉 ภารกิจที่ ${n - 1} สำเร็จ! ตอบถูก ${prev.correct}/${prev.total} ข้อ`)
          : null,
        h('div', { class: 'intro-emoji' }, INTRO[n].emoji),
        h('h2', { class: 'mission-title' }, `ภารกิจที่ ${n}: ${MISSION_NAMES[n]}`),
        mascotWithBubble(prev ? 'cheer' : 'happy', INTRO[n].text, { size: 'lg' }),
        h('button', { class: 'btn btn-primary btn-big', onClick: () => (sfx.click(), startMission(n)) }, 'เริ่มเลย! ➜')
      )
    );
  });
}

function startMission(n) {
  state.currentMission = n;
  const onDone = (res) => {
    state.results[n] = res;
    if (n < 3) showMissionIntro(n + 1);
    else showSummary();
  };
  mount((root) => {
    if (n === 1) return runMission1(root, { pool: WORDS, count: 8, onDone });
    if (n === 2) return runMission2(root, { pool: WORDS, count: 5, onDone });
    return runMission3(root, { pool: WORDS, count: 8, onDone });
  });
}

// ------------------------------------------------------------- สรุปผล
function starCount() {
  if (!state.maxScore) return 0;
  const pct = state.score / state.maxScore;
  return pct >= 0.8 ? 3 : pct >= 0.5 ? 2 : 1;
}

function showSummary(reviewResult = null) {
  state.currentMission = null;
  mount((root) => {
    const stars = starCount();
    const msg = ['', 'เก่งมาก! ฝึกอีกนิดจะเป็นนักสืบมือหนึ่ง', 'ยอดเยี่ยม! เกือบสมบูรณ์แบบแล้ว', 'สุดยอดนักสืบ! สายตาคมกริบ'][stars];
    const mistakes = state.notebook.filter((e) => e.mission !== 'review');
    const reviewWords = [...new Set(mistakes.map((e) => e.correct))]
      .map((c) => WORDS.find((w) => w.correct === c))
      .filter(Boolean);

    root.append(
      h(
        'section',
        { class: 'summary' },
        h(
          'div',
          { class: 'summary-card no-print' },
          h('h2', {}, `🎖️ ปิดคดีครบ 3 ภารกิจแล้ว นักสืบ ${state.name}!`),
          h('div', { class: 'big-stars', 'aria-label': `ได้ ${stars} ดาว` }, [1, 2, 3].map((i) => h('span', { class: i <= stars ? 'on' : '' }, '★'))),
          h('div', { class: 'total-score' }, h('b', {}, state.score), ` / ${state.maxScore} คะแนน`),
          h('p', {}, msg),
          h(
            'ul',
            { class: 'result-list' },
            [1, 2, 3].map((n) => {
              const r = state.results[n];
              return h('li', {}, `ภารกิจที่ ${n} ${MISSION_NAMES[n]}: `, h('b', {}, r ? `ถูก ${r.correct}/${r.total}` : '-'));
            })
          ),
          reviewResult ? h('p', { class: 'review-result' }, `🔁 ทบทวนคำที่ผิด: ถูก ${reviewResult.correct}/${reviewResult.total} ข้อ`) : null
        ),
        renderNotebook(),
        h(
          'div',
          { class: 'btn-row no-print' },
          reviewWords.length
            ? h('button', { class: 'btn btn-secondary btn-big', onClick: () => startReview(reviewWords) }, '🔁 เล่นภารกิจซ้ำเฉพาะคำที่ผิด')
            : null,
          h('button', { class: 'btn btn-secondary btn-big', onClick: () => window.print() }, '🖨️ พิมพ์/บันทึกสมุด'),
          h('button', { class: 'btn btn-primary btn-big', onClick: resetForNext }, '👫 เริ่มใหม่ให้เพื่อนคนต่อไป')
        )
      )
    );
    if (!reviewResult) {
      sfx.win();
      confetti();
    }
  });
}

function startReview(words) {
  sfx.click();
  state.currentMission = 'review';
  mount((root) =>
    runMission1(root, {
      pool: words,
      count: words.length,
      missionKey: 'review',
      scoring: false,
      title: '🔁 ทบทวนคำที่เคยผิด',
      onDone: (res) => showSummary(res),
    })
  );
}

// ----------------------------------------------------------------- รีเซ็ต
function resetForNext() {
  sfx.click();
  resetState(); // ล้างชื่อ คะแนน สมุดบันทึก
  showHome(); // mount() จะเรียก cleanup ซึ่งปิดกล้องด้วย
}

function requestHome() {
  if (confirm('ต้องการเริ่มใหม่หรือไม่? คะแนนและสมุดบันทึกของคนนี้จะถูกล้างทั้งหมด')) resetForNext();
}

// ------------------------------------------------------------------ start
initHud(document.getElementById('hud'), { onRequestHome: requestHome });
showHome();
