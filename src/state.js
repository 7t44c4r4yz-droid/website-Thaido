// สถานะของเกม เก็บในหน่วยความจำเท่านั้น (ไม่ใช้ localStorage)
// เมื่อเริ่มใหม่ให้เพื่อนคนต่อไป ข้อมูลทั้งหมดจะถูกล้าง

export const MISSION_NAMES = {
  1: 'คนไหนคนถูก',
  2: 'จับตัวอักษร',
  3: 'นักสืบคำผิด',
  review: 'ทบทวนคำที่ผิด',
};

function freshState() {
  return {
    name: '',
    score: 0,
    maxScore: 0,
    currentMission: null, // 1 | 2 | 3 | 'review' | null
    results: { 1: null, 2: null, 3: null }, // { correct, total }
    notebook: [], // { mission, chosen, note, correct, explanation, category }
  };
}

export const state = freshState();

export function resetState() {
  Object.assign(state, freshState());
}

export function addScore(points, possible) {
  state.score += points;
  state.maxScore += possible;
}

/** บันทึกคำที่ตอบผิดลงสมุดทันที */
export function logMistake({ mission, chosen, note = '', word }) {
  state.notebook.push({
    mission,
    chosen,
    note,
    correct: word.correct,
    explanation: word.explanation,
    category: word.category,
  });
}
