// frontend/js/config.js

// ใช้ค่าเหล่านี้เวลา deploy
window.CONFIG = {
  // จาก Supabase > Project Settings > API
  SUPABASE_URL: 'https://nbxuzdrutlvavirpzpjt.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9....',

  // ถ้ามี backend แยก กำหนดไว้ที่นี่
  BACKEND_URL: 'https://stat-sleepy-backend.vercel.app'
};

// ===== Bridge เพื่อให้โค้ดที่อ้างถึง SUPABASE_URL/KEY ตรง ๆ ยังทำงานได้ =====
window.SUPABASE_URL = window.CONFIG.SUPABASE_URL;
window.SUPABASE_ANON_KEY = window.CONFIG.SUPABASE_ANON_KEY;
