// 🔧 ใส่ค่าโปรเจกต์คุณก่อน deploy
window.CONFIG = {
  // จาก Supabase > Project Settings > API
  SUPABASE_URL: 'https://YOUR-PROJECT.supabase.co',
  SUPABASE_ANON_KEY: 'YOUR_ANON_KEY',

  // โดเมนโปรเจกต์ backend (เช่น https://sleep-backend.vercel.app)
  // ถ้า backend กับ frontend โดเมนเดียวกัน ให้ใส่ '' แล้ว api.js จะเรียก /api/ingest
  BACKEND_URL: 'https://YOUR-BACKEND.vercel.app'
};
