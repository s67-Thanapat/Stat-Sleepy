// ✅ ใหม่: เพิ่ม 1 แถวลงตาราง sleep_sessions ผ่าน Supabase REST
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
      Prefer: 'return=representation'
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`REST ${res.status} ${t}`);
  }
  return res.json(); // array ของแถวที่เพิ่ง insert (คืน id ด้วย)
}
