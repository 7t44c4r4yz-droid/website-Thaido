// มาสคอต "ไข่เป็ดนักสืบ" วาดด้วย SVG (ออกแบบใหม่เอง)
// mood: 'happy' | 'cheer' | 'encourage' | 'think'

import { h } from './dom.js';

let uid = 0;

const MOUTHS = {
  happy: '<path d="M96 176 Q110 190 124 176" fill="none" stroke="#3a2a1f" stroke-width="4" stroke-linecap="round"/>',
  cheer: '<path d="M94 172 Q110 200 126 172 Z" fill="#c9464a" stroke="#3a2a1f" stroke-width="3.5" stroke-linejoin="round"/><path d="M101 184 Q110 192 119 184" fill="#ff9aa2"/>',
  encourage: '<path d="M98 180 Q110 186 122 178" fill="none" stroke="#3a2a1f" stroke-width="4" stroke-linecap="round"/>',
  think: '<path d="M100 181 L120 177" fill="none" stroke="#3a2a1f" stroke-width="4" stroke-linecap="round"/>',
};

const BROWS = {
  happy: '<path d="M70 104 Q84 98 98 104 M122 104 Q136 98 150 104" fill="none" stroke="#3a2a1f" stroke-width="4" stroke-linecap="round"/>',
  cheer: '<path d="M70 100 Q84 92 98 100 M122 100 Q136 92 150 100" fill="none" stroke="#3a2a1f" stroke-width="4" stroke-linecap="round"/>',
  encourage: '<path d="M72 100 Q84 104 98 106 M122 106 Q136 104 148 100" fill="none" stroke="#3a2a1f" stroke-width="4" stroke-linecap="round"/>',
  think: '<path d="M70 106 L98 102 M122 98 Q136 92 150 100" fill="none" stroke="#3a2a1f" stroke-width="4" stroke-linecap="round"/>',
};

export function mascotSVG(mood = 'happy') {
  const id = `egg${++uid}`;
  const mouth = MOUTHS[mood] || MOUTHS.happy;
  const brows = BROWS[mood] || BROWS.happy;
  const eyeY = mood === 'cheer' ? 130 : 132;
  const eyes =
    mood === 'cheer'
      ? `<path d="M77 ${eyeY} Q85 122 93 ${eyeY} M127 ${eyeY} Q135 122 143 ${eyeY}" fill="none" stroke="#2b3a55" stroke-width="4.5" stroke-linecap="round"/>`
      : `<circle cx="${mood === 'think' ? 89 : 85}" cy="${eyeY}" r="6.5" fill="#2b3a55"/><circle cx="${mood === 'think' ? 139 : 135}" cy="${eyeY}" r="6.5" fill="#2b3a55"/>
         <circle cx="${mood === 'think' ? 91 : 87}" cy="${eyeY - 2}" r="2" fill="#fff"/><circle cx="${mood === 'think' ? 141 : 137}" cy="${eyeY - 2}" r="2" fill="#fff"/>`;

  return `
<svg viewBox="0 0 230 250" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="ไข่เป็ดนักสืบ">
  <defs>
    <radialGradient id="${id}-g" cx="38%" cy="35%" r="75%">
      <stop offset="0" stop-color="#f6fffb"/>
      <stop offset="0.6" stop-color="#d4efe6"/>
      <stop offset="1" stop-color="#a9d8c9"/>
    </radialGradient>
    <pattern id="${id}-p" width="16" height="16" patternUnits="userSpaceOnUse">
      <rect width="16" height="16" fill="#c0874d"/>
      <path d="M0 8H16M8 0V16" stroke="#8b5a2b" stroke-width="3.5"/>
      <path d="M0 3H16M3 0V16" stroke="#f1c27d" stroke-width="1.2" opacity=".8"/>
    </pattern>
  </defs>
  <ellipse cx="110" cy="240" rx="62" ry="7" fill="rgba(0,0,0,.13)"/>
  <!-- ตัวไข่ -->
  <path d="M110 42 C160 42 186 116 186 162 C186 210 152 236 110 236 C68 236 34 210 34 162 C34 116 60 42 110 42Z"
        fill="url(#${id}-g)" stroke="#5f9c8e" stroke-width="3.5"/>
  <circle cx="68" cy="196" r="4" fill="#9fcfc0"/><circle cx="150" cy="206" r="3" fill="#9fcfc0"/>
  <circle cx="160" cy="150" r="2.5" fill="#9fcfc0"/><circle cx="60" cy="150" r="2.5" fill="#9fcfc0"/>
  <!-- หมวกนักสืบ -->
  <path d="M30 86 Q110 64 190 86 Q186 98 110 104 Q34 98 30 86Z" fill="#7a4c22"/>
  <path d="M52 86 C50 36 170 36 168 86 Q110 96 52 86Z" fill="url(#${id}-p)" stroke="#6b421d" stroke-width="3"/>
  <path d="M54 80 Q110 90 166 80" fill="none" stroke="#3a2a1f" stroke-width="7" opacity=".85"/>
  <circle cx="110" cy="42" r="6" fill="#7a4c22"/>
  <!-- คิ้ว -->
  ${brows}
  <!-- แว่น -->
  <circle cx="85" cy="132" r="21" fill="rgba(255,255,255,.45)" stroke="#2b3a55" stroke-width="5"/>
  <circle cx="135" cy="132" r="21" fill="rgba(255,255,255,.45)" stroke="#2b3a55" stroke-width="5"/>
  <path d="M106 130 Q110 124 114 130" fill="none" stroke="#2b3a55" stroke-width="4.5"/>
  <path d="M64 128 L44 122 M156 128 L174 122" stroke="#2b3a55" stroke-width="4" stroke-linecap="round"/>
  ${eyes}
  <!-- แก้ม -->
  <ellipse cx="66" cy="164" rx="10" ry="6" fill="#ffb3b8" opacity=".75"/>
  <ellipse cx="154" cy="164" rx="10" ry="6" fill="#ffb3b8" opacity=".75"/>
  ${mouth}
  <!-- แว่นขยาย -->
  <g class="magnifier">
    <path d="M186 200 L170 222" stroke="#6b421d" stroke-width="9" stroke-linecap="round"/>
    <circle cx="198" cy="180" r="21" fill="rgba(170,225,255,.55)" stroke="#e8a33d" stroke-width="7"/>
    <path d="M188 172 Q193 166 200 166" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round"/>
    <ellipse cx="174" cy="212" rx="11" ry="9" fill="#d4efe6" stroke="#5f9c8e" stroke-width="3"/>
  </g>
</svg>`;
}

/** มาสคอตพร้อมกล่องคำพูด */
export function mascotWithBubble(mood, text, { size = 'md' } = {}) {
  return h(
    'div',
    { class: `mascot-row row-${size}` },
    h('div', { class: `mascot mood-${mood}`, html: mascotSVG(mood) }),
    text ? h('div', { class: 'bubble' }, text) : null
  );
}
