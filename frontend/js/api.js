if (!window.CONFIG?.SUPABASE_URL || !window.CONFIG?.SUPABASE_ANON_KEY) {
  throw new Error('CONFIG not loaded');
}
const { SUPABASE_URL, SUPABASE_ANON_KEY, BACKEND_URL } = window.CONFIG;

// เพิ่ม 1 แถวลงตาราง sleep_sessions ผ่าน Supabase REST
async function createSession({ start_time, end_time, sleep_quality = null, note = null }) {
  const url = `${SUPABASE_URL}/rest/v1/sleep_sessions`;
  const body = [{
    user_id: null,
    start_time,
    end_time,
    sleep_quality,
    note,
    source: 'form'
  }];

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation'  // ให้คืนแถวที่ insert (มี id)
      // 'Accept-Profile': 'public',   // ปกติไม่ต้อง ถ้าใช้ schema public อยู่แล้ว
      // 'Content-Profile': 'public'
    },
    body: JSON.stringify(body)
  });

  // Supabase REST มักตอบ 201 Created
  if (res.ok) {
    return res.json(); // [{ id, ... }]
  }

  // พยายามอ่านรายละเอียด error เป็น JSON ก่อน (ถ้ามี)
  let detail = await res.text();
  try { detail = JSON.stringify(JSON.parse(detail)); } catch {}
  throw new Error(`REST ${res.status} ${detail}`);
}
