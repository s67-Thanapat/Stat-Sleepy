// ===== Supabase REST helpers =====
const REST_HEADERS = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  "Content-Type": "application/json",
  Prefer: "return=representation",
};

// บันทึกทีละหลายแถว (เร็วกว่าเรียกทีละแถว)
async function createSessionsBulk(rows) {
  const url = `${SUPABASE_URL}/rest/v1/sleep_sessions`;
  const res = await fetch(url, {
    method: "POST",
    headers: REST_HEADERS,
    body: JSON.stringify(rows),
  });
  if (!res.ok) throw new Error(`REST ${res.status} ${await res.text()}`);
  return res.json(); // array ของแถวที่เพิ่ง insert
}

// บันทึก 1 แถว (ยังคงไว้ให้ใช้ที่อื่น ๆ)
async function createSession(row) {
  const rows = await createSessionsBulk([row]);
  return rows;
}

// ===== CSV ingestion =====

// ฟังก์ชันหลัก: รองรับ 3 ฟอร์แมต
// 1) start_time,end_time,sleep_quality,note
// 2) date,sleep_start,sleep_end,quality
// 3) Sleep Health dataset (Sleep Duration, Quality of Sleep, ... )
async function ingestCsvText(text) {
  // ใช้ PapaParse แปลงเป็น objects
  const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
  if (parsed.errors?.length) {
    console.error(parsed.errors);
    throw new Error("CSV parse error");
  }
  const rows = parsed.data;
  if (!rows.length) return { inserted: 0 };

  // ตรวจหัวคอลัมน์แบบ case-insensitive
  const has = name =>
    parsed.meta.fields.some(f => f && f.trim().toLowerCase() === name.trim().toLowerCase());

  // ==== ฟอร์แมต 1: มี start_time,end_time ====
  if (has("start_time") && has("end_time")) {
    const payload = rows.map(r => ({
      start_time: new Date(r.start_time).toISOString(),
      end_time:   new Date(r.end_time).toISOString(),
      sleep_quality: numOrNull(r.sleep_quality),
      note: (r.note ?? "").trim() || null,
      // เพิ่มฟิลด์อื่นในตารางได้ตามมีจริง
    }));
    await createSessionsBulk(payload);
    return { inserted: payload.length };
  }

  // ==== ฟอร์แมต 2: date + sleep_start + sleep_end ====
  if (has("date") && has("sleep_start") && has("sleep_end")) {
    const payload = rows.map(r => {
      const d = (r.date || "").trim();         // YYYY-MM-DD
      const st = (r.sleep_start || "").trim(); // HH:mm
      const et = (r.sleep_end || "").trim();   // HH:mm
      if (!d || !st || !et) return null;

      const start = new Date(`${d}T${st}:00`);
      const end   = new Date(`${d}T${et}:00`);
      if (end <= start) end.setDate(end.getDate() + 1);

      return {
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        sleep_quality: numOrNull(r.quality),
        note: (r.note ?? "").trim() || null,
      };
    }).filter(Boolean);
    await createSessionsBulk(payload);
    return { inserted: payload.length };
  }

  // ==== ฟอร์แมต 3: Sleep Health dataset ====
  if (has("sleep duration") && has("quality of sleep")) {
    // ตั้งค่าเวลาขั้นพื้นฐาน: เริ่มนอน 22:00 ของแต่ละวัน (เลื่อนย้อนหลังทีละวัน)
    const BASE_START_HOUR = 22; // ปรับได้ตามต้องการ
    const base = new Date();
    base.setHours(BASE_START_HOUR, 0, 0, 0);

    const get = (obj, key) => obj[key] ?? obj[keyMap(obj, key)] ?? null;
    function keyMap(obj, name) {
      // หา key ที่เท่ากันแบบ case-insensitive
      const keys = Object.keys(obj);
      const idx = keys.findIndex(
        k => (k || "").trim().toLowerCase() === name.toLowerCase()
      );
      return idx >= 0 ? keys[idx] : name;
    }

    const payload = rows.map((r, i) => {
      const durH = Number(get(r, "Sleep Duration"));       // ชั่วโมง
      const q10  = Number(get(r, "Quality of Sleep"));     // 0..10
      const q100 = Number.isFinite(q10) ? Math.max(0, Math.min(100, Math.round(q10 * 10))) : null;

      const day = new Date(base);
      day.setDate(base.getDate() - i);        // แถวแรก = วันนี้, แถวต่อไปย้อนวัน

      const start = new Date(day);
      const end   = new Date(start.getTime() + (Number.isFinite(durH) ? durH : 0) * 3600 * 1000);

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
        ["Disorder", get(r, "Sleep Disorder")]
      ]
      .filter(([,v]) => v !== null && v !== undefined && String(v).trim() !== "")
      .map(([k,v]) => `${k}=${v}`)
      .join("; ");

      return {
        start_time: start.toISOString(),
        end_time:   end.toISOString(),
        sleep_quality: q100,
        note: `dataset:SleepHealth; ${noteBits}`.slice(0, 1000) // กันโน้ตยาวเกิน
      };
    });

    await createSessionsBulk(payload);
    return { inserted: payload.length };
  }

  // ถ้าไม่ตรงทุกกรณี
  throw new Error("CSV รูปแบบไม่รองรับ (กรุณาใช้รูปแบบที่ระบบกำหนดหรือ Sleep Health dataset)");
}

// ดึง CSV จาก URL แล้วโยนเข้า ingestCsvText
async function ingestFromUrl(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();
  return ingestCsvText(text);
}

// ===== utils =====
function numOrNull(v) {
  const n = Number(v); 
  return Number.isFinite(n) ? n : null;
}
// ===== Query helpers for stats/dashboard =====

// ดึงรายการบันทึกการนอนทั้งหมด หรือเฉพาะช่วง N วันล่าสุด
async function fetchAllSessions({ days = null, order = "start_time.desc", limit = null, offset = 0 } = {}) {
  let url = `${SUPABASE_URL}/rest/v1/sleep_sessions?select=*&order=${encodeURIComponent(order)}`;

  // กรองช่วงเวลา (N วันย้อนหลัง) ถ้าระบุ days
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
  return res.json(); // array ของ session objects
}

// คำนวณสถิติเบื้องต้นจากแถวที่ดึงมา
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

// ดึง + คำนวณสถิติช่วง N วัน (เช่น 7, 30, 90) หรือทั้งหมด (ไม่ส่ง days)
async function fetchRangeStats(days = null) {
  const sessions = await fetchAllSessions({ days });
  const stats = computeSleepStats(sessions);
  return { sessions, stats };
}

// (ถ้าต้องการให้เรียกใช้จากสคริปต์อื่นแบบชัวร์ ๆ)
window.fetchAllSessions = fetchAllSessions;
window.computeSleepStats = computeSleepStats;
window.fetchRangeStats = fetchRangeStats;
