// 🔧 ใส่ค่าโปรเจกต์คุณก่อน deploy
window.CONFIG = {
  // จาก Supabase > Project Settings > API
  SUPABASE_URL: 'https://nbxuzdrutlvavirpzpjt.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ieHV6ZHJ1dGx2YXZpcnB6cGp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzODUzMDYsImV4cCI6MjA3Mzk2MTMwNn0.tD4noFRKDFcA9x-A5udQSjkhKuXbccPdohdFjd8Fyo4',

  // โดเมนโปรเจกต์ backend (เช่น https://sleep-backend.vercel.app)
  // ถ้า backend กับ frontend โดเมนเดียวกัน ให้ใส่ '' แล้ว api.js จะเรียก /api/ingest
  BACKEND_URL: 'https://stat-sleepy-backend.vercel.app'
};
