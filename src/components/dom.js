// ตัวช่วยสร้าง DOM แบบง่าย ใช้ textContent เสมอ (ป้องกันการแทรก HTML จากชื่อนักเรียน)

export function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(props || {})) {
    if (value == null || value === false) continue;
    if (key === 'class') el.className = value;
    else if (key === 'style' && typeof value === 'object') Object.assign(el.style, value);
    else if (key === 'html') el.innerHTML = value; // ใช้เฉพาะกับ SVG ที่เราเขียนเอง
    else if (key.startsWith('on') && typeof value === 'function') el.addEventListener(key.slice(2).toLowerCase(), value);
    else if (value === true) el.setAttribute(key, '');
    else el.setAttribute(key, value);
  }
  for (const child of children.flat()) {
    if (child == null || child === false) continue;
    el.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return el;
}

export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const pickOne = (arr) => arr[Math.floor(Math.random() * arr.length)];

/** ชุดจุดความคืบหน้า ข้อที่ 1..n */
export function progressDots(total, index, results) {
  return h(
    'div',
    { class: 'progress', 'aria-label': `ข้อที่ ${index + 1} จาก ${total}` },
    h('span', { class: 'progress-text' }, `ข้อ ${index + 1}/${total}`),
    h(
      'div',
      { class: 'dots' },
      Array.from({ length: total }, (_, i) =>
        h('span', {
          class: `dot ${i === index ? 'now' : ''} ${results[i] === true ? 'ok' : ''} ${results[i] === false ? 'bad' : ''}`,
        })
      )
    )
  );
}
