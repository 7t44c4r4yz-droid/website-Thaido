// เอฟเฟกต์ภาพ: ดาวกระจาย และพลุฉลอง

const STAR_SVG =
  '<svg viewBox="0 0 24 24"><path d="M12 1.8l3 6.4 7 .9-5.1 4.8 1.3 6.9L12 17.4 5.8 20.8l1.3-6.9L2 9.1l7-.9z"/></svg>';
const COLORS = ['#ffcc33', '#ff8a3d', '#ff5d8f', '#4fc3f7', '#7ed957'];

function layer() {
  let el = document.getElementById('fx-layer');
  if (!el) {
    el = document.createElement('div');
    el.id = 'fx-layer';
    document.body.append(el);
  }
  return el;
}

/** ดาวกระจายออกจากจุด (x, y) บนหน้าจอ หรือจากกลาง element */
export function burstStars(target, count = 14) {
  let x, y;
  if (target instanceof Element) {
    const r = target.getBoundingClientRect();
    x = r.left + r.width / 2;
    y = r.top + r.height / 2;
  } else ({ x, y } = target);
  const fx = layer();
  for (let i = 0; i < count; i++) {
    const s = document.createElement('div');
    s.className = 'fx-star';
    s.innerHTML = STAR_SVG;
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
    const dist = 70 + Math.random() * 90;
    s.style.left = `${x}px`;
    s.style.top = `${y}px`;
    s.style.setProperty('--dx', `${Math.cos(angle) * dist}px`);
    s.style.setProperty('--dy', `${Math.sin(angle) * dist}px`);
    s.style.setProperty('--size', `${16 + Math.random() * 20}px`);
    s.style.color = COLORS[i % COLORS.length];
    fx.append(s);
    setTimeout(() => s.remove(), 1000);
  }
}

/** พลุกระดาษฉลองตอนจบเกม */
export function confetti(count = 60) {
  const fx = layer();
  for (let i = 0; i < count; i++) {
    const c = document.createElement('div');
    c.className = 'fx-confetti';
    c.style.left = `${Math.random() * 100}vw`;
    c.style.background = COLORS[i % COLORS.length];
    c.style.animationDelay = `${Math.random() * 0.8}s`;
    c.style.setProperty('--drift', `${(Math.random() - 0.5) * 200}px`);
    fx.append(c);
    setTimeout(() => c.remove(), 3500);
  }
}

export function clearEffects() {
  document.getElementById('fx-layer')?.replaceChildren();
}
