// ต้องมี supabase client จาก config.js (เช่น window.supabase)
if (!window.supabase) {
  console.warn("Supabase client not found. Make sure @supabase/supabase-js and config.js are loaded.");
}

(function () {
  const userSpan  = document.getElementById('authUser');
  const btnLogin  = document.getElementById('btnLogin');
  const btnLogout = document.getElementById('btnLogout');

  function updateAuthUI(user) {
    if (!userSpan || !btnLogin || !btnLogout) return;
    if (user) {
      userSpan.textContent = `เข้าสู่ระบบ: ${user.email || 'ผู้ใช้'}`;
      btnLogin.style.display  = 'none';
      btnLogout.style.display = '';
    } else {
      userSpan.textContent = 'ยังไม่ได้เข้าสู่ระบบ';
      btnLogin.style.display  = '';
      btnLogout.style.display = 'none';
    }
  }

  // ไปหน้า login พร้อม next=admin.html
  btnLogin?.addEventListener('click', () => {
    const next = 'admin.html';
    window.location.href = `./login.html?next=${encodeURIComponent(next)}`;
  });

  // ออกจากระบบ
  btnLogout?.addEventListener('click', async () => {
    try {
      await supabase.auth.signOut();
      updateAuthUI(null);
    } catch (e) {
      alert('ออกจากระบบไม่สำเร็จ: ' + (e?.message || e));
    }
  });

  // โหลดสถานะเริ่มต้น
  (async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      updateAuthUI(user);
    } catch {
      updateAuthUI(null);
    }
  })();

  // เปลี่ยนสถานะแบบเรียลไทม์
  supabase.auth.onAuthStateChange((_event, session) => {
    updateAuthUI(session?.user || null);
  });

  // สำหรับหน้าที่ต้องล็อกอินถึงจะเข้าได้ (เช่น admin.html)
  window.requireAuth = async function (redirectBack = true) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      const next = redirectBack ? (location.pathname.split('/').pop() || 'admin.html') : 'admin.html';
      location.href = `./login.html?next=${encodeURIComponent(next)}`;
      return false;
    }
    return true;
  };
})();
