// ======================== api.js (full) ========================

// ต้องมี SUPABASE_URL และ SUPABASE_ANON_KEY จาก config.js
// ตัวอย่างใน config.js:
//   window.SUPABASE_URL = "https://xxxx.supabase.co";
//   window.SUPABASE_ANON_KEY = "eyJ...";

// ---------- Headers กลางสำหรับเรียก REST ----------
const REST_HEADERS = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  "Content-Type": "application/json",
  Prefer: "return=representation",
};

// ---------- Helper: โหลด PapaParse อัตโนมัติถ้ายังไม่มี ----------
function ensurePapa() {
  return new Promise((resolve, reject) => {
    if (window.Papa) return resolve();
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/papaparse@5.4.1/papaparse.min.js';
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('โหลด PapaParse ไม่สำเร็จ'));
    document.head.appendChild(s);
  });
}

// ---------- Insert หลายแถวรวดเดียว ----------
async function createSessionsBulk(rows) {
  const url = `${SUPABASE_URL}/sleep_sessions?select=*,Quality%20of%20Sleep,Age,Sleep%20Duration&order=Person%20ID.desc`;
  const res = await fetch(url, {
    method: "POST",
    headers: REST_HEADERS,
    body: JSON.stringify(rows),
  });
  if (!res.ok) throw new Error(`REST ${res.status} ${await res.text()}`);
  return res.json(); // array ของแถวที่เพิ่ง insert
}

// ---------- Insert 1 แถว ----------
async function createSession(row) {
  const rows = await createSessionsBulk([row]);
  return rows;
}

// ---------- Ingest CSV (รองรับ 3 ฟอร์แมต) ----------
async function ingestCsvText(text) {
  await ensurePapa(); // สำคัญ: ให้แน่ใจว่า Papa พร้อม

  const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
  if (parsed.errors?.length) {
    console.error(parsed.errors);
    throw new Error("CSV parse error");
  }
  const rows = parsed.data;
  if (!rows.length) return { inserted: 0 };

  // ตรวจหัวคอลัมน์แบบ case-insensitive
  const has = (name) =>
    parsed.meta.fields.some(
      (f) => f && f.trim().toLowerCase() === name.trim().toLowerCase()
    );

  // ===== ฟอร์แมต 1: start_time,end_time,sleep_quality,note =====
  if (has("start_time") && has("end_time")) {
    const payload = rows.map((r) => ({
      start_time: new Date(r.start_time).toISOString(),
      end_time: new Date(r.end_time).toISOString(),
      sleep_quality: numOrNull(r.sleep_quality),
      note: (r.note ?? "").trim() || null,
    }));
    await createSessionsBulk(payload);
    return { inserted: payload.length };
  }

  // ===== ฟอร์แมต 2: date + sleep_start + sleep_end (+ quality/note) =====
  if (has("date") && has("sleep_start") && has("sleep_end")) {
    const payload = rows
      .map((r) => {
        const d = (r.date || "").trim(); // YYYY-MM-DD
        const st = (r.sleep_start || "").trim(); // HH:mm
        const et = (r.sleep_end || "").trim(); // HH:mm
        if (!d || !st || !et) return null;

        const start = new Date(`${d}T${st}:00`);
        const end = new Date(`${d}T${et}:00`);
        if (end <= start) end.setDate(end.getDate() + 1);

        return {
          start_time: start.toISOString(),
          end_time: end.toISOString(),
          sleep_quality: numOrNull(r.quality),
          note: (r.note ?? "").trim() || null,
        };
      })
      .filter(Boolean);

    await createSessionsBulk(payload);
    return { inserted: payload.length };
  }

  // ===== ฟอร์แมต 3: Sleep Health & Lifestyle Dataset =====
  if (has("sleep duration") && has("quality of sleep")) {
    // ตั้งเวลา base: เริ่มนอน 22:00 แล้วไล่ย้อนหลังทีละวัน
    const BASE_START_HOUR = 22;
    const base = new Date();
    base.setHours(BASE_START_HOUR, 0, 0, 0);

    const get = (obj, key) => obj[key] ?? obj[keyMap(obj, key)] ?? null;
    function keyMap(obj, name) {
      const keys = Object.keys(obj);
      const idx = keys.findIndex(
        (k) => (k || "").trim().toLowerCase() === name.toLowerCase()
      );
      return idx >= 0 ? keys[idx] : name;
    }

    const payload = rows.map((r, i) => {
      const durH = Number(get(r, "Sleep Duration")); // ชั่วโมง (เช่น 7.5)
      const q10 = Number(get(r, "Quality of Sleep")); // 0..10
      const q100 = Number.isFinite(q10)
        ? Math.max(0, Math.min(100, Math.round(q10 * 10)))
        : null;

      const day = new Date(base);
      day.setDate(base.getDate() - i); // แถวแรก = วันนี้, ถัดไปถอยหลังวันละ 1

      const start = new Date(day);
      const end = new Date(
        start.getTime() + (Number.isFinite(durH) ? durH : 0) * 3600 * 1000
      );

      const noteBits = [
        ["PersonID", get(r, "Person ID")],
        ["Gender", get(r, "Gender")],
        ["Age", get(r, "Age")],
        ["Occ", get(r, "Occupation")],
        ["HR", get(r, "Heart Rate")],
        ["Steps", get(r, "Daily Steps")],
        ["Stress", get(r, "Stress Level")],
        ["PA", get(r, "Physical Activity Level")],
        ["BMI", get(r, "BMI Category")],
        ["BP", get(r, "Blood Pressure")],
        ["Disorder", get(r, "Sleep Disorder")],
      ]
        .filter(([, v]) => v !== null && v !== undefined && String(v).trim() !== "")
        .map(([k, v]) => `${k}=${v}`)
        .join("; ");

      return {
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        sleep_quality: q100,
        note: `dataset:SleepHealth; ${noteBits}`.slice(0, 1000),
      };
    });

    await createSessionsBulk(payload);
    return { inserted: payload.length };
  }

  // ไม่เข้าเงื่อนไขใดเลย
  throw new Error(
    "CSV รูปแบบไม่รองรับ (กรุณาใช้รูปแบบที่ระบบกำหนด หรือ Sleep Health dataset)"
  );
}

// ---------- ดึง CSV จาก URL ----------
async function ingestFromUrl(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();
  return ingestCsvText(text);
}

// ================== ส่วนดึงข้อมูลสำหรับสถิติ/แดชบอร์ด ==================

// ดึงรายการบันทึกการนอนทั้งหมด หรือเฉพาะช่วง N วันล่าสุด
async function fetchAllSessions({ days = null, order = "start_time.desc", limit = null, offset = 0 } = {}) {
  let url = `${SUPABASE_URL}/rest/v1/sleep_sessions?select=*&order=${encodeURIComponent(order)}`;

  if (days && Number.isFinite(days)) {
    const since = new Date();
    since.setDate(since.getDate() - Number(days));
    url += `&start_time=gte.${since.toISOString()}`;
  }
  if (limit && Number.isFinite(limit)) url += `&limit=${limit}`;
  if (offset && Number.isFinite(offset)) url += `&offset=${offset}`;

  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
  });
  if (!res.ok) throw new Error(`REST ${res.status} ${await res.text()}`);
  return res.json();
}

// ตัวอย่างฟังก์ชันดึงข้อมูลทั้งหมด
async function fetchAllSessions(limit = 500) {
  const url = `${window.SUPABASE_URL}/rest/v1/sleep_sessions?select=*&order=Person%20ID.desc&limit=${limit}`;
  const res = await fetch(url, {
    headers: {
      apikey: window.SUPABASE_ANON_KEY,
      Authorization: `Bearer ${window.SUPABASE_ANON_KEY}`
    }
  });
  if (!res.ok) throw new Error(`REST ${res.status} ${await res.text()}`);
  const rows = await res.json();
  // mapping ชื่อคอลัมน์ให้ JS ใช้งานง่ายขึ้น (optional)
  return rows.map(r => ({
    person_id: r["Person ID"],
    quality: r["Quality of Sleep"],
    activity: r["Physical Activity Level"],
    stress: r["Stress Level"],
    heart_rate: r["Heart Rate"],
    steps: r["Daily Steps"],
    age: r["Age"],
    duration: r["Sleep Duration"],
    gender: r["Gender"],
    bp: r["Blood Pressure"],
    occupation: r["Occupation"],
    disorder: r["Sleep Disorder"],
    bmi_cat: r["BMI Category"],
    // ...ถ้ามีคอลัมน์อื่นเพิ่มก็ใส่ได้
    _raw: r // เก็บ raw object เผื่อใช้ชื่อเดิม
  }));
}

// สรุปสถิติพื้นฐาน
function computeSleepStats(sessions) {
  if (!Array.isArray(sessions) || sessions.length === 0) {
    return {
      nights: 0,
      total_hours: 0,
      avg_hours_per_night: 0,
      avg_quality: null,
    };
  }

  let totalHours = 0;
  let qualitySum = 0;
  let qualityCount = 0;

  for (const s of sessions) {
    const st = s.start_time ? new Date(s.start_time) : null;
    const et = s.end_time ? new Date(s.end_time) : null;
    if (st && et && et > st) {
      totalHours += (et - st) / (1000 * 60 * 60);
    }
    if (typeof s.sleep_quality === "number") {
      qualitySum += s.sleep_quality;
      qualityCount += 1;
    }
  }

  const nights = sessions.length;
  const avgHours = nights ? totalHours / nights : 0;
  const avgQuality = qualityCount ? Math.round((qualitySum / qualityCount) * 10) / 10 : null;

  return {
    nights,
    total_hours: Math.round(totalHours * 10) / 10,
    avg_hours_per_night: Math.round(avgHours * 10) / 10,
    avg_quality: avgQuality, // 0..100 หรือ null
  };
}

// ดึง + คำนวณสถิติช่วง N วัน (7/30/90 หรือ null = ทั้งหมด)
async function fetchRangeStats(days = null) {
  const sessions = await fetchAllSessions({ days });
  const stats = computeSleepStats(sessions);
  return { sessions, stats };
}

// ---------- Utilities ----------
function numOrNull(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// ---------- Export ออกให้สคริปต์หน้าอื่นเรียกได้ ----------
window.createSession = createSession;
window.createSessionsBulk = createSessionsBulk;
window.ingestCsvText = ingestCsvText;
window.ingestFromUrl = ingestFromUrl;

window.fetchAllSessions = fetchAllSessions;
window.computeSleepStats = computeSleepStats;
window.fetchRangeStats = fetchRangeStats;

// ====================== end of api.js ======================
