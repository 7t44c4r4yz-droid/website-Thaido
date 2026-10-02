// เสียงประกอบแบบสังเคราะห์ด้วย Web Audio (ไม่ต้องโหลดไฟล์เสียง) เบาๆ ไม่รบกวน

let ctx = null;
let muted = false;
const listeners = new Set();

function audio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq, start, dur, { type = 'sine', vol = 0.08 } = {}) {
  const ac = audio();
  if (!ac || muted) return;
  const t0 = ac.currentTime + start;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

export const sfx = {
  correct() {
    tone(660, 0, 0.15);
    tone(880, 0.1, 0.15);
    tone(1175, 0.2, 0.25);
  },
  wrong() {
    tone(330, 0, 0.18, { type: 'triangle', vol: 0.07 });
    tone(247, 0.15, 0.28, { type: 'triangle', vol: 0.07 });
  },
  click() {
    tone(520, 0, 0.06, { vol: 0.04 });
  },
  pick() {
    tone(740, 0, 0.07, { type: 'triangle', vol: 0.05 });
  },
  drop() {
    tone(440, 0, 0.08, { type: 'triangle', vol: 0.05 });
  },
  win() {
    [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, i * 0.12, 0.2));
  },
};

export const isMuted = () => muted;

export function setMuted(value) {
  muted = value;
  listeners.forEach((fn) => fn(muted));
}

export function onMuteChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
