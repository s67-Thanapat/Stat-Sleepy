const { SUPABASE_URL, SUPABASE_ANON_KEY, BACKEND_URL } = window.CONFIG;

// อ่านทั้งหมดจากตารางผ่าน Supabase REST
async function fetchAllSessions(limit = 500) {
  const url = `${SUPABASE_URL}/rest/v1/sleep_sessions?select=*&order=start_time.desc&limit=${limit}`;
  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
  });
  if (!res.ok) throw new Error(`REST error ${res.status}`);
  return res.json();
}

// นำเข้า CSV เป็นข้อความ
async function ingestCsvText(text) {
  const endpoint = (BACKEND_URL || '') + '/api/ingest';
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type':'application/json' },
    body: JSON.stringify({ mode:'csv', text }),
  });
  const j = await res.json();
  if (!res.ok || !j.ok) throw new Error(j.error || `HTTP ${res.status}`);
  return j;
}

// นำเข้าจาก URL CSV
async function ingestFromUrl(url) {
  const endpoint = (BACKEND_URL || '') + '/api/ingest';
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type':'application/json' },
    body: JSON.stringify({ mode:'url', url }),
  });
  const j = await res.json();
  if (!res.ok || !j.ok) throw new Error(j.error || `HTTP ${res.status}`);
  return j;
}
