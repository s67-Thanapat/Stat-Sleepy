import { createClient } from '@supabase/supabase-js';

const url  = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL is missing (.env.local)');
if (!key) throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is missing (.env.local)');

export const supabase = createClient(url, key, {
  auth: { persistSession: true, autoRefreshToken: true }
});
