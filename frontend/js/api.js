// frontend/js/api.js

// --- ตรวจว่าโหลดค่าคอนฟิกมาแล้วหรือยัง ---
if (!window.CONFIG?.SUPABASE_URL || !window.CONFIG?.SUPABASE_ANON_KEY) {
  throw new Error(
    'CONFIG not loaded: กรุณาตั้งค่า SUPABASE_URL/ANON_KEY ใน js/config.js และโหลด config.js ก่อน api.js'
  );
}

const { SUPABASE_URL, SUPABASE_ANON_KEY, BACKEND_URL } = window.CONFIG;

// -------------------- READ: ดึงข้อมูลทั้งหมด --------------------
async function fetchAllSessions(limit = 500) {
  const url = `${SUPABASE_URL}/rest/v1/sleep_sessions?select=*&order=start_time.desc&limit=${limit}`;
  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
  });
  if (!res.ok) throw new Error(`REST ${res.status}`);
  return res.json();
}

// -------------------- CREATE: เพิ่มแถวเดียวจากฟอร์ม --------------------
// ✅ ใหม่: เพิ่มรองรับ height_cm, weight_kg, age_years
async function createSession({
  start_time,
  end_time,
  sleep_quality = null,
  note = null,
  height_cm = null,
  weight_kg = null,
  age_years = null
}) {
  const url = `${SUPABASE_URL}/rest/v1/sleep_sessions`;
  const body = [{
    user_id: null,
    start_time,
    end_time,
    sleep_quality,
    note,
    source: 'form',
    // ฟิลด์ใหม่
    height_cm,
    weight_kg,
    age_years
  }];

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation'
    },
    body: JSON.stringify(body)
  });

  if (res.ok) return res.json();
  let detail = await res.text();
  try { detail = JSON.stringify(JSON.parse(detail)); } catch {}
  throw new Error(`REST ${res.status} ${detail}`);
}


// -------------------- IMPORT: อัปโหลด CSV เป็นข้อความ --------------------
async function ingestCsvText(text) {
  const endpoint = (BACKEND_URL || '') + '/api/ingest';
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode: 'csv', text }),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok || !j.ok) throw new Error(j.error || `HTTP ${res.status}`);
  return j; // { ok:true, inserted: n }
}

// -------------------- IMPORT: ดึงจาก URL CSV --------------------
async function ingestFromUrl(url) {
  const endpoint = (BACKEND_URL || '') + '/api/ingest';
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode: 'url', url }),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok || !j.ok) throw new Error(j.error || `HTTP ${res.status}`);
  return j; // { ok:true, inserted: n }
}

// --- เผื่อบางหน้าต้องเรียกจากสคริปต์อื่น ให้ผูกไว้ที่ window ---
window.fetchAllSessions = fetchAllSessions;
window.createSession = createSession;
window.ingestCsvText = ingestCsvText;
window.ingestFromUrl = ingestFromUrl;
