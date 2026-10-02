// ภารกิจที่ 2: "จับตัวอักษร" — หยิบตัวอักษรไปวางในช่องให้เรียงเป็นคำที่เขียนถูก
// ควบคุมได้ 2 แบบ: ท่าจับ (pinch) ผ่านกล้อง หรือ เมาส์/นิ้วสัมผัสลากวาง

import { h, shuffle, progressDots } from '../components/dom.js';
import { feedbackPanel } from '../components/feedback.js';
import { mascotWithBubble } from '../components/mascot.js';
import { burstStars } from '../components/effects.js';
import { sfx } from '../components/sound.js';
import { addScore, logMistake } from '../state.js';
import { updateHud } from '../components/hud.js';
import { useHandPinch } from '../hooks/useHandPinch.js';
import { splitThaiChars, charCount, displayParts } from '../utils/thai.js';
import { MISSION2_MAX_CHARS } from '../data/words.js';

export const MISSION2_POINTS = 20;

const PRIVACY_TEXT = 'ภาพจากกล้องประมวลผลในเครื่องนี้เท่านั้น ไม่มีการบันทึกหรืออัปโหลดภาพไปที่ใด';

export const cameraSupported = () => Boolean(window.isSecureContext && navigator.mediaDevices?.getUserMedia);

function cameraErrorText(err) {
  switch (err?.name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return 'ไม่ได้รับอนุญาตให้ใช้กล้อง (กดอนุญาตที่แถบที่อยู่ของเบราว์เซอร์ แล้วลองใหม่)';
    case 'NotFoundError':
    case 'OverconstrainedError':
      return 'ไม่พบกล้องในเครื่องนี้';
    case 'NotReadableError':
      return 'กล้องกำลังถูกใช้งานโดยโปรแกรมอื่น ลองปิดโปรแกรมนั้นก่อน';
    default:
      return err?.message?.includes('https')
        ? err.message
        : 'โหลดตัวตรวจจับมือไม่สำเร็จ (ตรวจสอบการเชื่อมต่ออินเทอร์เน็ต)';
  }
}

/** แสดงคำใบ้ โดยแทน ____ ด้วยช่องว่างสีเด่น */
function renderHint(text) {
  const parts = text.split('____');
  const out = [];
  parts.forEach((p, i) => {
    out.push(p);
    if (i < parts.length - 1) out.push(h('span', { class: 'blank' }, '？'));
  });
  return out;
}

export function runMission2(root, { pool, count = 5, onDone, createHandSource = useHandPinch }) {
  const eligible = pool.filter((w) => {
    const n = charCount(w.correct);
    return n >= 3 && n <= MISSION2_MAX_CHARS;
  });
  const questions = shuffle(eligible).slice(0, Math.min(count, eligible.length));

  let disposed = false;
  let hand = null;
  let mode = 'pointer'; // 'camera' | 'pointer'
  let index = 0;
  let correctCount = 0;
  const results = [];

  // องค์ประกอบของด่าน
  let stage, videoEl, tileLayer, cursorLayer, overlay, slotsRow, tray, hintEl, progressEl, previewEl, checkBtn, statusEl, modeBtn;
  let tiles = [];
  let slots = [];
  let locked = false;
  const cursors = new Map();
  let resizeObs = null;

  showIntro();

  // ------------------------------------------------------------------ intro
  function showIntro() {
    const camOk = cameraSupported();
    root.replaceChildren(
      h(
        'section',
        { class: 'mission mission2-intro' },
        h('h2', { class: 'mission-title' }, 'ภารกิจที่ 2: จับตัวอักษร'),
        mascotWithBubble('happy', 'อ่านคำใบ้ แล้วหยิบตัวอักษรมาเรียงเป็นคำที่เขียนถูกนะ!'),
        h(
          'div',
          { class: 'howto-grid' },
          h(
            'div',
            { class: 'howto-card' },
            h('h3', {}, '📷 เล่นด้วยกล้อง (ใช้มือ)'),
            h(
              'ol',
              {},
              h('li', {}, 'นั่งห่างจอประมาณ 1 ช่วงแขน ให้กล้องเห็นมือชัดๆ'),
              h('li', {}, 'ทำนิ้วโป้งกับนิ้วชี้ประกบกัน 🤏 ใกล้ตัวอักษร เพื่อ "หยิบ"'),
              h('li', {}, 'ขยับมือไปที่ช่อง แล้วแยกนิ้วออก เพื่อ "ปล่อย"'),
              h('li', {}, 'จับ 🤏 ที่ปุ่มเพื่อกดปุ่มได้ด้วย'),
              h('li', {}, 'วงกลมสีฟ้า = ตำแหน่งนิ้ว เปลี่ยนเป็นสีส้มเมื่อกำลังหยิบ')
            )
          ),
          h(
            'div',
            { class: 'howto-card' },
            h('h3', {}, '🖱️ เล่นด้วยเมาส์ / นิ้วสัมผัส'),
            h(
              'ol',
              {},
              h('li', {}, 'ลากตัวอักษรไปวางในช่อง'),
              h('li', {}, 'หรือแตะตัวอักษร เพื่อใส่ลงช่องว่างถัดไป'),
              h('li', {}, 'แตะตัวอักษรที่อยู่ในช่อง เพื่อนำออก')
            )
          )
        ),
        h('p', { class: 'note' }, 'สระบน สระล่าง และวรรณยุกต์ แยกเป็นตัวของมันเอง 1 ตัวต่อ 1 ช่อง (แสดงบนตัว อ สีจาง)'),
        h('p', { class: 'privacy' }, '🔒 ', PRIVACY_TEXT),
        !camOk ? h('p', { class: 'warn' }, '⚠️ เบราว์เซอร์นี้เปิดกล้องไม่ได้ (ต้องเปิดผ่าน https:// หรือ localhost) ใช้โหมดเมาส์/นิ้วสัมผัสได้เลย') : null,
        h(
          'div',
          { class: 'btn-row' },
          h('button', { class: 'btn btn-primary btn-big', disabled: !camOk, onClick: () => begin('camera') }, '📷 เล่นด้วยกล้อง'),
          h('button', { class: 'btn btn-secondary btn-big', onClick: () => begin('pointer') }, '🖱️ เล่นด้วยเมาส์/สัมผัส')
        )
      )
    );
  }

  function begin(wanted) {
    sfx.click();
    buildStage();
    loadQuestion(0);
    if (wanted === 'camera') startCamera();
    else setMode('pointer');
  }

  // ------------------------------------------------------------------ stage
  function buildStage() {
    videoEl = h('video', { class: 'm2-video', playsinline: true, muted: true, autoplay: true });
    tileLayer = h('div', { class: 'm2-tiles' });
    cursorLayer = h('div', { class: 'm2-cursors' });
    overlay = h('div', { class: 'm2-overlay', hidden: true });
    progressEl = h('div', { class: 'm2-progress' });
    hintEl = h('div', { class: 'hint-card' });
    slotsRow = h('div', { class: 'slots' });
    previewEl = h('div', { class: 'preview' });
    tray = h('div', { class: 'tray' });
    statusEl = h('div', { class: 'm2-status' });
    modeBtn = h('button', { class: 'btn btn-small', onClick: toggleMode }, '');
    checkBtn = h('button', { class: 'btn btn-primary btn-big', disabled: true, onClick: checkAnswer }, '🔎 ตรวจคำตอบ');

    stage = h(
      'section',
      { class: 'm2-stage' },
      videoEl,
      h('div', { class: 'm2-veil' }),
      h(
        'div',
        { class: 'm2-content' },
        h('div', { class: 'm2-top' }, h('h2', { class: 'mission-title small' }, 'ภารกิจที่ 2: จับตัวอักษร'), modeBtn),
        progressEl,
        hintEl,
        slotsRow,
        previewEl,
        tray,
        h(
          'div',
          { class: 'btn-row' },
          h('button', { class: 'btn btn-secondary', onClick: clearSlots }, '↩️ ล้างช่อง'),
          checkBtn
        ),
        h('div', { class: 'm2-footer' }, statusEl, h('span', { class: 'privacy small' }, '🔒 ', PRIVACY_TEXT))
      ),
      tileLayer,
      cursorLayer,
      overlay
    );
    root.replaceChildren(stage);

    resizeObs = new ResizeObserver(() => layout());
    resizeObs.observe(stage);
  }

  function setMode(m) {
    mode = m;
    stage.classList.toggle('camera-on', m === 'camera');
    modeBtn.textContent = m === 'camera' ? '🖱️ เปลี่ยนเป็นเมาส์/สัมผัส' : '📷 เปิดกล้อง';
    modeBtn.disabled = m === 'pointer' && !cameraSupported();
    if (m === 'pointer') {
      clearCursors();
      statusEl.textContent = '🖱️ โหมดเมาส์/นิ้วสัมผัส: ลากหรือแตะตัวอักษร';
    }
  }

  function toggleMode() {
    sfx.click();
    if (mode === 'camera') {
      stopCamera();
      setMode('pointer');
    } else startCamera();
  }

  function showOverlay(...content) {
    overlay.replaceChildren(h('div', { class: 'm2-overlay-card' }, ...content));
    overlay.hidden = false;
  }
  function hideOverlay() {
    overlay.hidden = true;
    overlay.replaceChildren();
  }

  async function startCamera() {
    if (hand) return;
    showOverlay(
      h('div', { class: 'spinner' }),
      h('p', { class: 'big' }, 'กำลังเปิดกล้องและโหลดตัวตรวจจับมือ...'),
      h('p', {}, 'ครั้งแรกอาจใช้เวลาสักครู่ ถ้าเบราว์เซอร์ถาม ให้กด "อนุญาต"'),
      h('p', { class: 'privacy' }, '🔒 ', PRIVACY_TEXT),
      h('button', { class: 'btn btn-secondary', onClick: () => { stopCamera(); setMode('pointer'); hideOverlay(); } }, 'ใช้เมาส์/สัมผัสแทน')
    );
    const thisHand = createHandSource({
      video: videoEl,
      onFrame: handleHands,
      onStatus: (s) => {
        if (s === 'camera-ready') stage.classList.add('camera-on');
      },
    });
    hand = thisHand;
    try {
      await thisHand.start();
      if (disposed || hand !== thisHand) return;
      setMode('camera');
      statusEl.textContent = '✋ ยกมือให้กล้องเห็น';
      if (!locked) hideOverlay();
    } catch (err) {
      console.warn(err);
      if (disposed || hand !== thisHand) return;
      hand = null;
      stage.classList.remove('camera-on');
      setMode('pointer');
      showOverlay(
        h('p', { class: 'big' }, '😅 เปิดกล้องไม่ได้'),
        h('p', {}, cameraErrorText(err)),
        h('p', {}, 'ไม่เป็นไร! เล่นต่อด้วยเมาส์หรือนิ้วสัมผัสได้เลย'),
        h('button', { class: 'btn btn-primary', onClick: hideOverlay }, 'ตกลง เล่นต่อ')
      );
    }
  }

  function stopCamera() {
    const hd = hand;
    hand = null;
    hd?.stop();
    stage?.classList.remove('camera-on');
    clearCursors();
  }

  // --------------------------------------------------------------- question
  function loadQuestion(i) {
    index = i;
    locked = false;
    const word = questions[i];
    const chars = splitThaiChars(word.correct);
    let order = shuffle(chars.map((_, k) => k));
    for (let tries = 0; tries < 10 && order.every((v, k) => v === k); tries++) order = shuffle(order);

    progressEl.replaceChildren(progressDots(questions.length, i, results));
    hintEl.replaceChildren(
      h('div', { class: 'hint-label' }, '🕵️ คำใบ้'),
      h('div', { class: 'hint-text' }, renderHint(word.hint)),
      h('div', { class: 'hint-sub' }, `เรียงตัวอักษร ${chars.length} ตัว ให้เป็นคำที่เขียนถูก`)
    );

    slots = chars.map(() => ({ el: h('div', { class: 'slot' }), tile: null, cx: 0, cy: 0 }));
    slotsRow.replaceChildren(...slots.map((s) => s.el));

    tiles.forEach((t) => t.el.remove());
    tiles = order.map((charIdx, k) => {
      const ch = chars[charIdx];
      const { ghost, mark } = displayParts(ch);
      const el = h(
        'div',
        { class: `tile ${ghost ? 'combining' : ''}`, role: 'button', 'aria-label': `ตัวอักษร ${ch}` },
        ghost ? h('span', { class: 'ghost' }, ghost) : null,
        h('span', { class: 'mark' }, mark)
      );
      const t = { id: k, ch, el, home: { x: 0, y: 0 }, pos: { x: 0, y: 0 }, slot: null, holder: null, prevSlot: null };
      bindPointer(t);
      tileLayer.append(el);
      return t;
    });
    cursors.forEach((c) => (c.tile = null));
    tray.style.setProperty('--rows', String(Math.ceil(chars.length / 4)));
    updateUI();
    layout(true);
    requestAnimationFrame(() => layout());
  }

  function tileSize() {
    return tiles[0]?.el.offsetWidth || 64;
  }

  function measureSlots() {
    const sr = stage.getBoundingClientRect();
    for (const s of slots) {
      const r = s.el.getBoundingClientRect();
      s.cx = r.left - sr.left + r.width / 2;
      s.cy = r.top - sr.top + r.height / 2;
    }
    return sr;
  }

  function layout(instant = false) {
    if (!stage || !tiles.length) return;
    const sr = measureSlots();
    const tr = tray.getBoundingClientRect();
    const size = tileSize();
    const gap = size * 0.3;
    const n = tiles.length;
    const cols = Math.max(1, Math.min(n, Math.floor((tr.width + gap) / (size + gap))));
    const rows = Math.ceil(n / cols);
    tiles.forEach((t, k) => {
      const row = Math.floor(k / cols);
      const col = k % cols;
      const inRow = row === rows - 1 ? n - row * cols : cols;
      const rowW = inRow * size + (inRow - 1) * gap;
      t.home = {
        x: tr.left - sr.left + (tr.width - rowW) / 2 + size / 2 + col * (size + gap),
        y: tr.top - sr.top + size / 2 + gap / 2 + row * (size + gap),
      };
    });
    for (const t of tiles) {
      if (t.holder) continue;
      if (instant) t.el.classList.add('no-anim');
      setPos(t, t.slot != null ? { x: slots[t.slot].cx, y: slots[t.slot].cy } : t.home);
      if (instant) setTimeout(() => t.el.classList.remove('no-anim'), 50);
    }
  }

  function setPos(t, p) {
    t.pos = { x: p.x, y: p.y };
    const half = tileSize() / 2;
    t.el.style.transform = `translate(${p.x - half}px, ${p.y - half}px)`;
  }

  const slotPos = (k) => ({ x: slots[k].cx, y: slots[k].cy });

  // ------------------------------------------------------------ grab / drop
  function grab(t, who) {
    if (locked || t.holder) return false;
    t.holder = who;
    t.prevSlot = t.slot;
    if (t.slot != null) {
      slots[t.slot].tile = null;
      t.slot = null;
    }
    t.el.classList.add('held');
    sfx.pick();
    updateUI();
    return true;
  }

  function putInSlot(t, k) {
    t.slot = k;
    slots[k].tile = t;
    setPos(t, slotPos(k));
  }

  function sendHome(t) {
    t.slot = null;
    setPos(t, t.home);
  }

  function release(t) {
    if (!t.holder) return;
    t.holder = null;
    t.el.classList.remove('held');
    measureSlots();
    const size = tileSize();
    let best = -1;
    let bestD = Infinity;
    slots.forEach((s, k) => {
      const d = Math.hypot(s.cx - t.pos.x, s.cy - t.pos.y);
      if (d < bestD) {
        bestD = d;
        best = k;
      }
    });
    if (best >= 0 && bestD < size * 0.95 && !locked) {
      const occupant = slots[best].tile;
      if (occupant && occupant !== t && !occupant.holder) {
        // สลับที่: ตัวเดิมย้ายไปช่องที่เราหยิบมา หรือกลับที่เดิม
        if (t.prevSlot != null && !slots[t.prevSlot].tile) putInSlot(occupant, t.prevSlot);
        else sendHome(occupant);
      }
      putInSlot(t, best);
      sfx.drop();
    } else sendHome(t);
    t.prevSlot = null;
    updateUI();
  }

  /** แตะ (ไม่ได้ลาก): ถ้าอยู่ในช่องให้นำออก ถ้าอยู่ในถาดให้ใส่ช่องว่างถัดไป */
  function tap(t) {
    t.holder = null;
    t.el.classList.remove('held');
    if (t.prevSlot != null) sendHome(t);
    else {
      const k = slots.findIndex((s) => !s.tile);
      if (k >= 0) {
        putInSlot(t, k);
        sfx.drop();
      } else sendHome(t);
    }
    t.prevSlot = null;
    updateUI();
  }

  function toLocal(clientX, clientY) {
    const sr = stage.getBoundingClientRect();
    return { x: clientX - sr.left, y: clientY - sr.top };
  }

  function bindPointer(t) {
    t.el.addEventListener('pointerdown', (e) => {
      if (locked || t.holder) return;
      e.preventDefault();
      try {
        t.el.setPointerCapture(e.pointerId);
      } catch {}
      const start = { x: e.clientX, y: e.clientY };
      let moved = false;
      if (!grab(t, 'pointer')) return;
      const move = (ev) => {
        if (!moved && Math.hypot(ev.clientX - start.x, ev.clientY - start.y) > 8) moved = true;
        if (moved) setPos(t, toLocal(ev.clientX, ev.clientY));
      };
      const up = () => {
        t.el.removeEventListener('pointermove', move);
        t.el.removeEventListener('pointerup', up);
        t.el.removeEventListener('pointercancel', up);
        if (t.holder !== 'pointer') return;
        if (moved) release(t);
        else tap(t);
      };
      t.el.addEventListener('pointermove', move);
      t.el.addEventListener('pointerup', up);
      t.el.addEventListener('pointercancel', up);
    });
  }

  function clearSlots() {
    if (locked) return;
    sfx.click();
    tiles.forEach((t) => !t.holder && sendHome(t));
    slots.forEach((s) => (s.tile = null));
    updateUI();
  }

  function updateUI() {
    const full = slots.every((s) => s.tile);
    checkBtn.disabled = !full || locked;
    slots.forEach((s) => s.el.classList.toggle('filled', Boolean(s.tile)));
    const text = slots.map((s) => s.tile?.ch ?? '').join('');
    previewEl.replaceChildren(h('span', { class: 'label' }, 'คำที่เรียงได้: '), h('b', {}, text || '—'));
  }

  // ------------------------------------------------------------- hand input
  function clearCursors() {
    cursors.forEach((c) => {
      if (c.tile) release(c.tile);
      c.el.remove();
    });
    cursors.clear();
    tiles.forEach((t) => t.el.classList.remove('hover'));
    stage?.querySelectorAll('.hand-hover').forEach((b) => b.classList.remove('hand-hover'));
  }

  function nearestTile(p, radius) {
    let best = null;
    let bestD = radius;
    for (const t of tiles) {
      if (t.holder) continue;
      const d = Math.hypot(t.pos.x - p.x, t.pos.y - p.y);
      if (d < bestD) {
        bestD = d;
        best = t;
      }
    }
    return best;
  }

  function buttonAt(p) {
    const sr = stage.getBoundingClientRect();
    const el = document.elementFromPoint(sr.left + p.x, sr.top + p.y);
    const btn = el?.closest?.('button');
    return btn && stage.contains(btn) && !btn.disabled ? btn : null;
  }

  function handleHands(hands) {
    if (disposed || mode !== 'camera' || !stage) return;
    const sr = stage.getBoundingClientRect();
    const vw = videoEl.videoWidth || 16;
    const vh = videoEl.videoHeight || 9;
    // วิดีโอแสดงแบบ object-fit: cover จึงต้องคำนวณส่วนที่ถูกครอป
    const scale = Math.max(sr.width / vw, sr.height / vh);
    const dispW = vw * scale;
    const dispH = vh * scale;
    const offX = (sr.width - dispW) / 2;
    const offY = (sr.height - dispH) / 2;
    const radius = tileSize() * 0.95;

    const keys = new Set();
    const hoverTiles = new Set();
    const hoverBtns = new Set();
    let visibleCount = 0;

    for (const hd of hands) {
      keys.add(hd.key);
      const p = { x: offX + hd.x * dispW, y: offY + hd.y * dispH };
      let c = cursors.get(hd.key);
      if (!c) {
        c = { el: h('div', { class: 'hand-cursor' }), tile: null };
        cursorLayer.append(c.el);
        cursors.set(hd.key, c);
      }
      if (hd.visible) visibleCount++;
      c.el.style.transform = `translate(${p.x}px, ${p.y}px)`;
      c.el.classList.toggle('pinching', hd.pinching);
      c.el.classList.toggle('lost', !hd.visible);

      if (hd.justPinched) {
        const t = !locked ? nearestTile(p, radius) : null;
        if (t && grab(t, hd.key)) c.tile = t;
        else {
          const btn = buttonAt(p);
          if (btn) {
            btn.classList.add('hand-press');
            setTimeout(() => btn.classList.remove('hand-press'), 200);
            btn.click();
            if (disposed || !hand) return;
          }
        }
      }
      if (c.tile && hd.pinching) setPos(c.tile, p);
      if (hd.justReleased && c.tile) {
        const t = c.tile;
        c.tile = null;
        release(t);
      }
      if (!hd.pinching) {
        const t = !locked ? nearestTile(p, radius) : null;
        if (t) hoverTiles.add(t);
        else {
          const btn = buttonAt(p);
          if (btn) hoverBtns.add(btn);
        }
      }
    }
    for (const [key, c] of cursors) {
      if (keys.has(key)) continue;
      if (c.tile) release(c.tile);
      c.el.remove();
      cursors.delete(key);
    }
    tiles.forEach((t) => t.el.classList.toggle('hover', hoverTiles.has(t)));
    stage.querySelectorAll('button').forEach((b) => b.classList.toggle('hand-hover', hoverBtns.has(b)));
    statusEl.textContent = visibleCount ? `✋ พบมือ ${visibleCount} ข้าง — ทำ 🤏 เพื่อหยิบ` : '🙋 มองไม่เห็นมือ ยกมือให้กล้องเห็น';
  }

  // ---------------------------------------------------------------- answer
  function checkAnswer() {
    if (locked || !slots.every((s) => s.tile)) return;
    locked = true;
    // ปล่อยตัวอักษรที่ค้างอยู่ในมือ
    cursors.forEach((c) => (c.tile = null));
    const word = questions[index];
    const answer = slots.map((s) => s.tile.ch).join('').normalize('NFC');
    const ok = answer === word.correct.normalize('NFC');
    results[index] = ok;
    slots.forEach((s, k) => {
      const right = s.tile.ch === splitThaiChars(word.correct)[k];
      s.el.classList.add(right ? 'slot-ok' : 'slot-bad');
    });
    tiles.forEach((t) => t.el.classList.add('locked'));
    updateUI();

    if (ok) {
      correctCount++;
      sfx.correct();
      burstStars(slotsRow, 18);
    } else {
      sfx.wrong();
      logMistake({ mission: 2, chosen: answer, note: 'คำที่เรียงมา', word });
    }
    addScore(ok ? MISSION2_POINTS : 0, MISSION2_POINTS);
    updateHud();
    progressEl.replaceChildren(progressDots(questions.length, index, results));

    const last = index + 1 >= questions.length;
    setTimeout(() => {
      if (disposed) return;
      overlay.replaceChildren(
        feedbackPanel({
          ok,
          detail: ok ? null : h('span', {}, 'หนูเรียงได้ว่า ', h('s', {}, answer)),
          correct: word.correct,
          explanation: word.explanation,
          nextLabel: last ? 'จบภารกิจ 🎉' : 'ข้อต่อไป ➜',
          onNext: next,
        })
      );
      overlay.hidden = false;
    }, ok ? 700 : 400);
  }

  function next() {
    sfx.click();
    hideOverlay();
    if (index + 1 < questions.length) loadQuestion(index + 1);
    else {
      stopCamera(); // ปิดกล้องทันทีเมื่อจบด่าน
      onDone({ correct: correctCount, total: questions.length });
    }
  }

  // --------------------------------------------------------------- cleanup
  return () => {
    disposed = true;
    stopCamera();
    resizeObs?.disconnect();
  };
}
