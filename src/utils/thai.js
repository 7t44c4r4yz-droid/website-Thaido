// เครื่องมือจัดการอักขระไทย
// ใช้ Array.from แยกทีละ code point เพื่อให้สระบน/ล่างและวรรณยุกต์เป็นตัวของมันเอง
// เช่น "ใหญ่" -> ["ใ", "ห", "ญ", "่"]

export const splitThaiChars = (word) => Array.from(word.normalize('NFC'));

export const charCount = (word) => splitThaiChars(word).length;

// สระบน สระล่าง ไม้หันอากาศ ไม้ไต่คู้ วรรณยุกต์ การันต์ ฯลฯ (อักขระที่ต้องเกาะพยัญชนะ)
const COMBINING = /[ัิ-ฺ็-๎]/;

export const isCombining = (ch) => COMBINING.test(ch);

/**
 * แยกส่วนแสดงผลของตัวอักษร 1 ตัว
 * อักขระที่ต้องเกาะพยัญชนะจะใช้ "อ" สีจางเป็นฐาน (บางฟอนต์ไม่มีวงกลมประ ◌)
 */
export const displayParts = (ch) => (isCombining(ch) ? { ghost: 'อ', mark: ch } : { ghost: '', mark: ch });
