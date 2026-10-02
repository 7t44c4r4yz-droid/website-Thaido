// ภารกิจที่ 3: "นักสืบคำผิด" — 4 คำ มีคำเขียนผิด 1 คำ แตะจับคนร้าย!

import { h, shuffle, pickOne, progressDots } from '../components/dom.js';
import { feedbackPanel } from '../components/feedback.js';
import { mascotWithBubble } from '../components/mascot.js';
import { burstStars } from '../components/effects.js';
import { sfx } from '../components/sound.js';
import { addScore, logMistake } from '../state.js';
import { updateHud } from '../components/hud.js';

export const MISSION3_POINTS = 10;

export function runMission3(root, { pool, count = 8, onDone }) {
  const targets = shuffle(pool).slice(0, Math.min(count, pool.length));
  const questions = targets.map((word) => {
    const wrong = pickOne(word.wrong);
    // คำถูกอีก 3 คำ ต้องไม่ซ้ำกับคำเป้าหมายหรือคำผิด
    const others = shuffle(pool.filter((w) => w !== word && w.correct !== wrong))
      .slice(0, 3)
      .map((w) => w.correct);
    return { word, wrong, options: shuffle([wrong, ...others]) };
  });
  const results = [];
  let index = 0;
  let correctCount = 0;
  let disposed = false;

  function render() {
    if (disposed) return;
    const q = questions[index];
    let answered = false;
    const feedbackSlot = h('div', { class: 'feedback-slot' });

    const cards = q.options.map((text) =>
      h(
        'button',
        { class: 'word-card suspect', 'data-word': text, onClick: (e) => choose(text, e.currentTarget) },
        h('span', { class: 'suspect-tag' }, '👤 ผู้ต้องสงสัย'),
        h('span', { class: 'suspect-word' }, text)
      )
    );

    function choose(text, el) {
      if (answered) return;
      answered = true;
      const ok = text === q.wrong;
      const culprit = cards.find((c) => c.dataset.word === q.wrong);
      cards.forEach((c) => (c.disabled = true));
      culprit.classList.add('caught');
      culprit.append(h('span', { class: 'caught-stamp' }, ok ? 'จับได้แล้ว!' : 'คนร้ายตัวจริง'));

      if (ok) {
        correctCount++;
        sfx.correct();
        burstStars(culprit, 18);
      } else {
        el.classList.add('is-innocent', 'shake');
        sfx.wrong();
        logMistake({
          mission: 3,
          chosen: text,
          note: `คำนี้เขียนถูกแล้ว คำที่ผิดจริงคือ "${q.wrong}"`,
          word: q.word,
        });
      }
      results[index] = ok;
      addScore(ok ? MISSION3_POINTS : 0, MISSION3_POINTS);
      updateHud();

      feedbackSlot.append(
        feedbackPanel({
          ok,
          title: ok ? '🚨 จับคนร้ายได้แล้ว! เก่งมาก' : undefined,
          detail: ok
            ? h('span', {}, 'คำว่า ', h('s', {}, q.wrong), ' เขียนผิด')
            : h('span', {}, 'คำว่า "', text, '" เขียนถูกแล้วนะ คนร้ายตัวจริงคือ ', h('s', {}, q.wrong)),
          correct: q.word.correct,
          explanation: q.word.explanation,
          nextLabel: index + 1 < questions.length ? 'คดีต่อไป ➜' : 'ปิดคดี 🎉',
          onNext: () => {
            sfx.click();
            index++;
            if (index < questions.length) render();
            else onDone({ correct: correctCount, total: questions.length });
          },
        })
      );
    }

    root.replaceChildren(
      h(
        'section',
        { class: 'mission mission3' },
        h('h2', { class: 'mission-title' }, 'ภารกิจที่ 3: นักสืบคำผิด'),
        progressDots(questions.length, index, results),
        mascotWithBubble('think', 'มีคำเขียนผิดแฝงตัวอยู่ 1 คำ! แตะเพื่อจับตัวคนร้าย'),
        h('div', { class: 'card-row four' }, cards),
        feedbackSlot
      )
    );
  }

  render();
  return () => {
    disposed = true;
  };
}
