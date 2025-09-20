'use client';
import { supabase } from '@/lib/supabaseClient';
import { useState } from 'react';

export default function SignInPage() {
  const [email, setEmail] = useState('');

  async function signIn() {
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) alert(error.message);
    else alert('ส่งลิงก์เข้าสู่ระบบไปที่อีเมลแล้ว');
  }

  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-bold">เข้าสู่ระบบ</h1>
      <input
        className="border p-2 rounded w-full"
        placeholder="you@example.com"
        value={email}
        onChange={(e)=>setEmail(e.target.value)}
      />
      <button onClick={signIn} className="px-4 py-2 rounded bg-black text-white">
        รับลิงก์ทางอีเมล
      </button>
    </div>
  );
}
