// ภารกิจที่ 1: "คนไหนคนถูก" — เลือกคำที่เขียนถูกจาก 2 คำ

import { h, shuffle, pickOne, progressDots } from '../components/dom.js';
import { feedbackPanel } from '../components/feedback.js';
import { mascotWithBubble } from '../components/mascot.js';
import { burstStars } from '../components/effects.js';
import { sfx } from '../components/sound.js';
import { addScore, logMistake } from '../state.js';
import { updateHud } from '../components/hud.js';

export const MISSION1_POINTS = 10;

/**
 * @param {HTMLElement} root
 * @param {{ pool: object[], count?: number, onDone: Function, missionKey?: number|string, scoring?: boolean, title?: string }} opts
 */
export function runMission1(root, { pool, count = 8, onDone, missionKey = 1, scoring = true, title = 'ภารกิจที่ 1: คนไหนคนถูก' }) {
  const questions = shuffle(pool)
    .slice(0, Math.min(count, pool.length))
    .map((word) => {
      const wrong = pickOne(word.wrong);
      return { word, options: shuffle([word.correct, wrong]), wrong };
    });
  const results = [];
  let index = 0;
  let correctCount = 0;
  let disposed = false;

  function render() {
    if (disposed) return;
    const q = questions[index];
    let answered = false;

    const cards = q.options.map((text) =>
      h(
        'button',
        {
          class: 'word-card',
          onClick: (e) => choose(text, e.currentTarget),
        },
        text
      )
    );
    const feedbackSlot = h('div', { class: 'feedback-slot' });

    function choose(text, el) {
      if (answered) return;
      answered = true;
      const ok = text === q.word.correct;
      cards.forEach((c) => {
        c.disabled = true;
        if (c.textContent === q.word.correct) c.classList.add('is-correct');
      });
      if (ok) {
        correctCount++;
        sfx.correct();
        burstStars(el);
      } else {
        el.classList.add('is-wrong', 'shake');
        sfx.wrong();
        logMistake({ mission: missionKey, chosen: text, word: q.word });
      }
      results[index] = ok;
      if (scoring) {
        addScore(ok ? MISSION1_POINTS : 0, MISSION1_POINTS);
        updateHud();
      }
      feedbackSlot.append(
        feedbackPanel({
          ok,
          detail: ok ? null : h('span', {}, 'หนูเลือก ', h('s', {}, text), ' ซึ่งยังเขียนไม่ถูก'),
          correct: q.word.correct,
          explanation: q.word.explanation,
          nextLabel: index + 1 < questions.length ? 'ข้อต่อไป ➜' : 'จบภารกิจ 🎉',
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
        { class: 'mission mission1' },
        h('h2', { class: 'mission-title' }, title),
        progressDots(questions.length, index, results),
        mascotWithBubble('think', 'คำไหนเขียนถูก? แตะเลือกเลย!'),
        h('div', { class: 'card-row two' }, cards),
        feedbackSlot
      )
    );
  }

  render();
  return () => {
    disposed = true;
  };
}
