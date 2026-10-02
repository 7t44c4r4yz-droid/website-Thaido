// useHandPinch — ตรวจจับมือและท่า "จับ" (pinch) ด้วย MediaPipe Hand Landmarker
// ----------------------------------------------------------------------------
// - ประมวลผลภาพจากกล้องในเครื่องเท่านั้น ไม่มีการอัปโหลดภาพไปที่ใด
// - โหลดไลบรารี/โมเดลจาก CDN (ดูค่าคงที่ด้านล่าง ถ้าต้องการเก็บไว้ในโปรเจกต์ให้ดู README)
// - pinch = ระยะปลายนิ้วโป้ง (landmark 4) กับปลายนิ้วชี้ (landmark 8)
//   เทียบกับขนาดมือ (ข้อมือ 0 -> โคนนิ้วกลาง 9) จึงใช้ได้ทั้งมือใกล้/ไกลกล้อง
// - มี hysteresis (เกณฑ์เริ่มจับ < เกณฑ์ปล่อย) และ smoothing กันเคอร์เซอร์สั่น
//
// การใช้งาน:
//   const hand = useHandPinch({ video, onFrame(hands) {...}, onStatus(s) {...} })
//   await hand.start();  ...  hand.stop();
//   hands = [{ key, x, y, pinching, justPinched, justReleased }]
//   x, y เป็นค่า 0..1 ของภาพวิดีโอ โดย x กลับด้านแบบกระจกแล้ว
// ----------------------------------------------------------------------------

export const VISION_VERSION = '0.10.14';
export const VISION_BASE = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${VISION_VERSION}`;
export const HAND_MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

const PINCH_ON = 0.3; // ระยะนิ้ว/ขนาดมือ ต่ำกว่านี้ = เริ่มจับ
const PINCH_OFF = 0.45; // สูงกว่านี้ = ปล่อย
const CONFIRM_FRAMES = 2; // ต้องเห็นสถานะใหม่ติดกันกี่เฟรมจึงเปลี่ยน (กันกะพริบ)
const LOST_FRAMES = 6; // มือหายไปกี่เฟรมจึงถือว่าปล่อย

let visionModulePromise = null;
function loadVision() {
  const url = `${VISION_BASE}/vision_bundle.mjs`;
  visionModulePromise ??= import(/* @vite-ignore */ url);
  return visionModulePromise;
}

async function createLandmarker(vision) {
  const fileset = await vision.FilesetResolver.forVisionTasks(`${VISION_BASE}/wasm`);
  const options = (delegate) => ({
    baseOptions: { modelAssetPath: HAND_MODEL_URL, delegate },
    runningMode: 'VIDEO',
    numHands: 2,
    minHandDetectionConfidence: 0.5,
    minHandPresenceConfidence: 0.5,
    minTrackingConfidence: 0.5,
  });
  try {
    return await vision.HandLandmarker.createFromOptions(fileset, options('GPU'));
  } catch (err) {
    console.warn('GPU ใช้ไม่ได้ เปลี่ยนเป็น CPU', err);
    return vision.HandLandmarker.createFromOptions(fileset, options('CPU'));
  }
}

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

/**
 * ตัวติดตามท่าจับแบบฟังก์ชันล้วน (ไม่แตะกล้อง) แยกออกมาเพื่อให้ทดสอบได้
 * update(result, videoWidth, videoHeight) รับผลจาก HandLandmarker.detectForVideo
 */
export function createPinchTracker() {
  /** @type {Map<string, any>} */
  const tracks = new Map();

  function update(result, videoWidth, videoHeight) {
    const vw = videoWidth || 1;
    const vh = videoHeight || 1;
    const seen = new Set();
    const labelCount = {};

    (result.landmarks || []).forEach((lm, i) => {
      const label = result.handedness?.[i]?.[0]?.categoryName || 'Hand';
      labelCount[label] = (labelCount[label] || 0) + 1;
      const key = labelCount[label] > 1 ? `${label}${labelCount[label]}` : label;
      seen.add(key);

      // แปลงเป็นพิกเซลเพื่อให้ระยะไม่เพี้ยนตามสัดส่วนภาพ
      const P = (p) => ({ x: p.x * vw, y: p.y * vh });
      const thumb = P(lm[4]);
      const index = P(lm[8]);
      const handSize = Math.max(1, dist(P(lm[0]), P(lm[9])));
      const ratio = dist(thumb, index) / handSize;

      // จุดกึ่งกลางระหว่างนิ้วโป้งกับนิ้วชี้ (กลับด้านแบบกระจก)
      const rawX = 1 - (lm[4].x + lm[8].x) / 2;
      const rawY = (lm[4].y + lm[8].y) / 2;

      let t = tracks.get(key);
      if (!t) {
        t = { key, x: rawX, y: rawY, ratio, pinching: false, pending: 0, lost: 0 };
        tracks.set(key, t);
      }
      // smoothing แบบปรับตามความเร็ว: ขยับช้า = นิ่ง, ขยับเร็ว = ตามทัน
      const speed = Math.hypot(rawX - t.x, rawY - t.y);
      const alpha = Math.min(0.85, 0.25 + speed * 6);
      t.x += (rawX - t.x) * alpha;
      t.y += (rawY - t.y) * alpha;
      t.ratio += (ratio - t.ratio) * 0.6;
      t.lost = 0;

      const want = t.pinching ? t.ratio < PINCH_OFF : t.ratio < PINCH_ON;
      t.justPinched = false;
      t.justReleased = false;
      if (want !== t.pinching) {
        t.pending++;
        if (t.pending >= CONFIRM_FRAMES) {
          t.pinching = want;
          t.pending = 0;
          if (want) t.justPinched = true;
          else t.justReleased = true;
        }
      } else t.pending = 0;
    });

    // มือที่หายไป: ถ้าหายนานพอให้ถือว่าปล่อย
    for (const [key, t] of tracks) {
      if (seen.has(key)) continue;
      t.lost++;
      t.justPinched = false;
      t.justReleased = false;
      if (t.lost >= LOST_FRAMES) {
        if (t.pinching) {
          t.pinching = false;
          t.justReleased = true;
          t.gone = true;
        } else tracks.delete(key);
      }
    }

    const out = [];
    for (const [key, t] of tracks) {
      out.push({ key, x: t.x, y: t.y, pinching: t.pinching, justPinched: t.justPinched, justReleased: t.justReleased, visible: t.lost === 0 });
      if (t.gone) tracks.delete(key);
    }
    return out;
  }

  return { update, reset: () => tracks.clear() };
}

export function useHandPinch({ video, onFrame, onStatus = () => {} }) {
  let landmarker = null;
  let stream = null;
  let rafId = 0;
  let stopped = false;
  let lastTime = -1;
  const tracker = createPinchTracker();

  function cleanupMedia() {
    cancelAnimationFrame(rafId);
    stream?.getTracks().forEach((t) => t.stop());
    stream = null;
    if (video) {
      video.pause?.();
      video.srcObject = null;
    }
    try {
      landmarker?.close();
    } catch {}
    landmarker = null;
  }

  async function start() {
    stopped = false;
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      throw new Error('เบราว์เซอร์นี้เปิดกล้องไม่ได้ ต้องเปิดผ่าน https:// หรือ localhost');
    }
    onStatus('loading');
    // ขอกล้องและโหลดโมเดลพร้อมกัน
    const camPromise = navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false,
    });
    const modelPromise = loadVision().then(createLandmarker);
    try {
      stream = await camPromise;
      if (stopped) {
        modelPromise.then((l) => l?.close?.()).catch(() => {});
        return cleanupMedia();
      }
      video.srcObject = stream;
      video.muted = true;
      video.playsInline = true;
      await video.play();
      onStatus('camera-ready');
      landmarker = await modelPromise;
      if (stopped) return cleanupMedia();
    } catch (err) {
      cleanupMedia();
      modelPromise.then((l) => l?.close?.()).catch(() => {});
      throw err;
    }
    onStatus('running');
    loop();
  }

  function loop() {
    if (stopped || !landmarker) return;
    rafId = requestAnimationFrame(loop);
    if (video.readyState < 2 || video.currentTime === lastTime) return;
    lastTime = video.currentTime;
    let result;
    try {
      result = landmarker.detectForVideo(video, performance.now());
    } catch (err) {
      console.warn(err);
      return;
    }
    onFrame(tracker.update(result, video.videoWidth, video.videoHeight));
  }

  function stop() {
    stopped = true;
    tracker.reset();
    cleanupMedia();
    onStatus('stopped');
  }

  return { start, stop };
}
